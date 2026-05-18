import { db, withdrawalsTable, merchantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { checkPixpayStatus } from "./pixpay";
import { logger } from "./logger";

const POLL_INTERVAL_MS = 5000;
// After this age with no resolution, give up.
const STUCK_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
// How many consecutive FAILED responses before we trust it.
// 6 checks × 5 s = ~30 s of confirmed failures needed.
const MAX_FAIL_COUNT = 6;

// In-memory counters: transactionId → number of consecutive FAILED checks
const failedCounts = new Map<string, number>();

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
    rows = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.status, "processing"));
  } catch {
    return;
  }

  for (const withdrawal of rows) {
    if (!withdrawal.transactionId) continue;

    const ageMs = Date.now() - new Date(withdrawal.createdAt).getTime();
    const isStuck = ageMs >= STUCK_EXPIRY_MS;

    if (isStuck) {
      // 30 min with no resolution — give up
      if (withdrawal.transactionId) failedCounts.delete(withdrawal.transactionId);
      await db.update(withdrawalsTable).set({ status: "failed" }).where(eq(withdrawalsTable.id, withdrawal.id));
      await refundMerchantIfNeeded(withdrawal);
      logger.warn({ withdrawalId: withdrawal.id, ageMs }, "Withdrawal poller: stuck withdrawal auto-failed after 30 min");
      continue;
    }

    try {
      const result = await checkPixpayStatus(withdrawal.transactionId);
      const state: string = result?.data?.state ?? "";

      logger.debug(
        { withdrawalId: withdrawal.id, transactionId: withdrawal.transactionId, state },
        "Withdrawal poller: Pixpay status"
      );

      if (isSuccessState(state)) {
        // Immediate success — reset counter
        failedCounts.delete(withdrawal.transactionId);
        await db.update(withdrawalsTable).set({ status: "paid" }).where(eq(withdrawalsTable.id, withdrawal.id));
        logger.info({ withdrawalId: withdrawal.id, state }, "Withdrawal poller: withdrawal marked paid");

      } else if (isFailedState(state)) {
        // Increment consecutive-failure counter
        const count = (failedCounts.get(withdrawal.transactionId) ?? 0) + 1;
        failedCounts.set(withdrawal.transactionId, count);

        logger.info(
          { withdrawalId: withdrawal.id, state, failCount: count, maxFailCount: MAX_FAIL_COUNT },
          "Withdrawal poller: FAILED state received — waiting for confirmation"
        );

        if (count >= MAX_FAIL_COUNT) {
          // Confirmed failure after MAX_FAIL_COUNT × 5 s ≈ 30 s of consecutive FAILED
          failedCounts.delete(withdrawal.transactionId);
          await db.update(withdrawalsTable).set({ status: "failed" }).where(eq(withdrawalsTable.id, withdrawal.id));
          await refundMerchantIfNeeded(withdrawal);
          logger.info({ withdrawalId: withdrawal.id, state }, "Withdrawal poller: withdrawal marked failed after consecutive checks");
        }
      } else {
        // In-flight (PENDING / PROCESSING / unknown) — reset failure streak
        failedCounts.delete(withdrawal.transactionId);
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
