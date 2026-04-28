# TipLnk Unified Payment Infrastructure Architecture (Powered by Dynamic.xyz)

## 1. Full Architecture Diagram (Text-Based)

```text
===================================================================================================
                                      HOST WEBSITE (Third-Party)
===================================================================================================
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │    <script src="tiplnk.com/embed.js">         │
                      │    <div data-tiplnk="creator_123">            │
                      └───────────────────────┬───────────────────────┘
                                              │ postMessage (Intent & Status)
===================================================================================================
                                      TIP LNK WIDGET (iframe)
===================================================================================================
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │             DYNAMIC.XYZ SDK LAYER             │
                      │ ├─ External Wallet (Phantom/Solflare)         │
                      │ ├─ Embedded Wallet (Email/Social MPC)         │
                      │ └─ Fiat Onramp / Exchange Funding             │
                      └───────────────────────┬───────────────────────┘
                                              │ JWT Auth & Wallet Provisioning
===================================================================================================
                                      TIP LNK BACKEND (Vercel)
===================================================================================================
                                              │
           ┌──────────────────────────────────┼──────────────────────────────────┐
           │                                  │                                  │
┌──────────▼──────────┐           ┌───────────▼───────────┐          ┌───────────▼───────────┐
│ DYNAMIC AUTH GUARD  │           │ PAYMENT INTENT ENGINE │          │   WEBHOOK PROCESSOR   │
│ Validates JWT /     │           │ Generates Quote via   │          │ Listens for On-Chain  │
│ Resolves Identity   │           │ Jupiter V6 API        │          │ Events (Helius)       │
└──────────┬──────────┘           └───────────┬───────────┘          └───────────┬───────────┘
           │                                  │                                  │
           └──────────────────────────────────┼──────────────────────────────────┘
                                              │
===================================================================================================
                                      SOLANA NETWORK
===================================================================================================
                                              │
                              ┌───────────────▼───────────────┐
                              │ JUPITER V6 ROUTING PROGRAM    │
                              │ ├─ Swaps Token to SOL/USDC    │
                              │ ├─ Fee Extraction (TipLnk)    │
                              │ └─ Settles to Creator Wallet  │
                              └───────────────────────────────┘
```

---

## 2. API Contract for Dynamic Integration

Dynamic.xyz will act purely as an **Identity, Provisioning, and Authentication** layer. Execution remains entirely non-custodial via TipLnk's backend and Jupiter.

### A. Authentication & Identity Linking
When a user connects via Dynamic (Email, Phantom, or Social), Dynamic issues a secure JWT. TipLnk uses this JWT to resolve and link the user's identity.

```typescript
// POST /api/auth/dynamic/verify
interface VerifyDynamicSessionRequest {
  dynamicJwt: string; // The token returned by dynamic SDK
}

interface VerifyDynamicSessionResponse {
  success: boolean;
  user: {
    id: string; // TipLnk User ID
    dynamic_user_id: string;
    wallets: Array<{
      address: string;
      type: 'embedded' | 'external' | 'exchange';
      provider: string; // e.g., 'phantom', 'turnkey' (embedded)
      isPrimary: boolean;
    }>;
    email?: string;
  };
  sessionToken: string; // TipLnk internal session
}
```

### B. Payment Intent Lifecycle
Before any transaction hits Jupiter, a `PaymentIntent` is established to abstract the payment method (Fiat, Embedded Crypto, External Crypto).

```typescript
// POST /api/payments/intent
interface CreatePaymentIntentRequest {
  creatorId: string;
  amount: number;
  inputTokenSymbol: string; // e.g., 'USDC', 'SOL', 'FIAT_USD'
  paymentMethod: 'external_wallet' | 'embedded_wallet' | 'fiat_onramp';
  sourceWalletAddress?: string; // If crypto
}

interface CreatePaymentIntentResponse {
  intentId: string;
  status: 'requires_action' | 'processing' | 'completed';
  quote?: any; // Jupiter V6 QuoteResponse (if crypto)
  transaction?: string; // Base64 encoded unsigned transaction (if crypto)
  fiatOnrampUrl?: string; // If 'fiat_onramp' selected
}
```

---

## 3. iframe Embed System Spec

The embed system is completely rebuilt to eliminate direct wallet-adapter dependencies on the host site. The host site only needs a script tag; all Web3 complexity is isolated in the iframe.

### The Host Script (`embed.js`)
- **Injection:** Injects a stylized button based on `data-*` attributes.
- **Modal Rendering:** On click, mounts a fixed-position `<div>` acting as a backdrop, containing the `<iframe>` pointing to `https://tiplnk.me/checkout/:creator_id`.
- **Message Bridge:** Listens for `window.postMessage` to handle modal closure.

### The Secure iframe (`/checkout/:creator_id`)
- **Isolation:** Runs entirely on `tiplnk.me` origin.
- **Sandbox:** `<iframe sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox">`. This is *critical* for Dynamic.xyz's external wallet connectors (Phantom, Solflare) which require popup window access.
- **Dynamic SDK Instance:** The iframe hosts the `<DynamicContextProvider>`. The host website requires *zero* Web3 dependencies.

### Communication Protocol
```javascript
// From Iframe -> Host
window.parent.postMessage({
  type: 'TIPLNK_EVENT',
  action: 'PAYMENT_SUCCESS', // or 'PAYMENT_CANCELLED', 'MODAL_CLOSE'
  payload: { intentId: "...", amount: 5, currency: "USDC" }
}, '*'); 
// (Note: In production, the target origin should be validated against a strict allowed-list if configured by the creator).
```

---

## 4. Security Model Breakdown

### A. Non-Custodial Execution Enforcement
- **Jupiter V6 ExactOut/ExactIn:** The backend constructs the transaction using Jupiter API.
- **Strict Destination Checks:** The backend validates that the final `destinationWallet` in the transaction instructions exactly matches the `creator.walletAddress`. 
- **No Backend Signing:** For embedded and external wallets, the unsigned Base64 transaction is returned to the client. The Dynamic SDK (via Turnkey for embedded, or Wallet Standard for external) signs the transaction on the client side. The backend *never* possesses user private keys.

### B. Cross-Origin Security
- **Content Security Policy (CSP):** The iframe route utilizes `frame-ancestors *` (or a specific list configured by the creator in their dashboard) to allow embedding, but strictly limits `connect-src` to TipLnk API, Dynamic API, RPC nodes, and Jupiter API.
- **Replay Prevention:** Every `PaymentIntent` generates a unique, single-use recent blockhash.
- **Idempotency:** Helius webhook processing requires the `signature` to be the primary key in the `tips` table, preventing double-counting of the same transaction.

### C. JWT & Session Hardening
- Dynamic JWTs are verified using Dynamic's public key (JWKS) on the TipLnk backend before issuing a TipLnk session.
- Embedded wallet scopes are strictly limited to the TipLnk dApp origin.

---

## 5. Migration Plan (Wallet-Only to Hybrid System)

### Phase 1: Dynamic Shadow Integration (Week 1-2)
- **Goal:** Install Dynamic SDK alongside the existing Solana Wallet Adapter.
- **Action:** Introduce Dynamic for *Email/Social Onboarding only*. Existing crypto users continue using standard Wallet Adapter.
- **Database:** Run schema migration to add `dynamic_user_id` and the `oauth_*` tables.
- **Verification:** Ensure existing creators can link their Dynamic identity without losing access to their primary Phantom/Solflare payout addresses.

### Phase 2: Unified Intent Engine (Week 3-4)
- **Goal:** Abstract the `useTipping` hook into the `PaymentIntent` API.
- **Action:** Instead of building the Jupiter transaction entirely on the client, shift transaction construction to the server via `/api/payments/intent`.
- **Verification:** Client simply requests a quote, server returns the Base64 transaction, client (Wallet Adapter or Dynamic Embedded) signs and sends.

### Phase 3: Widget Refactor & Fiat Onramp (Week 5)
- **Goal:** Replace the checkout UI with the unified Dynamic payment selector.
- **Action:** Implement the new iframe embed script. Swap the custom wallet-selector in `TipWidget.jsx` with Dynamic's `<DynamicWidget />` configured for "Funding Mode" (allowing fiat onramps via Banxa/MoonPay integrated into Dynamic).
- **Verification:** Test end-to-end flow from Host Site -> Iframe -> Dynamic Auth -> Fiat Onramp -> Jupiter Swap -> Helius Webhook.

### Phase 4: Deprecation of Legacy Adapter (Week 6)
- **Goal:** Fully switch to Dynamic as the sole identity and wallet connection provider.
- **Action:** Remove `@solana/wallet-adapter-react`. Dynamic natively handles Phantom, Solflare, and Backpack connections out of the box, making the standard adapter redundant and reducing bundle size.
- **Final Security Audit:** Ensure all CSPs, iframe sandboxes, and backend JWT validations are locked down.