---
name: AshTech payment confirmation
description: Distinguishes mobile payment notifications from verified transaction status.
---

A mobile notification received during payment initiation may arrive before the payment is confirmed. Do not treat the notification itself as proof of settlement; keep the order unconfirmed until the server verifies the transaction status.

**Why:** the user observed a mobile notification during a test payment that did not confirm the transaction.

**How to apply:** use server-verified AshTech status for order completion, payment success messages, merchant credit, and revenue reporting.