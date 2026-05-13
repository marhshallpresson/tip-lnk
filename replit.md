# TipStack

TipStack is a Solana-based creator tipping and payments platform where fans can tip their favorite creators directly with SOL, USDC, and other tokens.

## Run & Operate

- `pnpm --filter @workspace/tipstack run dev` — run the frontend (Dynamic port via `PORT` env)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (`artifacts/tipstack/`)
- API: Express 5 (`artifacts/api-server/`)
- Auth: Dynamic Labs SDK v4 (`@dynamic-labs/sdk-react-core@4.83.0`, `@dynamic-labs/solana@4.83.0`)
- Wallets: Dynamic Labs + `@solana/wallet-adapter-react` (dual wallet setup)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Build: esbuild (CJS bundle) for API; Vite for frontend
- Styling: Tailwind CSS v3 (PostCSS plugin pattern)

## Where things live

- `artifacts/tipstack/src/` — React frontend source
- `artifacts/tipstack/src/contexts/AuthContext.jsx` — Dynamic Auth bridge (source of truth for auth state)
- `artifacts/tipstack/src/contexts/WalletContext.jsx` — Solana wallet adapter context
- `artifacts/tipstack/src/main.jsx` — DynamicContextProvider root setup
- `artifacts/tipstack/vite.config.ts` — Vite config with wasm/topLevelAwait/nodePolyfills plugins + shim aliases
- `artifacts/api-server/src/` — Express API server source
- `lib/db/` — Drizzle ORM schema and client (source of truth for DB schema)
- `lib/api-spec/` — OpenAPI spec (source of truth for API contracts)

## Architecture decisions

- **Dual wallet approach**: Dynamic Labs handles authentication and embedded wallets; `@solana/wallet-adapter-react` handles transaction signing for Solana Pay flows. Both coexist to avoid rewriting all transaction code.
- **Auth flow**: Dynamic JWT → `POST /auth/dynamic-verify` on the API server → local `tipstack_auth_token` cookie. This decouples frontend auth from backend sessions.
- **Dynamic SDK v4 patterns**: Use `useIsLoggedIn()` for auth checks, `handleLogOut` from `useDynamicContext()` for logout, `setShowAuthFlow` from `useDynamicContext()` to open the auth modal. Do not use `useHandleLogout` (not exported from the pre-bundled chunk).
- **Shim aliases**: `klend-sdk`, `orca-whirlpools-sdk`, and `forward-mpc-client` are shimmed as empty modules in `vite.config.ts` to unblock builds while those integrations are incomplete.
- **Tailwind v3**: Uses PostCSS plugin (`tailwindcss` + `autoprefixer`) — NOT the Vite plugin. This is required for compatibility with the existing CSS setup.

## Product

- Creator profiles with customizable bios, avatars, cover images, and social links
- Tip widget supporting SOL, USDC, BONK, and other SPL tokens
- Auto-settle to USDC option for creators who want stable earnings
- Yield-bearing tips and gasless tipping (fee sponsorship) as opt-in creator settings
- QR code checkout for in-person or shareable tipping links
- Social account linking (Twitter/X, Discord, YouTube, Instagram)
- Analytics dashboard for tip history and earnings

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `VITE_DYNAMIC_ENVIRONMENT_ID` must be set before the app will render (Dynamic SDK throws `MissingEnvironmentIdError` without it)
- Do NOT add `useHandleLogout` — it's in the type definitions but not exported from the Vite pre-bundled Dynamic chunk. Use `handleLogOut` from `useDynamicContext()` instead.
- Do NOT add `security`, `session`, `waas`, `persistWalletSession`, `walletBook`, `loadingTimeout`, or `recoveryTimeout` to `DynamicContextProvider settings` — these are not valid in SDK v4.83.0.
- Vite config must include `wasm()`, `topLevelAwait()`, and `nodePolyfills()` plugins for Solana dependencies to load correctly.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Dynamic SDK v4 docs: https://docs.dynamic.xyz
