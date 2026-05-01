# Tip Stack ⚡

**The fastest way to monetize your craft on Solana** – A premier non-custodial tipping and monetization protocol for the Solana ecosystem.

Tip Stack is a decentralized tipping infrastructure designed to seamlessly bridge the gap between Web2 onboarding and Web3 execution. We empower creators, developers, and platforms to monetize their audiences instantly, without intermediaries, custody risks, or complex wallet setups.

---

## Features

## Features

• 🎯 **Non-Custodial Tipping** - All transactions routed directly from supporter to creator via Jupiter
• 💰 **Hybrid Payments** - Accept SOL, SPL tokens (USDC), or fiat via Fossa Pay (Credit Card / Bank)
• 🚀 **Frictionless Auth** - Dynamic.xyz integration supports external wallets & embedded MPC wallets
• 📱 **Instant Mobile Pay** - One-click payment via native mobile wallets using Solana Pay standard
• 📊 **Growth Engine** - Enterprise-grade event tracking via Torque for real-time analytics
• 🧩 **Embedded SDK** - Secure iframe widget for third-party websites with a single line of code
• ✅ **Real-Time Verification** - Immutable ledger powered by Helius webhooks for 100% data integrity

---

## Quick Start

### Prerequisites

• Node.js 18+
• pnpm or npm
• Git
• Solana CLI (for blockchain development)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/tipstack.git
cd tipstack

# Install dependencies
pnpm install

# Copy environment files
cp .env.example .env.local

# Fill in your environment variables
# See .env.example for required values
```

### Development

```bash
# Start development server
pnpm dev

# Open http://localhost:3000
```

### Smart Contract Development

```bash
# Navigate to contracts
cd tipstack_anchor

# Install dependencies
anchor build

# Run tests
anchor test
```

---

## Project Structure

```
tipstack/
├── src/                     # React frontend application
│   ├── components/          # Reusable React components
│   ├── contexts/            # Context providers (Wallet, Auth)
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   └── config/              # Configuration files
├── api/                     # Backend API (Vercel Serverless)
│   ├── _handlers/           # API route handlers
│   │   ├── auth/            # Authentication endpoints
│   │   ├── creators/        # Creator management
│   │   ├── payments/        # Payment processing
│   │   ├── payouts/         # Payout handling
│   │   ├── social/          # Social integration
│   │   └── solana/          # Blockchain interactions
│   └── _lib/                # Shared library functions
├── tipstack_anchor/           # Solana smart contracts
│   └── programs/            # Anchor programs
├── skills/                  # Agent/MCP skills
├── public/                  # Static assets
└── scripts/                 # Build and deployment scripts
```

---

## Architecture

### Smart Contracts (Anchor Framework)

• **Core Tipping Contract** - Main contract for processing tips
• **Non-Custodial Design** - Funds never held by platform
• **Direct Settlement** - Creator receives tips directly to their wallet
• **Fee System** - Configurable platform fees (~5%)

### Frontend

• **React 18** - UI framework with TypeScript
• **Vite** - Fast build tool
• **Tailwind CSS** - Utility-first CSS framework
• **Dynamic Labs** - Wallet authentication & MPC wallets
• **@Solana/web3.js** - Blockchain interaction

### Backend

• **Node.js** - JavaScript runtime
• **Vercel Serverless** - Deployment platform
• **Express.js** - API framework (via API routes)
• **Supabase** - PostgreSQL database
• **JWT** - Authentication tokens

### Integrations

• **Dynamic.xyz** - Identity resolution & embedded wallets
• **Jupiter V6** - Non-custodial swaps & DEX execution
• **Fossa Pay** - Fiat payment gateway (Credit Card / Bank)
• **Helius/QuickNode** - On-chain event indexing & RPC
• **Torque** - Growth tracking & analytics
• **Pajcash** - NGN off-ramp for African markets

---

## Core Features

### 1. Creator Profiles
- SNS subdomain support (e.g., creator.tipstack.sol)
- Bio, avatar, and social links
- Tip history & statistics
- Payout settings and preferences

### 2. Tipping Flow
1. Visit creator's page or embedded widget
2. Connect wallet (Dynamic Labs) or email signup
3. Enter tip amount in SOL/USDC or fiat
4. Optional token conversion via Jupiter
5. Sign transaction
6. Tips recorded on-chain (Helius indexer)

### 3. Creator Dashboard
- Total tips received
- Analytics (top supporters, trends)
- Wallet management
- Off-ramp to NGN via Pajcash

### 4. Admin Panel
- Creator moderation
- Fee analytics
- Ledger & transaction management
- User statistics

### 5. Widget/SDK
- Embeddable tipping widget
- Custom domain support
- Event streaming (WebSocket)
- Secure iframe isolation

---

## Embedded Tip Widget

Integrate Tip Stack into your platform in seconds:

```html
<!-- 1. Include the Tip Stack Widget Script -->
<script src="https://tipstack.fun/widget.js"></script>

<!-- 2. Place the button wherever you want -->
<div 
  data-tipstack-id="YOUR_WALLET_ADDRESS_OR_HANDLE" 
  data-tipstack-theme="dark" 
  data-tipstack-color="#00D265">
</div>
```

---

## Environment Variables

### Web Application (.env.local)

```
VITE_DYNAMIC_ENVIRONMENT_ID=your_dynamic_env_id
VITE_QUICKNODE_SOLANA_RPC=your_quicknode_rpc_url
VITE_API_URL=http://localhost:3000/api
```

### Backend API (.env)

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
JWT_SECRET=your_jwt_secret
SOLANA_RPC_URL=your_solana_rpc_url
HELIUS_API_KEY=your_helius_api_key
JUPITER_API_URL=https://quote-api.jup.ag
```

### Smart Contracts

```
ANCHOR_PROVIDER_URL=your_solana_rpc_url
ANCHOR_WALLET=path_to_wallet_keypair
```

---

## Scripts

### Development

```bash
pnpm dev              # Start development server
pnpm build            # Build all packages
pnpm lint             # Run linting
pnpm type-check       # TypeScript type checking
```

### Smart Contracts

```bash
pnpm anchor:build     # Build Anchor programs
pnpm anchor:test      # Run contract tests
pnpm anchor:deploy    # Deploy to devnet
anchor test           # Full test suite
```

### Utilities

```bash
pnpm clean            # Clean build artifacts
pnpm format           # Format code
```

---

## Testing

### Smart Contract Tests

```bash
# Run all tests
anchor test

# Run with detailed output
anchor test -- --verbose

# Run specific test file
anchor test tests/your-test.ts
```

### Frontend Tests

```bash
# Linting
pnpm lint

# Type checking
pnpm type-check
```

---

## Deployment

### Devnet (Testing)

```bash
# Deploy contracts
anchor deploy

# Note: Devnet is for testing and resets regularly
```

### Mainnet (Production)

```bash
# Deploy smart contracts to mainnet
# (requires mainnet setup)

# Deploy frontend
pnpm build
# Deploy to Vercel or preferred hosting
```

---

## User Flows

### 🧑‍🎨 For Creators (The Receiver)
1. **Onboard:** Connect via Dynamic using an existing wallet or email (MPC wallet provisioned instantly)
2. **Distribute:** Share your Tip Stack profile or embed the Tip Stack Widget on your site
3. **Monetize:** Receive crypto directly into your self-custody wallet from any supporter
4. **Offramp:** Convert earnings to local currency (e.g., NGN via Pajcash) instantly from the dashboard

### 💸 For Supporters (The Tipper)
1. **Choose Amount:** Enter a USD/SOL value and optional message
2. **Select Rail:**
   - **Crypto Rail:** Pay with any token in your wallet (auto-swapped via Jupiter)
   - **Fiat Rail (NGN):** Pay with Credit Card or Bank Transfer via Fossa Pay
3. **Execute:** Sign the transaction or use Instant Pay for mobile wallets
4. **Confirm:** View real-time settlement status as Helius confirms transaction on-chain

---

## Business Model

### Revenue Streams

| Stream | Rate | Notes |
|--------|------|-------|
| Tip Fee | ~5% | Per transaction |
| Treasury Wallet | Platform owned | Collects fees |
| Off-ramp Fee | TBD | Pajcash integration |
| Premium Tier | Planned | Advanced analytics |

---

## Competitive Advantages

| Advantage | Details |
|-----------|---------|
| Speed | Solana's low latency (400ms) |
| Cost | Minimal fees vs traditional payment processors |
| Sovereignty | Creator owns keys, not platform |
| Emerging Markets | NGN off-ramp for Africa |
| Non-Custodial | Creator keeps 95%+ of tips |
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
- Security audit fixes
- Rate limiting
- Private RPC integration
- Pajcash NGN bridge

### What's Blocked ⏸️
- Mainnet launch (awaiting security fixes)
- Creator marketing (security audit clearance)
- Off-ramp integration (Pajcash compliance verification)

---

## Security

• ✅ Reentrancy protection in smart contracts
• ✅ Access control & authorization
• ✅ Input validation & rate limiting
• ✅ Private RPC for transaction privacy
• ✅ JWT authentication for API
• 🔄 Security audit (in progress)

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Links & Resources

• [Solana Documentation](https://docs.solana.com/)
• [Anchor Framework](https://www.anchor-lang.com/)
• [Dynamic Labs](https://www.dynamic.xyz/)
• [Jupiter](https://jup.ag/)
• [Helius](https://www.helius.dev/)

---

## Support

For questions and support:

• Create an [issue](https://github.com/your-username/tipstack/issues)
• Join our Discord community
• Follow us on [Twitter](https://twitter.com/your-twitter)

---

Built with ⚡ on Solana • Non-Custodial Monetization • Open Source

