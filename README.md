# TipStack: The fastest way to monetize your craft on Solana.⚡️

**The premier non-custodial tipping and monetization protocol for the Solana ecosystem.**

---

## Overview

TipStack is a decentralized tipping infrastructure designed to seamlessly bridge the gap between Web2 onboarding and Web3 execution. We empower creators, developers, and platforms to monetize their audiences instantly, without intermediaries, custody risks, or complex wallet setups.

Whether your users are crypto-native degens with hardware wallets or mainstream fans with only an email address, TipStack provides a unified, frictionless checkout experience. By abstracting away the complexities of blockchain transactions, TipStack solves the fragmentation of Web3 payments and brings instant, borderless monetization to any website or social feed.

---

## Key Features

- **Non-Custodial Tipping (Powered by Jupiter):** All transactions are routed directly from the supporter's wallet to the creator's wallet. TipStack never holds your funds.
- **Hybrid Payments (Crypto + Fiat):** Accept native SOL, SPL tokens (like USDC), or fiat via **Fossa Pay** (Credit Card / Bank).
- **Frictionless Auth (Powered by Dynamic.xyz):** Support for external wallets (Phantom, Solflare, Jupiter, Backpack) and embedded MPC wallets via Email or Social login.
- **Instant Mobile Pay (Deep Linking SOlflare & Phantom):** One-click payment via native mobile wallets using the Solana Pay Transaction Request standard.
- **Torque Growth Engine:** Enterprise-grade event tracking to monitor user acquisition and conversion velocity in real-time.
- **Embedded Iframe SDK:** A secure, isolated widget that allows any third-party website to embed TipStack checkout with a single line of code.
- **Real-Time Verification (RPC):** Immutable ledger powered by **Helius** webhooks ensures 100% data integrity.

---

## User Flows

### 🧑‍🎨 For Creators (The Receiver)
1. **Onboard:** Connect via **Dynamic** using an existing wallet or just an email (MPC wallet provisioned instantly).
2. **Distribute:** Share your TipStack profile or embed the **TipStack Widget** on your site.
3. **Monetize:** Receive crypto directly into your self-custody wallet from any supporter.
4. **Offramp:** Convert earnings to local currency (e.g., NGN via **Pajcash**) instantly from the dashboard.

### 💸 For Supporters (The Tipper)
1. **Choose Amount:** Enter a USD value and an optional message.
2. **Select Rail:**
   - **Crypto Rail:** Pay with any token in your wallet (auto-swapped via Jupiter).
   - **Fiat Rail (NGN):** Pay with Credit Card or Bank Transfer via **Fossa Pay**.
3. **Execute:** Sign the transaction. On mobile, use **"Instant Pay"** to launch directly into your native wallet app.
4. **Confirm:** View the real-time settlement status as the Helius webhook confirms the transaction on-chain.

---

## 📱 Wallet Deep Linking (Instant Pay)

TipStack implements a cutting-edge mobile experience. Using the **Solana Pay Transaction Request** standard, we eliminate the need for supporters to manually browse to TipStack inside their wallet's in-app browser.

- **One-Click Native Execution:** Clicking "Instant Pay with Wallet" on a mobile device natively invokes **Phantom**, **Solflare**, **Jupiter**, or **Backpack**.
- **Pre-Built Transactions:** The transaction is constructed on the TipStack backend and sent directly to the wallet for signing, ensuring the correct recipient, amount, and token are locked in before the user even opens the app.
- **High Conversion:** Reduces the mobile tipping flow from 5+ steps to just 2 taps.

---

## Integrations

TipStack orchestrates an enterprise-grade stack for maximum reliability:

- **Dynamic.xyz:** Identity resolution and embedded MPC wallet abstraction.
- **Jupiter V6:** The core execution engine for non-custodial swaps and fee extraction.
- **Fossa Pay:** Primary fiat-to-crypto onramp and unified fiat payment gateway.
- **Helius/Quicknode:** The absolute source of truth for on-chain events and high-speed transaction relay.
- **Torque MCP:** Real-time growth tracking and user lifecycle analytics.
- **Pajcash:** Specialized instant offramping to Nigerian Bank accounts (NGN).

---

## Embedded Tip Widget

Integrate TipStack into your platform in seconds. Our embedded widget handles all the Web3 complexity inside a secure, sandboxed iframe.

```html
<!-- 1. Include the TipStack Widget Script -->
<script src="https://tipstack.fun/widget.js"></script>

<!-- 2. Place the button wherever you want -->
<div 
  data-tipstack-id="YOUR_WALLET_ADDRESS_OR_HANDLE" 
  data-tipstack-theme="dark" 
  data-tipstack-color="#00D265">
</div>
```

---

## 🎯 Project Analysis

### Core Mission & Goals

**Primary Goals**
- Enable Creator Monetization - Allow creators to receive tips in SOL/USDC
- Global Reach - Support tipping from anywhere, with fiat off-ramps
- Low Friction - Minimal fees, instant settlement
- Identity Integration - Use SNS (.sol domains) for creator branding
- Emerging Markets - Focus on Africa/Nigeria with NGN payout support

**Value Proposition**
- ✅ No traditional payment processor intermediaries
- ✅ Instant Solana settlement
- ✅ Creator keeps 95%+ (low fees)
- ✅ Fiat conversion for cash-out
- ✅ On-chain proof of support (immutable records)

---

## Technical Architecture

**Layer 1:** Frontend (User-Facing)  
**Layer 2:** API Backend (Vercel Serverless)  
**Layer 3:** Smart Contracts (Solana)  
**Layer 4:** External Integrations

---

## Core Features

### 1. Creator Profiles
- SNS subdomain (e.g., creator.tipstack.sol)
- Bio, avatar, social links
- Tip history & stats
- Payout settings

### 2. Tipping Flow
1. Visit creator's page
2. Connect wallet (Dynamic Labs)
3. Enter tip amount in SOL/USDC
4. Optional: DFlow swap to convert token
5. Sign transaction
6. Tips recorded on-chain (Helius indexer)

### 3. Creator Dashboard
- Total tips received
- Analytics (top tippers, trends)
- Wallet management
- Off-ramp to NGN (Pajcash)

### 4. Admin Panel
- Creator moderation
- Fee analytics
- Ledger/transactions
- User stats

### 5. Widget/SDK
- Embeddable tipping widget
- Custom domain support
- Event streaming (WebSocket)

---

## Business Model

### Revenue Streams

| Stream | Rate | Notes |
|--------|------|-------|
| Tip Fee | ~5% | Per transaction |
| Treasury Wallet | Platform owned | Collects fees |
| Off-ramp Fee | TBD | Pajcash integration |
| Premium Tier | Planned | Advanced analytics |

**Monetization:** Default 5% fee on tips (creator keeps 95%), Platform collects fees via treasury, Margin on fiat conversion (Pajcash provides rate).

---

## Target Users

### Creators
- Content creators (YouTube, Twitch, TikTok)
- Artists & musicians
- Gamers & streamers
- Communities/DAOs
- Geography: Global, priority: Africa/Nigeria

### Tippers
- SOL token holders
- Supporters of creators
- Anyone wanting borderless payments
- Geography: Anywhere with internet

---

## Use Cases
- Direct fan support (instead of ads)
- Podcast donations
- Charity fundraising
- Content monetization
- Community contributions

---

## Technical Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Vercel Serverless, Express |
| Blockchain | Solana, Anchor Framework |
| Database | PostgreSQL (Supabase) |
| Auth | Dynamic Labs SDK, JWT |
| Indexing | Helius webhooks |
| Wallets | Phantom, Solflare, Magic, Dynamic Labs |
| DEX | Jupiter, DFlow |
| Pricing | Pyth, CoinGecko |
| Email | Brevo/SendGrid, Nodemailer |

---

## Project Goals (Q2-Q3 2026)

### Immediate (Next 30 days) ✅
- ✅ Security hardening (audit fixes implemented)
- ✓ Fix CVE-2024-54134
- ✓ SNS verification
- ✓ Transaction simulation
- ✓ Rate limiting
- ✓ Private RPC

### Short-term (Q2 2026)
- Devnet launch & testing
- Creator onboarding flow
- SNS domain registration integration
- Pajcash NGN off-ramp verification
- Community feedback

### Medium-term (Q3 2026)
- Mainnet launch
- Marketing & creator recruitment
- Analytics dashboard
- Widget/SDK documentation
- Secondary off-ramp (Bitnob, Yellow Card)

### Long-term (2026+)
- Premium analytics tier
- Mobile app
- DAO governance
- International expansion
- Streaming payouts (continuous)

---

## Competitive Advantages

| Advantage | Details |
|-----------|---------|
| Speed | Solana's low latency (400ms slots) |
| Cost | Minimal fees vs traditional payment processors |
| Sovereignty | Creator owns keys, not platform |
| Emerging Markets | NGN off-ramp addresses Africa gap |
| Identity | SNS branding for trust & discovery |
| Intent-based | DFlow enables better pricing via PFOF |
| Web3 Native | Seamless wallet integration |

---

## Current Status

### What's Live ✅
- Core infrastructure (API, frontend, contracts)
- Dynamic Labs auth integration
- SNS domain support
- Solana transaction pipeline
- Helius indexer integration
- Jupiter swap routing

### What's In Progress 🔄
- Security audit fixes (JUST COMPLETED)
- Rate limiting (JUST COMPLETED)
- Private RPC integration (READY)
- Pajcash NGN bridge (configured, needs testing)

### What's Blocked ⏸️
- Mainnet launch (awaiting security fixes → NOW RESOLVED)
- Creator marketing (waiting for security audit clearance)
- Off-ramp integration (pending Pajcash compliance verification)

---

## Risk Factors & Mitigation

| Risk | Mitigation |
|------|-----------|
| Smart contract bugs | Audited Anchor program |
| Solana RPC outages | Private RPC fallback |
| MEV/sandwich attacks | DFlow intent protection |
| Regulatory (Nigeria) | Pajcash CBN compliance |
| Liquidity risk | Multiple off-ramp providers |
| Private key theft | Dynamic Labs TSS-MPC encryption |

---

## Next Action Items

- ✅ Security fixes - COMPLETE
- 🔄 Environment setup - Add .env.local with RPC/Redis keys
- 🔄 Devnet testing - Test full tip flow
- 🔄 Pajcash verification - Confirm CBN/SEC-NG status
- 🔄 Creator beta - Launch with 10-20 test creators
- 🔄 Mainnet deployment - After beta validation

---

## Success Metrics

- **DAU (Daily Active Users):** Target 1,000+ in month 1
- **Total Tips:** Target 10,000+ SOL in month 1
- **Creator Count:** Target 100+ verified creators
- **NGN Payouts:** Target 500K+ NGN in month 1
- **Security:** 0 exploits, 0 fund loss

---

## Vision

**TipStack = Stripe for Creators + Solana Speed + Emerging Market Focus**

TipStack is evolving into the liquidity layer for the creator economy. Future roadmap includes:

- **Loyalty & Rewards (Torque Driven):** Automatically issuing verified "Supporter Badges" or NFTs when users reach certain tipping milestones.
- **Social Graph Intelligence:** Aggregating data from Farcaster, Lens, and X to highlight a creator's most loyal on-chain fans.
- **Universal Merchant SDK:** Expanding the tipping widget into a full checkout system for digital products and gated content.
- **Cross-Chain Settlement:** Allowing supporters from EVM chains to tip Solana-based creators through seamless cross-chain intent routing.

