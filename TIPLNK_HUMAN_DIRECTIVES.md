# TipLnk — Non-AI Human Task Directives
# Tasks requiring credentials, external dashboards, or human judgment
# Owner: Mobot / Gaan Digitals
# Last reviewed: April 2026

---

## HOW TO USE THIS DOCUMENT

These tasks CANNOT be delegated to an AI agent because they involve:
- Logging into external service dashboards
- Rotating live credentials
- Approving production deployments
- Legal/compliance decisions
- Financial service configuration

Each task lists: responsible party · estimated time · exact steps · verification.

---

## DIRECTIVE 01 — Rotate all potentially exposed credentials
**Owner:** Mobot (repo admin)
**Priority:** Do this BEFORE any other task
**Time:** 45 minutes
**Trigger:** Public repo exists + unknown lockfile history

### Steps:

**A. Supabase key rotation**
1. Go to supabase.com → your TipLnk project → Settings → API
2. Click "Regenerate" on the **Service Role Key**
3. Click "Regenerate" on the **JWT Secret** (this invalidates all existing sessions)
4. Do NOT regenerate the anon key unless it was exposed (it's public by design)
5. Update all environment variable stores (Vercel, local .env.local) with new values
6. Test that the app still connects: `curl https://your-project.supabase.co/rest/v1/ -H "apikey: NEW_ANON_KEY"`

**B. Pajcash API key rotation**
1. Log in to your Pajcash NGN merchant dashboard
2. Navigate to API Settings → Regenerate API Key
3. Copy new key to Vercel environment variables (see Directive 03)
4. Test a sandbox payout to confirm the new key works before going live

**C. SMTP credential rotation (if using nodemailer)**
1. Log in to your email provider dashboard (Zoho / Gmail / Brevo / etc.)
2. Revoke the existing App Password or SMTP credentials
3. Generate new credentials
4. Update Vercel env vars and .env.local

**D. JWT Secret regeneration**
1. In terminal: `openssl rand -base64 32`
2. Copy output as new `JWT_SECRET` value
3. Update in Vercel env vars and .env.local
4. Note: existing user sessions will be invalidated. Acceptable for pre-launch.

**Verification:**
- Confirm the old Supabase service_role key is rejected:
  `curl https://YOUR_PROJECT.supabase.co/rest/v1/users -H "apikey: OLD_KEY"`
  Expected: `{"message":"Invalid API key"}`

---

## DIRECTIVE 02 — Supabase RLS audit (database console)
**Owner:** Mobot
**Priority:** Critical — do alongside Directive 01
**Time:** 1–2 hours
**Why AI can't do this:** Requires Supabase dashboard access and live DB testing

### Steps:

**A. Run the Security Advisor**
1. Supabase Dashboard → Database → Security Advisor
2. Review every warning flagged — especially "RLS disabled" and "policy too permissive"

**B. Enable RLS on all tables**
In Supabase SQL Editor, run for EACH table in your schema:
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
-- Repeat for every table you have created
```

**C. Add RLS policies — minimum required policies per table:**

For `profiles` (users see only their own):
```sql
-- Read own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING ((select auth.uid()) = user_id);

-- Update own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);
```

For `tips` (public read of tip amounts, private write):
```sql
-- Anyone can read tip amounts (public activity feed)
CREATE POLICY "Tips are publicly readable"
ON tips FOR SELECT
USING (true);

-- Only authenticated users can create tips
CREATE POLICY "Authenticated users can create tips"
ON tips FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
```

For `payouts` (creator sees only their own):
```sql
CREATE POLICY "Creators see own payouts"
ON payouts FOR SELECT
USING ((select auth.uid()) = creator_id);

CREATE POLICY "Only service role can insert payouts"
ON payouts FOR INSERT
WITH CHECK (false);  -- Only service_role (server) can insert
```

**D. Verify RLS is working:**
Using your browser DevTools or Postman, send:
```
GET https://YOUR_PROJECT.supabase.co/rest/v1/profiles?select=*
Headers:
  apikey: YOUR_ANON_KEY
  Authorization: Bearer YOUR_ANON_KEY
```
Expected: `[]` (empty array, not an error, not data)

**E. Test with an authenticated user**
Use Supabase Dashboard → Authentication → Users → pick a test user
Get their JWT token and repeat the query above — you should see ONLY their row.

---

## DIRECTIVE 03 — Vercel environment variables configuration
**Owner:** Mobot
**Priority:** High — required before re-deploying
**Time:** 30 minutes

### Steps:
1. Go to vercel.com → tip-lnk project → Settings → Environment Variables

**Variables to add/update:**

| Variable Name | Value Source | Environment |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project Settings → API | Production + Preview |
| `VITE_SUPABASE_ANON_KEY` | Supabase project Settings → API | Production + Preview |
| `SUPABASE_URL` | Same as above | Production only |
| `SUPABASE_SERVICE_ROLE_KEY` | Rotated in Directive 01 | Production only |
| `DATABASE_URL` | Supabase Settings → Database → Connection string (Pooler) | Production only |
| `JWT_SECRET` | Generated in Directive 01 | Production only |
| `JWT_AUDIENCE` | `tiplnk-app` | Production only |
| `JWT_ISSUER` | `https://tip-lnk.vercel.app` | Production only |
| `PAJCASH_API_KEY` | Rotated in Directive 01 | Production only |
| `SMTP_HOST` | Your email provider | Production only |
| `SMTP_PORT` | `587` (TLS) or `465` (SSL) | Production only |
| `SMTP_USER` | Your SMTP username | Production only |
| `SMTP_PASS` | Rotated in Directive 01 | Production only |
| `VITE_SOLANA_RPC_URL` | Your RPC provider (Helius/Alchemy/QuickNode recommended) | Production + Preview |
| `NODE_ENV` | `production` | Production only |

**CRITICAL CHECK:**
- Confirm NO variable named `VITE_SUPABASE_SERVICE_ROLE_KEY` exists (it must NOT have VITE_ prefix)
- Confirm NO variable named `VITE_JWT_SECRET` exists
- Confirm NO variable named `VITE_PAJCASH_API_KEY` exists

2. Click "Redeploy" after updating all variables

---

## DIRECTIVE 04 — GitHub repository security hardening
**Owner:** Mobot (repo admin)
**Priority:** High
**Time:** 20 minutes

### Steps:

**A. Enable GitHub Secret Scanning (already on for public repos — verify it's active)**
1. github.com/marhshallpresson/tip-lnk → Settings → Security → Code security
2. Confirm "Secret scanning" shows as enabled
3. Check "Secret scanning alerts" for any detected secrets in commit history
4. If any alerts exist, rotate that credential immediately (Directive 01) then dismiss the alert

**B. Enable Dependabot**
1. Settings → Security → Dependabot alerts → Enable
2. Settings → Security → Dependabot security updates → Enable
3. Create `.github/dependabot.yml` in the repo:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    groups:
      solana:
        patterns:
          - "@solana/*"
          - "@bonfida/*"
    ignore:
      - dependency-name: "@solana/web3.js"
        update-types: ["version-update:semver-minor"]
        # Always review Solana updates manually — supply chain risk
```

**C. Set branch protection on main**
1. Settings → Branches → Add rule → Branch name: `main`
2. Enable: "Require a pull request before merging"
3. Enable: "Require status checks to pass" (add your build check once CI is set up)
4. Enable: "Require linear history"
5. Enable: "Include administrators"

**D. Scan git history for exposed secrets (run locally)**
```bash
# Install truffleHog
pip install trufflehog3

# Scan all commits
trufflehog3 git file://. --since-commit HEAD~10

# Alternative with git-secrets
git log --all -p | grep -iE "(service_role|private_key|smtp_pass|api_key\s*=\s*['\"])" | head -30
```
If anything is found: rotate that credential, then use BFG Repo Cleaner to purge
the secret from git history. Contact GitHub support if needed for forced pushes.

---

## DIRECTIVE 05 — Solana RPC upgrade (Helius or Alchemy)
**Owner:** Mobot
**Priority:** Medium — affects reliability and MEV protection
**Time:** 30 minutes
**Why this matters:** Public Solana mainnet RPC (`api.mainnet-beta.solana.com`)
has rate limits, no MEV protection, and no uptime guarantees. A dedicated RPC
is necessary before public launch.

### Steps:
1. Create a free account at helius.dev (recommended for Solana-native features)
   OR alchemy.com/solana
2. Create a new app → select Solana Mainnet
3. Copy your RPC endpoint URL (format: `https://mainnet.helius-rpc.com/?api-key=...`)
4. Add to Vercel env vars as `VITE_SOLANA_RPC_URL` (this one is safe as VITE_ because
   it's a public RPC endpoint — but use a restricted key with domain allowlist)
5. In the Helius/Alchemy dashboard, restrict the API key to only your domain:
   `https://tip-lnk.vercel.app`
6. In your code, find where the Solana Connection is initialised:
   ```ts
   // Should look like:
   const connection = new Connection(import.meta.env.VITE_SOLANA_RPC_URL, 'confirmed')
   ```
   Confirm the commitment level is `'confirmed'` not `'processed'` (safer for
   financial transactions — less chance of reading uncommitted state)

---

## DIRECTIVE 06 — Pajcash NGN payout flow validation
**Owner:** Mobot
**Priority:** High — must be done before enabling real payouts
**Time:** 1–2 hours
**Why AI can't do this:** Requires Pajcash merchant account access + manual test transfers

### Steps:

**A. Sandbox testing**
1. Log in to Pajcash merchant portal
2. Switch to Sandbox/Test mode
3. Create a test payout for a small NGN amount (e.g. ₦100)
4. Verify the webhook your server receives is properly signed:
   - Pajcash should sign webhooks with an HMAC-SHA256 header
   - Your server must verify this signature before processing any payout:
   ```ts
   import crypto from 'crypto'
   
   function verifyPajcashWebhook(payload: string, signature: string, secret: string): boolean {
     const expected = crypto
       .createHmac('sha256', secret)
       .update(payload)
       .digest('hex')
     return crypto.timingSafeEqual(
       Buffer.from(expected, 'hex'),
       Buffer.from(signature, 'hex')
     )
   }
   ```
5. Test the full flow: SOL tip received → USDC swap via DFlow → NGN payout via Pajcash
6. Verify NGN arrives in test bank account before enabling production

**B. Production safeguards**
1. Set a maximum single-payout limit (e.g. ₦500,000 per transaction)
2. Set a daily payout limit per creator (e.g. ₦2,000,000)
3. Implement a 24-hour holding period for first-time payouts from new creators
4. Add email notification to creator on every payout attempt (success and failure)
5. Log every payout attempt in the `payouts` table with: amount, wallet, timestamp,
   Pajcash reference ID, status

---

## DIRECTIVE 07 — Custom domain and SSL setup
**Owner:** Mobot
**Priority:** Medium — required before marketing launch
**Time:** 30 minutes

### Steps:
1. In Vercel project → Settings → Domains
2. Add your custom domain (e.g. `tiplnk.xyz` or `tip.lnk`)
3. Follow Vercel's DNS instructions — add the CNAME/A record in your DNS provider
4. Vercel provisions SSL automatically via Let's Encrypt
5. Set `www` redirect → apex domain
6. Update `JWT_ISSUER` env var to match new domain
7. Update `VITE_APP_URL` to new domain
8. Update the CSP `connect-src` in `vercel.json` to include new domain
9. Update Phantom SDK's registered dApp origin to new domain (in Phantom developer portal)
10. Verify HSTS is active: `curl -sI https://yourdomain.com | grep strict-transport`

---

## DIRECTIVE 08 — Pre-launch security checklist (human sign-off required)
**Owner:** Mobot
**Priority:** Must complete before any public launch or creator onboarding
**Time:** 2–3 hours

Sign off each item personally before enabling real-money flows:

**Credential security**
- [ ] All secrets rotated (Directive 01 complete)
- [ ] No VITE_ prefixed secret variables in Vercel
- [ ] Git history scanned — no exposed secrets
- [ ] .gitignore confirmed to cover .env, .env.local, .env.production

**Database security**
- [ ] RLS enabled on all Supabase tables (Directive 02 complete)
- [ ] Tested with anon key — returns empty arrays on all tables
- [ ] service_role key never appears in any built JS bundle

**Blockchain security**
- [ ] @solana/web3.js pinned to 1.95.8 (not a caret range)
- [ ] package-lock.json committed
- [ ] Wallet connection tested on mainnet with real SOL (small amount)
- [ ] SNS names resolved correctly for test creator accounts
- [ ] Transaction simulation passes before actual sign prompt

**Payout security**
- [ ] Pajcash sandbox test payout successful (Directive 06A complete)
- [ ] Webhook signature verification implemented and tested
- [ ] Payout limits configured
- [ ] First-payout holding period implemented

**Infrastructure**
- [ ] Security headers present (curl confirms CSP, X-Frame, HSTS)
- [ ] Custom domain live with SSL (Directive 07 complete)
- [ ] Vercel env vars correct — no local dev values in production
- [ ] Rate limiting active on all /api/* routes

**Final go/no-go:**
Only proceed to public launch when ALL items above are checked.
If any item cannot be completed, document the reason and get a second opinion.

---

## ESCALATION CONTACTS

| Issue | Contact |
|---|---|
| Supabase incident | support.supabase.com |
| Vercel deployment emergency | vercel.com/support |
| Solana network issue | status.solana.com |
| Pajcash payment failure | Your Pajcash account manager |
| Security breach (keys exposed) | Rotate keys immediately, then audit |

---
*Document maintained by Gaan Digitals for TipLnk. Review before each major release.*
