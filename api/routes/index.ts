import { Router, type IRouter } from "express";
import healthRouter from "./health";

// Auth handlers
import authMe from "../handlers/auth/me.js";
import authLogout from "../handlers/auth/logout.js";
import authCsrf from "../handlers/auth/csrf.js";
import authAdminLogin from "../handlers/auth/admin-login.js";
import authExchange from "../handlers/auth/exchange.js";
import authLinkEmailStart from "../handlers/auth/link-email/start.js";
import authLinkEmailVerify from "../handlers/auth/link-email/verify.js";
import authTwitterCallback from "../handlers/auth/twitter/callback.js";
import authDiscordCallback from "../handlers/auth/discord/callback.js";
import authDynamicVerify from "../handlers/auth/dynamic-verify.js";
import authDynamicSync from "../handlers/auth/dynamic-sync.js";

// Solana handlers
import solanaProfileGet from "../handlers/solana/profile/get.js";
import solanaProfileUpdate from "../handlers/solana/profile/update.js";
import solanaAssets from "../handlers/solana/assets.js";
import solanaSend from "../handlers/solana/send.js";
import solanaSendSmart from "../handlers/solana/send-smart.js";
import solanaPriorityFee from "../handlers/solana/priority-fee.js";
import solanaSnsCheck from "../handlers/solana/sns-check.js";
import solanaTipsGet from "../handlers/solana/tips/get.js";
import solanaTipsCreate from "../handlers/solana/tips/create.js";
import solanaTipsMessage from "../handlers/solana/tips/message.js";
import solanaTipsStream from "../handlers/solana/tips/stream.js";
import solanaWebhookHelius from "../handlers/solana/webhooks/helius.js";
import solanaJupiterSwap from "../handlers/solana/jupiter/swap.js";
import solanaBirdeyePortfolio from "../handlers/solana/birdeye/portfolio.js";
import solanaPrice from "../handlers/solana/price.js";
import solanaRpc from "../handlers/solana/rpc.js";
import solanaActionsConfig from "../handlers/solana/actions/config.js";
import solanaActionsTip from "../handlers/solana/actions/tip.js";
import solanaNormiesClaim from "../handlers/solana/normies/claim.js";

// Social handlers
import socialXPosts from "../handlers/social/x-posts.js";

// Payouts handlers
import payoutsWebhook from "../handlers/payouts/webhook.js";
import payoutsHistory from "../handlers/payouts/history.js";
import payoutsWithdraw from "../handlers/payouts/withdraw.js";
import payoutsBalance from "../handlers/payouts/balance.js";
import payoutsBanks from "../handlers/payouts/banks.js";
import payoutsResolve from "../handlers/payouts/resolve.js";

// Admin handlers
import adminStats from "../handlers/admin/stats.js";
import adminCreators from "../handlers/admin/creators.js";
import adminLedger from "../handlers/admin/ledger.js";
import adminMigration from "../handlers/admin/migration.js";

// Creator handlers
import creatorAnalytics from "../handlers/creators/analytics.js";

// Payment handlers
import paymentsIntent from "../handlers/payments/intent.js";
import paymentsExecute from "../handlers/payments/execute.js";
import paymentsStatus from "../handlers/payments/status.js";
import paymentsFiatIntent from "../handlers/payments/fiat/intent.js";
import paymentsFiatWebhook from "../handlers/payments/fiat/webhook.js";
import paymentsFiatRate from "../handlers/payments/fiat/rate.js";
import paymentsFiatStatus from "../handlers/payments/fiat/status.js";

// SDK handlers
import sdkInit from "../handlers/sdk/init.js";
import sdkTip from "../handlers/sdk/tip.js";
import sdkEvents from "../handlers/sdk/events.js";

const router: IRouter = Router();

router.use(healthRouter);

// Helper to wrap Vercel-style handler as Express route
const h = (handler: Function) => (req: any, res: any) => handler(req, res);

// ── Auth ──────────────────────────────────────────────────────────────────────
router.get("/auth/me", h(authMe));
router.post("/auth/logout", h(authLogout));
router.get("/auth/csrf", h(authCsrf));
router.post("/auth/admin-login", h(authAdminLogin));
router.post("/auth/exchange", h(authExchange));
router.post("/auth/link-email/start", h(authLinkEmailStart));
router.post("/auth/link-email/verify", h(authLinkEmailVerify));
router.get("/auth/twitter/callback", h(authTwitterCallback));
router.get("/auth/discord/callback", h(authDiscordCallback));
router.post("/auth/dynamic-verify", h(authDynamicVerify));
router.post("/auth/dynamic-sync", h(authDynamicSync));

// ── Solana Profile ────────────────────────────────────────────────────────────
router.get("/solana/profile", h(solanaProfileGet));
router.get("/solana/profile/:id", h(solanaProfileGet));
router.get("/solana/profile/get", h(solanaProfileGet));
router.post("/solana/profile/update", h(solanaProfileUpdate));

// ── Solana Assets & Transactions ──────────────────────────────────────────────
router.get("/solana/assets", h(solanaAssets));
router.post("/solana/send", h(solanaSend));
router.post("/solana/send-smart", h(solanaSendSmart));
router.get("/solana/priority-fee", h(solanaPriorityFee));
router.post("/solana/priority-fee", h(solanaPriorityFee));
router.post("/solana/sns-check", h(solanaSnsCheck));

// ── Solana Normies ────────────────────────────────────────────────────────────
router.post("/solana/normies/claim", h(solanaNormiesClaim));

// ── Solana Tips ───────────────────────────────────────────────────────────────

router.get("/solana/tips", h(solanaTipsGet));
router.get("/solana/tips/get", h(solanaTipsGet));
router.post("/solana/tips/create", h(solanaTipsCreate));
router.post("/solana/tips/message", h(solanaTipsMessage));
router.get("/solana/tips/stream", h(solanaTipsStream));

// ── Solana Webhooks ───────────────────────────────────────────────────────────
router.post("/solana/webhooks/helius", h(solanaWebhookHelius));

// ── Solana Jupiter ────────────────────────────────────────────────────────────
router.post("/solana/jupiter/swap", h(solanaJupiterSwap));

// ── Solana Birdeye ────────────────────────────────────────────────────────────
router.get("/solana/birdeye/portfolio", h(solanaBirdeyePortfolio));

// ── Solana Price & RPC ────────────────────────────────────────────────────────
router.get("/solana/price", h(solanaPrice));
router.all("/quicknode/rpc/solana", h(solanaRpc));

// ── Solana Actions (Blinks) ───────────────────────────────────────────────────
router.get("/solana/actions/config", h(solanaActionsConfig));
router.get("/solana/actions/tip/:recipient", h(solanaActionsTip));
router.post("/solana/actions/tip/:recipient", h(solanaActionsTip));

// ── Social ────────────────────────────────────────────────────────────────────
router.get("/social/x-posts", h(socialXPosts));

// ── Payouts ───────────────────────────────────────────────────────────────────
router.post("/payouts/webhook", h(payoutsWebhook));
router.get("/payouts/history", h(payoutsHistory));
router.post("/payouts/withdraw", h(payoutsWithdraw));
router.get("/payouts/balance", h(payoutsBalance));
router.get("/payouts/banks", h(payoutsBanks));
router.post("/payouts/resolve", h(payoutsResolve));

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get("/admin/stats", h(adminStats));
router.get("/admin/creators", h(adminCreators));
router.get("/admin/ledger", h(adminLedger));
router.post("/admin/migration", h(adminMigration));

// ── Creators ──────────────────────────────────────────────────────────────────
router.get("/creators/analytics", h(creatorAnalytics));

// ── Payments ──────────────────────────────────────────────────────────────────
router.post("/payments/intent", h(paymentsIntent));
router.post("/payments/execute", h(paymentsExecute));
router.get("/payments/status", h(paymentsStatus));
router.post("/payments/fiat/intent", h(paymentsFiatIntent));
router.post("/payments/fiat/webhook", h(paymentsFiatWebhook));
router.get("/payments/fiat/rate", h(paymentsFiatRate));
router.get("/payments/fiat/status", h(paymentsFiatStatus));

// ── SDK ───────────────────────────────────────────────────────────────────────
router.post("/sdk/init", h(sdkInit));
router.post("/sdk/tip", h(sdkTip));
router.get("/sdk/events", h(sdkEvents));

export default router;
