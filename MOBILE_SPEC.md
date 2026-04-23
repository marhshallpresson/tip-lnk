# TipLnk Mobile API Bridge Specification (v1.0)
**Status**: Draft | **Architecture**: Modular / MWA-Optimized

## 1. Authentication Flow (Native SIWS)
The mobile app will use the **Mobile Wallet Adapter (MWA)** to sign a standard SIWS message.

### Endpoint: `POST /api/auth/wallet-login` (Existing)
*   **Message Template**: 
    ```text
    Welcome to TipLnk Mobile!
    Sign this message to secure your mobile session.
    Wallet: {address}
    Timestamp: {timestamp}
    Platform: Mobile-Expo
    ```
*   **Verification**: Backend validates signature using `nacl` (hardened in previous step).

## 2. Transaction Pipeline (Pre-flight & MWA)
Mobile clients require serialized transactions ready for the `transact` call in MWA.

### Endpoint: `POST /api/solana/tx/prepare-tip` (NEW)
*   **Input**: `sender`, `recipient`, `amountUSDC`, `tokenMint`.
*   **Logic**:
    1.  Fetch real-time `PriorityFee` via Quicknode (Elite Integration).
    2.  Build the Anchor instruction for `tiplnk.send_token_tip`.
    3.  Serialize to Base64.
*   **Output**: `{ serializedTx: string, lastValidBlockHeight: number }`.

## 3. Deep Linking & Routing
The app will register the `tiplnk://` and `https://tiplnk.me/` schemes.

*   **Tipping**: `tiplnk://tip/{username}` -> Opens TipWidget in-app.
*   **Onboarding**: `tiplnk://onboarding/claim?handle={name}` -> Routes directly to SNS check.

## 4. Mobile Security Hardening
*   **CSRF Bypass**: Mobile requests will bypass `x-csrf-token` by including an `X-App-ID: tiplnk-native` header verified against a secret HMAC in production.
*   **Caching**: Enforce `Cache-Control: public, max-age=60` for all asset and profile lookups to minimize mobile data usage.

## 5. Implementation Roadmap (Mobile)
1.  **Scaffolding**: Expo + `@solana-mobile/mobile-wallet-adapter-protocol`.
2.  **Auth Service**: SecureStore-backed JWT management.
3.  **MWA Connector**: Standardizing the `transact` loop for signing.
4.  **UI/UX**: Porting "Grass Style" CSS to React Native `StyleSheet` or `Tailwind-RN`.
