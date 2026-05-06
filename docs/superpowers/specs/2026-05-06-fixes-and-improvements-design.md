# Design Spec: Fixes for Compilation Errors, Routing, and Deprecation Warnings

**Date:** 2026-05-06
**Topic:** Fixing critical API compilation errors, SPA routing issues on Vercel, and investigating Node.js deprecation warnings.

## 1. Problem Statement
The project currently faces several issues:
1.  **TypeScript Compilation Errors**: Missing variables in `api/_handlers/solana/jupiter/swap.ts`, incorrect method signatures in `api/_lib/kamino.ts`, and type mismatches in `api/_lib/transaction-validator.ts`.
2.  **Routing Errors (404)**: Navigating to a route and reloading results in a Vercel 404 error because the server doesn't know to serve `index.html` for those routes.
3.  **Deprecation Warning**: Node.js warns about the use of `url.parse()`, which is deprecated and has security implications.

## 2. Proposed Changes

### 2.1. API Compilation Fixes
-   **`api/_handlers/solana/jupiter/swap.ts`**:
    -   Destructure `feeBps` from `req.body` with a default of 500.
    -   Define `TREASURY_WALLET` using `process.env.VITE_TREASURY_WALLET`.
-   **`api/_lib/transaction-validator.ts`**:
    -   Convert the legacy `Transaction` object to a `VersionedTransaction` before calling `connection.simulateTransaction`.
    -   This allows the use of the `SimulateTransactionConfig` object which is required for the `accounts` tracking feature.
-   **`api/_lib/kamino.ts`**:
    -   Update `KaminoMarket.load` to include the required `recentSlotDurationMs` argument (defaulting to 400).
    -   Update `KaminoAction.buildDepositTxns` signature to match the latest SDK version.
    -   Map token symbols (e.g., "USDC", "SOL") to their respective mint addresses.
    -   Use type casting (`as any`) where necessary to bridge the gap between the legacy `@solana/web3.js` and the modern types expected by the Kamino SDK.

### 2.2. Vercel Routing Fixes
-   **`vercel.json`**:
    -   Refine the `rewrites` rules.
    -   Use a catch-all rule `"/((?!api/|.*\\.).*)"` to redirect all non-API and non-asset requests to `/index.html`.
    -   Ensure existing API routes and static assets are still served correctly.

### 2.3. Deprecation Warning Investigation
-   A thorough search of the codebase confirms that `url.parse()` is not used directly in the project's source files.
-   The warning likely originates from a third-party dependency (e.g., `openid-client`) or the Vercel runtime environment.
-   Recommendation: Monitor for library updates but no direct changes to the source code are needed as `new URL()` is already being used throughout the project.

## 3. Verification Plan

### 3.1. Compilation
-   Run `npx tsc -p api/tsconfig.json --noEmit` to ensure all API errors are resolved.
-   Run `npm run build` to ensure the frontend still builds correctly.

### 3.2. Routing
-   Deploy to a preview environment or test locally with `vercel dev`.
-   Navigate to a sub-page (e.g., `/dashboard`) and refresh the browser.
-   Verify that the page reloads correctly instead of showing a 404.

### 3.3. Swap Functionality
-   Test the `/api/solana/jupiter/swap` endpoint with valid parameters to ensure the transaction is generated correctly with platform fees.
