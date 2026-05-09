# Platform Integration Alignment Report (vs. CIVMEN_REPORT.md)

This report aligns the findings of the **CIVMEN Deep Audit** with official documentation from our core platform partners (Dynamic Labs, Helius, Kamino Finance, and PajRamp).

## 1. DYNAMIC LABS (Identity & Wallet Infrastructure)
*   **Audit Finding:** High confidence in authentication.
*   **Documentation Alignment:** Dynamic's architecture utilizes TEEs and secure enclaves for key management, which aligns with our "Zero-Knowledge" approach.
*   **Recommended Hardening (GAP):**
    *   **Action-Based MFA:** Documentation recommends enabling MFA specifically for transaction signing (Action-Based MFA) in the Dynamic Dashboard.
    *   **Simulation:** Use Dynamic's `simulateSolanaTransaction` to provide clear "Loss/Gain" context to users before they sign withdrawal transactions.

## 2. HELIUS (On-Chain Observability & Webhooks)
*   **Audit Finding:** Inbound webhook logic is strong, but ledger synchronization is a risk.
*   **Documentation Alignment:** Helius docs mandate using the transaction **signature** as a unique idempotency key in the database to prevent duplicate processing from network retries.
*   **Remediation Path:** Our current timing-safe HMAC validation is correct. However, we must ensure that the `db('tips')` insert is wrapped in a transaction that prevents parallel updates to the same user balance.

## 3. KAMINO FINANCE (Yield & Klend-SDK)
*   **Audit Finding:** Yield logic is functional but requires better oracle protection.
*   **Documentation Alignment:** Kamino relies on the **Scope Oracle**. Integration docs emphasize calling `market.refreshAll()` before building transactions to ensure interest rates and price feeds are not stale.
*   **Implementation Note:** We should verify that `useKamino.js` and `api/_lib/kamino.ts` are refreshing market state before executing deposits.

## 4. PAJRUMP / PAJCASH (Fiat Payouts)
*   **Audit Finding: CRITICAL (NO-GO)** - Withdrawal Double-Spend Risk.
*   **Documentation Alignment:** Official API guidance for Pajcash **requires** the `Idempotency-Key` header (UUID v4) to prevent duplicate transactions during network retries.
*   **CRITICAL FIX REQUIRED:**
    *   The `api/_handlers/payouts/withdraw.ts` handler currently lacks this header.
    *   The platform must generate a `payout_intent_id` and pass it as the `Idempotency-Key` to Pajcash.

## 5. FOSSAPAY (Fiat Infrastructure)
*   **Audit Finding:** Payout state machine is fragile.
*   **Remediation Path:** Documentation suggests a "Two-Phase Commit" approach. We must implement a reconciliation cron job to query the FossaPay status for any payout stuck in the `submitted` state for >5 minutes.

---

# FINAL ALIGNMENT VERDICT

The **NO-GO** verdict in `CIVMEN_REPORT.md` is **CONFIRMED** and further validated by platform documentation. The following "Alignment Fixes" are mandatory before live payments:

1.  **Transactional Integrity:** Wrap `withdraw.ts` in a `db.transaction()`.
2.  **External Idempotency:** Implement `Idempotency-Key` header for Pajcash.
3.  **Oracle Freshness:** Add `market.refreshAll()` to Kamino interactions.
4.  **MFA Hardening:** Enable Dynamic Action-Based MFA in production.

**Would you like me to begin implementing these alignment fixes now?** I am ready to start with the transactional logic for `withdraw.ts`.