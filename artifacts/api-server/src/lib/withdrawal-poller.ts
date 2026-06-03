import { db, withdrawalsTable, merchantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { checkPixpayStatus } from "./pixpay";
import { logger } from "./logger";

const POLL_INTERVAL_MS = 2000;
// After this age with no resolution, stop active polling and alert admin.
// We intentionally do NOT auto-fail stuck withdrawals because the money may
// have already been physically sent to the recipient's phone — auto-failing
// would incorrectly refund the merchant balance while the money is gone.
const STUCK_EXPIRY_MS = 60 * 60 * 1000; // 60 minutes

function isSuccessState(state: string): boolean {
  const s = state.toUpperCase().trim();
  return ["SUCCESS", "SUCCESSFULL", "SUCCESSFUL", "COMPLETED", "COMPLETE", "PAID", "DONE", "APPROVED"].includes(s);
}

function isFailedState(state: string): boolean {
  const s = state.toUpperCase().trim();
  return ["FAILED", "REJECTED", "CANCELLED", "FAILURE", "TIMEOUT", "EXPIRED", "ERROR", "DECLINED"].includes(s);
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

    if (ageMs >= STUCK_EXPIRY_MS) {
      // 60 min with no resolution — check PixPay one final time.
      // If success → mark paid. If not → log for admin review but DO NOT auto-fail
      // and DO NOT refund, because the money was most likely already sent.
      try {
        const result = await checkPixpayStatus(withdrawal.transactionId);
        const finalState = result?.data?.state ?? "";

        if (isSuccessState(finalState)) {
          await db
            .update(withdrawalsTable)
            .set({ status: "paid" })
            .where(eq(withdrawalsTable.id, withdrawal.id));
          logger.info({ withdrawalId: withdrawal.id, finalState }, "Withdrawal poller(stuck): withdrawal confirmed paid after 60 min");
        } else {
          // Leave in "processing" — admin must manually resolve.
          // We do NOT refund because the cashin was initiated and money likely arrived.
          logger.error(
            { withdrawalId: withdrawal.id, finalState, ageMs },
            "Withdrawal poller: withdrawal stuck 60+ min with unresolved state — ADMIN REVIEW REQUIRED. " +
            "NOT auto-failing to avoid incorrect balance refund. Check PixPay dashboard manually."
          );
        }
      } catch (err: any) {
        logger.error(
          { withdrawalId: withdrawal.id, err: err?.message },
          "Withdrawal poller: stuck withdrawal — could not reach PixPay. ADMIN REVIEW REQUIRED."
        );
      }
      continue;
    }

    // Active polling: only mark paid on confirmed success.
    // Do NOT auto-fail on FAILED state — PixPay may return FAILED transiently
    // while the cashin is still processing. Rely on IPN for failure confirmation.
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
      } else if (isFailedState(state)) {
        // Log but do NOT auto-fail. The IPN handler (payments.ts) will mark as failed
        // if PixPay sends an IPN with FAILED state. If IPN doesn't arrive,
        // admin must review manually. This prevents incorrect balance refunds
        // when money was physically sent but PixPay reports FAILED erroneously.
        logger.warn(
          { withdrawalId: withdrawal.id, state, ageMs },
          "Withdrawal poller: PixPay returned FAILED state — awaiting IPN confirmation before acting. " +
          "If BASE_URL is not set in production, configure it to receive IPN notifications."
        );
      } else {
        // In-flight (PENDING / PENDING1 / PROCESSING / unknown) — keep waiting
        logger.debug({ withdrawalId: withdrawal.id, state }, "Withdrawal poller: in-flight, waiting");
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
  logger.info("Starting withdrawal cashin poller (every 2s)");
  runCycle().catch(() => {});
  setInterval(() => { runCycle().catch(() => {}); }, POLL_INTERVAL_MS);
}
