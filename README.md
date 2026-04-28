# TipLnk: Unified Web3 Payment Infrastructure ⚡️

**The premier non-custodial tipping and monetization protocol for the Solana ecosystem.**

---

## Overview

TipLnk is a production-grade, decentralized tipping infrastructure designed to seamlessly bridge the gap between Web2 onboarding and Web3 execution. We empower creators, developers, and platforms to monetize their audiences instantly, without intermediaries, custody risks, or complex wallet setups.

Whether your users are crypto-native degens with hardware wallets or mainstream fans with only an email address, TipLnk provides a unified, frictionless checkout experience. By abstracting away the complexities of blockchain transactions, TipLnk solves the fragmentation of Web3 payments and brings instant, borderless monetization to any website or social feed.

---

## Key Features

- **Non-Custodial Tipping (Powered by Jupiter):** All transactions are routed directly from the supporter's wallet to the creator's wallet. TipLnk never holds your funds.
- **Hybrid Payments (Crypto + Fiat):** Accept native SOL, SPL tokens (like USDC), or fiat via seamless onramp integrations.
- **Frictionless Auth (Powered by Dynamic.xyz):** Support for external wallets (Phantom, Solflare) and embedded MPC wallets via Email or Social login.
- **Torque Growth Engine:** Enterprise-grade event tracking and growth analytics to monitor user acquisition, conversion rates, and ecosystem velocity.
- **Embedded Iframe SDK:** A highly secure, isolated widget that allows any third-party website to embed TipLnk checkout with a single line of code.
- **Solana Blinks Integration:** Tip creators directly from supported social media feeds (like X/Twitter) using the `@solana/actions` standard.
- **Real-Time Verification:** Immutable ledger powered by Helius webhooks ensures 100% data integrity and prevents fake tipping events.

---

## Architecture Overview

TipLnk is built on a hardened, event-driven architecture that prioritizes security and speed.

**User Flow:**  
`User` → `Dynamic Auth (Identity)` → `Jupiter Intent Engine (Execution)` → `Solana Blockchain (Settlement)` → `Helius Webhook (Source of Truth)` → `(DB)` → `Torque MCP (Growth Tracking)`

1. **Identity Layer:** Dynamic handles wallet provisioning and JWT issuance.
2. **Intent Engine:** TipLnk backend generates a secure `PaymentIntent` via Jupiter V6, injecting necessary platform fees.
3. **Execution:** The client (embedded or external) signs the Base64 transaction.
4. **Settlement & Verification:** The transaction settles on-chain. Helius webhooks parse the transaction, verify the destination and amount, and update the TipLnk ledger.
5. **Growth Pipeline:** The verified `tip_completed` event is pushed to Torque MCP for real-time analytics.

---

## Integrations

TipLnk orchestrates the best-in-class tools across the Solana and Web3 ecosystem:

- **Dynamic.xyz:** Identity resolution, wallet abstraction, and embedded MPC wallet provisioning.
- **Torque MCP:** Growth tracking, event sourcing, and user acquisition analytics.
- **Jupiter:** The core execution engine for non-custodial swaps, token routing, and fee extraction.
- **Helius:** Enterprise-grade RPCs and Webhooks serving as the absolute source of truth for on-chain events.
- **Fossa Pay / Dynamic Funding:** Integrated fiat onramps to allow credit card and bank transfer payments.
- **Fossa Pay / Dynamic Funding:** Integrated fiat onramps to allow credit card and bank transfer payments.