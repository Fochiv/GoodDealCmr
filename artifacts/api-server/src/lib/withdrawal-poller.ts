import { db, withdrawalsTable, merchantsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { checkPixpayStatus } from "./pixpay";
import { logger } from "./logger";

const POLL_INTERVAL_MS = 5000;
const STUCK_EXPIRY_MS = 30 * 60 * 1000;

function isSuccessState(state: string): boolean {
  return ["SUCCESS", "SUCCESSFULL", "SUCCESSFUL"].includes(state.toUpperCase());
}

function isFailedState(state: string): boolean {
  return ["FAILED", "REJECTED", "CANCELLED", "FAILURE", "TIMEOUT"].includes(state.toUpperCase());
}

async function refundMerchantIfNeeded(withdrawal: typeof withdrawalsTable.$inferSelect) {
  if (!withdrawal.isAdmin && withdrawal.merchantId) {
    const [merchant] = await db
      .select()
      .from(merchantsTable)
      .where(eq(merchantsTable.id, withdrawal.merchantId))
      .limit(1);
    if (merchant) {
      await db
        .update(merchantsTable)
        .set({ balance: merchant.balance + withdrawal.amount })
        .where(eq(merchantsTable.id, merchant.id));
      logger.info({ merchantId: merchant.id, amount: withdrawal.amount }, "Withdrawal poller: merchant balance refunded");
    }
  }
}

async function checkProcessingWithdrawals() {
  let rows: typeof withdrawalsTable.$inferSelect[] = [];
  try {
    rows = await db
      .select()
      .from(withdrawalsTable)
      .where(eq(withdrawalsTable.status, "processing"));
  } catch {
    return;
  }

  for (const withdrawal of rows) {
    if (!withdrawal.transactionId) continue;

    const ageMs = Date.now() - new Date(withdrawal.createdAt).getTime();
    const isStuck = ageMs >= STUCK_EXPIRY_MS;

    try {
      const result = await checkPixpayStatus(withdrawal.transactionId);
      const state: string = result?.data?.state ?? "";

      logger.debug(
        { withdrawalId: withdrawal.id, transactionId: withdrawal.transactionId, state },
        "Withdrawal poller: Pixpay status"
      );

      if (isSuccessState(state)) {
        await db
          .update(withdrawalsTable)
          .set({ status: "paid" })
          .where(eq(withdrawalsTable.id, withdrawal.id));
        logger.info({ withdrawalId: withdrawal.id, state }, "Withdrawal poller: withdrawal marked paid");
      } else if (isFailedState(state) || isStuck) {
        await db
          .update(withdrawalsTable)
          .set({ status: "failed" })
          .where(eq(withdrawalsTable.id, withdrawal.id));
        await refundMerchantIfNeeded(withdrawal);
        logger.info({ withdrawalId: withdrawal.id, state, isStuck }, "Withdrawal poller: withdrawal failed, merchant refunded if applicable");
      }
    } catch (err: any) {
      logger.warn({ withdrawalId: withdrawal.id, err: err?.message }, "Withdrawal poller: error checking Pixpay status");
    }
  }
}

async function runCycle() {
  await checkProcessingWithdrawals();
}

export function startWithdrawalPoller() {
  logger.info("Starting withdrawal cashin poller (every 5s)");
  runCycle().catch(() => {});
  setInterval(() => { runCycle().catch(() => {}); }, POLL_INTERVAL_MS);
}
