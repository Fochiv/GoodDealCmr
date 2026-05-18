import { db, withdrawalsTable, merchantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { checkPixpayStatus } from "./pixpay";
import { logger } from "./logger";

const POLL_INTERVAL_MS = 5000;

// How long to wait before trusting a "failed" status from Pixpay.
// Cashins (money sent to mobile) can show FAILED on the status API briefly
// even though the delivery succeeded — the IPN is the authoritative result.
const FAIL_GRACE_MS = 10 * 60 * 1000; // 10 minutes

// After this age, give up and mark as failed regardless.
const STUCK_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

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
    const pastGracePeriod = ageMs >= FAIL_GRACE_MS;

    try {
      const result = await checkPixpayStatus(withdrawal.transactionId);
      const state: string = result?.data?.state ?? "";

      logger.debug(
        { withdrawalId: withdrawal.id, transactionId: withdrawal.transactionId, state, ageMs },
        "Withdrawal poller: Pixpay status"
      );

      if (isSuccessState(state)) {
        // Only update if still processing — never downgrade from "paid"
        await db
          .update(withdrawalsTable)
          .set({ status: "paid" })
          .where(eq(withdrawalsTable.id, withdrawal.id));
        logger.info({ withdrawalId: withdrawal.id, state }, "Withdrawal poller: withdrawal marked paid");
      } else if (isStuck) {
        // Transaction stuck for 30+ minutes with no IPN and no success — give up
        await db
          .update(withdrawalsTable)
          .set({ status: "failed" })
          .where(eq(withdrawalsTable.id, withdrawal.id));
        await refundMerchantIfNeeded(withdrawal);
        logger.warn({ withdrawalId: withdrawal.id, ageMs }, "Withdrawal poller: withdrawal stuck, marked failed and refunded");
      } else if (isFailedState(state) && pastGracePeriod) {
        // Only trust a "failed" status from Pixpay after the grace period.
        // Before 10 min, the IPN may still arrive with the real SUCCESS result.
        await db
          .update(withdrawalsTable)
          .set({ status: "failed" })
          .where(eq(withdrawalsTable.id, withdrawal.id));
        await refundMerchantIfNeeded(withdrawal);
        logger.info({ withdrawalId: withdrawal.id, state, ageMs }, "Withdrawal poller: withdrawal failed after grace period, refunded");
      } else if (isFailedState(state)) {
        logger.info(
          { withdrawalId: withdrawal.id, state, ageMs, gracePeriodMs: FAIL_GRACE_MS },
          "Withdrawal poller: Pixpay reports failed but still within grace period — waiting for IPN"
        );
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
