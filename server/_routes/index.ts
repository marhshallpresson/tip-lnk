import { Router, type IRouter } from "express";
import healthRouter from "./health.js";

// Auth handlers
import authMe from "../_handlers/auth/me.js";
import authLogout from "../_handlers/auth/logout.js";
import authCsrf from "../_handlers/auth/csrf.js";
import authAdminLogin from "../_handlers/auth/admin-login.js";
import authExchange from "../_handlers/auth/exchange.js";
import authLinkEmailStart from "../_handlers/auth/link-email/start.js";
import authLinkEmailVerify from "../_handlers/auth/link-email/verify.js";
import authTwitterCallback from "../_handlers/auth/twitter/callback.js";
import authDiscordCallback from "../_handlers/auth/discord/callback.js";
import authDynamicVerify from "../_handlers/auth/dynamic-verify.js";
import authDynamicSync from "../_handlers/auth/dynamic-sync.js";
import authUpdateName from "../_handlers/auth/update-name.js";

// Deep Link handlers
import deepLinkResolve from "../_handlers/deep-link/resolve.js";
import deepLinkLinkSocial from "../_handlers/deep-link/link-social.js";

// Solana handlers
import solanaProfileGet from "../_handlers/solana/profile/get.js";
import solanaProfileUpdate from "../_handlers/solana/profile/update.js";
import solanaDiagnosticCheck from "../_handlers/solana/diagnostic-check.js";
import solanaAssets from "../_handlers/solana/assets.js";
import solanaSend from "../_handlers/solana/send.js";
import solanaSendSmart from "../_handlers/solana/send-smart.js";
import solanaPriorityFee from "../_handlers/solana/priority-fee.js";
import solanaSnsCheck from "../_handlers/solana/sns-check.js";
import solanaTipsGet from "../_handlers/solana/tips/get.js";
import solanaTipsCreate from "../_handlers/solana/tips/create.js";
import solanaTipsMessage from "../_handlers/solana/tips/message.js";
import solanaTipsStream from "../_handlers/solana/tips/stream.js";
import solanaWebhookHelius from "../_handlers/solana/webhooks/helius.js";
import solanaWebhookQuicknode from "../_handlers/solana/webhooks/quicknode.js";
import solanaJupiterSwap from "../_handlers/solana/jupiter/swap.js";
import solanaBirdeyePortfolio from "../_handlers/solana/birdeye/portfolio.js";
import solanaPrice from "../_handlers/solana/price.js";
import solanaRpc from "../_handlers/solana/rpc.js";
import solanaActionsConfig from "../_handlers/solana/actions/config.js";
import solanaActionsTip from "../_handlers/solana/actions/tip.js";
import solanaNormiesClaim from "../_handlers/solana/normies/claim.js";
import solanaBackfill from "../_handlers/solana/backfill.js";

// Social handlers
import socialXPosts from "../_handlers/social/x-posts.js";

// Payouts handlers
import payoutsWebhook from "../_handlers/payouts/webhook.js";
import payoutsHistory from "../_handlers/payouts/history.js";
import payoutsWithdraw from "../_handlers/payouts/withdraw.js";
import payoutsBalance from "../_handlers/payouts/balance.js";
import payoutsBanks from "../_handlers/payouts/banks.js";
import payoutsResolve from "../_handlers/payouts/resolve.js";

// Admin handlers
import adminStats from "../_handlers/admin/stats.js";
import adminCreators from "../_handlers/admin/creators.js";
import adminLedger from "../_handlers/admin/ledger.js";
import adminMigration from "../_handlers/admin/migration.js";

// Creator handlers
import creatorAnalytics from "../_handlers/creators/analytics.js";

// Payment handlers
import paymentsIntent from "../_handlers/payments/intent.js";
import paymentsExecute from "../_handlers/payments/execute.js";
import paymentsStatus from "../_handlers/payments/status.js";
import paymentsRecurring from "../_handlers/payments/recurring.js";
import paymentsFiatIntent from "../_handlers/payments/fiat/intent.js";
import paymentsFiatWebhook from "../_handlers/payments/fiat/webhook.js";
import paymentsFiatRate from "../_handlers/payments/fiat/rate.js";
import paymentsFiatStatus from "../_handlers/payments/fiat/status.js";

// SDK handlers
import sdkInit from "../_handlers/sdk/init.js";
import sdkTip from "../_handlers/sdk/tip.js";
import sdkEvents from "../_handlers/sdk/events.js";

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
router.post("/auth/update-name", h(authUpdateName));

// ── Deep Links ────────────────────────────────────────────────────────────────
router.get("/deep-link/resolve", h(deepLinkResolve));
router.get("/deep-link/link-social", h(deepLinkLinkSocial));

// ── Solana Profile ────────────────────────────────────────────────────────────
router.get("/solana/profile", h(solanaProfileGet));
router.get("/solana/profile/:id", h(solanaProfileGet));
router.get("/solana/profile/get", h(solanaProfileGet));
router.post("/solana/profile/update", h(solanaProfileUpdate));

// ── Solana Assets & Transactions ──────────────────────────────────────────────
router.get("/solana/diagnostic-check", h(solanaDiagnosticCheck));
router.get("/solana/assets", h(solanaAssets));
router.post("/solana/send", h(solanaSend));
router.post("/solana/send-smart", h(solanaSendSmart));
router.get("/solana/priority-fee", h(solanaPriorityFee));
router.post("/solana/priority-fee", h(solanaPriorityFee));
router.post("/solana/sns-check", h(solanaSnsCheck));
router.post("/solana/backfill", h(solanaBackfill));

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
router.post("/solana/webhooks/quicknode", h(solanaWebhookQuicknode));

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
router.post("/payments/recurring", h(paymentsRecurring));
router.post("/payments/fiat/intent", h(paymentsFiatIntent));
router.post("/payments/fiat/webhook", h(paymentsFiatWebhook));
router.get("/payments/fiat/rate", h(paymentsFiatRate));
router.get("/payments/fiat/status", h(paymentsFiatStatus));

// ── SDK ───────────────────────────────────────────────────────────────────────
router.post("/sdk/init", h(sdkInit));
router.post("/sdk/tip", h(sdkTip));
router.get("/sdk/events", h(sdkEvents));

export default router;
