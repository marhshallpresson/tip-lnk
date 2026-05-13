import type { VercelRequest, VercelResponse } from "@vercel/node"
import { randomUUID } from "crypto"
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose"
import { db } from "../../_lib/db.js"
import { encrypt, hashAddress } from "../../_lib/crypto.js"
import { createSession, getUserRoles } from "../../_lib/session.js"
import { normalizeEmail, patchResponse, parseProfileData, mergeUserHistory } from "./_utils.js"

type DynamicCredential = {
  id?: unknown
  address?: unknown
  chain?: unknown
  email?: unknown
  format?: unknown
  oauthProvider?: unknown
  oauthDisplayName?: unknown
  oauthEmails?: unknown
  oauthUsername?: unknown
  walletName?: unknown
}

const stringValue = (value: unknown) => (typeof value === "string" ? value.trim() : "")

const verifiedCredentialsFromPayload = (payload: JWTPayload) => {
  const rawPayload = payload as Record<string, unknown>
  const snakeCase = rawPayload.verified_credentials
  const camelCase = rawPayload.verifiedCredentials
  const credentials = Array.isArray(snakeCase) ? snakeCase : Array.isArray(camelCase) ? camelCase : []
  return credentials as DynamicCredential[]
}

const emailFromPayload = (payload: JWTPayload, credentials: DynamicCredential[]) => {
  const directEmail = normalizeEmail((payload as Record<string, unknown>).email)
  if (directEmail) return directEmail

  const credentialEmail = credentials.map((credential) => normalizeEmail(credential.email)).find(Boolean)
  if (credentialEmail) return credentialEmail

  for (const credential of credentials) {
    if (!Array.isArray(credential.oauthEmails)) continue
    const oauthEmail = credential.oauthEmails.map((email) => normalizeEmail(email)).find(Boolean)
    if (oauthEmail) return oauthEmail
  }

  return ""
}

const displayNameFromPayload = (payload: JWTPayload, credentials: DynamicCredential[], email: string) => {
  const rawPayload = payload as Record<string, unknown>
  const givenName = stringValue(rawPayload.givenName)
  const familyName = stringValue(rawPayload.familyName)
  const composedName = [givenName, familyName].filter(Boolean).join(" ").trim()

  return (
    composedName ||
    stringValue(rawPayload.name) ||
    stringValue(rawPayload.alias) ||
    credentials.map((credential) => stringValue(credential.oauthDisplayName)).find(Boolean) ||
    credentials.map((credential) => stringValue(credential.oauthUsername)).find(Boolean) ||
    email.split("@")[0]
  )
}

const isSolanaCredential = (credential: DynamicCredential) => {
  const chain = stringValue(credential.chain).toLowerCase()
  return chain === "sol" || chain === "solana"
}

const primarySolanaWalletFromPayload = (payload: JWTPayload, credentials: DynamicCredential[]) => {
  const lastVerifiedCredentialId = stringValue((payload as Record<string, unknown>).lastVerifiedCredentialId)
  const blockchainCredentials = credentials.filter((credential) => {
    return stringValue(credential.address) && stringValue(credential.format).toLowerCase() === "blockchain"
  })

  const lastCredential = blockchainCredentials.find((credential) => stringValue(credential.id) === lastVerifiedCredentialId)
  if (lastCredential && isSolanaCredential(lastCredential)) return stringValue(lastCredential.address)

  const solanaCredential = blockchainCredentials.find(isSolanaCredential)
  if (solanaCredential) return stringValue(solanaCredential.address)

  const verifiedAccount = (payload as Record<string, any>).verifiedAccount
  if (verifiedAccount && typeof verifiedAccount === "object") {
    const verifiedAccountCredential = verifiedAccount as DynamicCredential
    if (isSolanaCredential(verifiedAccountCredential)) return stringValue(verifiedAccountCredential.address)
  }

  const blockchainAccounts = (payload as Record<string, any>).blockchainAccounts
  if (Array.isArray(blockchainAccounts)) {
    const account = (blockchainAccounts as DynamicCredential[]).find(isSolanaCredential)
    if (account) return stringValue(account.address)
  }

  return ""
}

const findWalletUser = async (trx: any, walletAddress: string, walletAddressHash: string) => {
  if (!walletAddress || !walletAddressHash) return null
  return trx("user")
    .whereNull("deletedAt")
    .where((builder: any) => {
      builder.where({ walletAddressHash: walletAddressHash }).orWhere({ walletAddress })
    })
    .first()
}

const ensureUserRole = async (trx: any, userId: string) => {
  const role = await trx("roles").where({ name: "user" }).first()
  if (!role) return

  await trx("user_roles")
    .insert({ userId, roleId: role.id })
    .onConflict(["userId", "roleId"])
    .ignore()
    .catch(() => null)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" })
  patchResponse(res)

  const dynamicJwt = stringValue(req.body?.dynamicJwt)
  const envId = stringValue(process.env.VITE_DYNAMIC_ENVIRONMENT_ID)

  if (!dynamicJwt || !envId) {
    return res.status(400).json({ success: false, error: "Missing Dynamic credentials or server config." })
  }

  try {
    const jwks = createRemoteJWKSet(new URL(`https://app.dynamic.xyz/api/v0/sdk/${envId}/.well-known/jwks`))
    const { payload } = await jwtVerify(dynamicJwt, jwks, {
      issuer: [`app.dynamic.xyz/${envId}`, `https://app.dynamic.xyz/${envId}`],
    })

    if ((payload as Record<string, unknown>).environmentId && (payload as Record<string, unknown>).environmentId !== envId) {
      return res.status(401).json({ success: false, error: "Invalid Dynamic token." })
    }

    const scopesValue = (payload as Record<string, unknown>).scopes
    const scopes = Array.isArray(scopesValue)
      ? scopesValue.map((scope) => stringValue(scope))
      : stringValue(scopesValue).split(/\s+/).filter(Boolean)
    if (scopes.includes("requiresAdditionalAuth")) {
      return res.status(403).json({ success: false, error: "Additional Dynamic verification is required." })
    }

    const dynamicUserId = stringValue(payload.sub)
    const credentials = verifiedCredentialsFromPayload(payload)
    const email = emailFromPayload(payload, credentials)
    const name = displayNameFromPayload(payload, credentials, email)
    const primaryWallet = primarySolanaWalletFromPayload(payload, credentials)
    const walletAddressHash = primaryWallet ? hashAddress(primaryWallet) : ""
    const encryptedWalletAddress = primaryWallet ? encrypt(primaryWallet) : ""

    if (!dynamicUserId || !email) {
      return res.status(400).json({ success: false, error: "Verified email required from Dynamic." })
    }

    const now = new Date()
    const user = await db.transaction(async (trx) => {
      let targetUser = await trx("user")
        .whereNull("deletedAt")
        .whereRaw("LOWER(email) = ?", [email])
        .first()

      const walletUser = primaryWallet ? await findWalletUser(trx, primaryWallet, walletAddressHash) : null

      if (walletUser && targetUser && walletUser.id !== targetUser.id) {
        const walletUserEmail = normalizeEmail(walletUser.email)
        if (walletUserEmail && walletUserEmail !== email) {
          throw Object.assign(new Error("wallet_conflict"), { statusCode: 409 })
        }
        await mergeUserHistory(trx, walletUser, targetUser)
      } else if (!targetUser && walletUser) {
        const walletUserEmail = normalizeEmail(walletUser.email)
        if (walletUserEmail && walletUserEmail !== email) {
          throw Object.assign(new Error("wallet_conflict"), { statusCode: 409 })
        }
        targetUser = walletUser
      }

      const dynamicProfile = {
        dynamic_user_id: dynamicUserId,
        dynamic_session_id: stringValue((payload as Record<string, unknown>).sid) || null,
        dynamic_email: email,
        dynamic_last_login_at: now.toISOString(),
        dynamic_last_verified_credential_id: stringValue((payload as Record<string, unknown>).lastVerifiedCredentialId) || null,
      }

      // ─── ELITE IDENTITY SYNC: SOCIAL HANDLES ───
      const twitterHandle = credentials.find(c => stringValue(c.oauthUsername) && stringValue(c.oauthProvider) === 'twitter')?.oauthUsername as string;
      const discordHandle = credentials.find(c => stringValue(c.oauthUsername) && stringValue(c.oauthProvider) === 'discord')?.oauthUsername as string;

      if (!targetUser) {
        console.log(`👤 Dynamic Auth: Creating new user record for ${email}`);
        const userId = randomUUID()
        await trx("user").insert({
          id: userId,
          email,
          name,
          emailVerifiedAt: now,
          walletAddressHash: walletAddressHash || null,
          encryptedWalletAddress: encryptedWalletAddress || null,
          twitterHandle: twitterHandle || null,
          discordHandle: discordHandle || null,
          profileData: JSON.stringify(dynamicProfile),
          lastLoginAt: now,
          created_at: now,
          updated_at: now,
          onboardingComplete: false // New users must onboard
        })
        await ensureUserRole(trx, userId)
        return trx("user").where({ id: userId }).first()
      }

      console.log(`👤 Dynamic Auth: Identified existing user ${targetUser.id} for ${email}`);
      console.log(`🔍 Existing Profile Data for ${targetUser.id}:`, targetUser.profileData);

      const existingProfile = parseProfileData(targetUser.profileData)
      const sourceProfile = walletUser && walletUser.id !== targetUser.id ? parseProfileData(walletUser.profileData) : {}
      const profileData = {
        ...sourceProfile,
        ...existingProfile,
        ...dynamicProfile,
      }

      const updates: Record<string, unknown> = {
        email,
        name: targetUser.name || name,
        emailVerifiedAt: targetUser.emailVerifiedAt || now,
        twitterHandle: targetUser.twitterHandle || twitterHandle || null,
        discordHandle: targetUser.discordHandle || discordHandle || null,
        profileData: JSON.stringify(profileData),
        lastLoginAt: now,
        updated_at: now,
      }

      // IDENTITY HEURISTICS: 
      // Automatically finalize onboarding for existing users with sufficient identity data.
      if (targetUser.name || targetUser.solDomain || targetUser.onboardingComplete) {
          console.log(`✅ Identity Heuristic: Marking onboarding as complete for ${targetUser.id} due to existing identity data.`);
          updates.onboardingComplete = true;
      }

      // ─── ELITE SECURITY: WALLET PRIVACY SYNC ───
      // Always ensure the hashed and encrypted wallet fields are populated if Dynamic provides a wallet,
      // bridging the gap for legacy users who only had plaintext walletAddress.
      if (primaryWallet) {
        if (!targetUser.walletAddressHash) updates.walletAddressHash = walletAddressHash;
        if (!targetUser.encryptedWalletAddress) updates.encryptedWalletAddress = encryptedWalletAddress;
      }

      if (walletUser && walletUser.id !== targetUser.id && Boolean(walletUser.onboardingComplete) && !targetUser.onboardingComplete) {
        updates.onboardingComplete = true
      }

      await trx("user").where({ id: targetUser.id }).update(updates)
      await ensureUserRole(trx, targetUser.id)
      return trx("user").where({ id: targetUser.id }).first()
    })

    const session = await createSession(req as any, res as any, user.id)
    const roles = await getUserRoles(user.id)
    const maskedWalletAddress = primaryWallet ? `${primaryWallet.slice(0, 4)}...${primaryWallet.slice(-4)}` : null

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        full_name: user.name,
        first_name: user.name ? user.name.split(" ")[0] : null,
        walletAddress: maskedWalletAddress,
        roles,
        emailVerifiedAt: user.emailVerifiedAt,
        onboardingComplete: Boolean(user.onboardingComplete),
        onboarding_complete: Boolean(user.onboardingComplete),
      },
      auth: {
        accessToken: session.accessToken,
        tokenType: "Bearer",
        expiresAt: session.expiresAt.toISOString(),
      },
    })
  } catch (err: any) {
    if (err?.statusCode === 409 || err?.message === "wallet_conflict") {
      return res.status(409).json({ success: false, error: "Dynamic wallet is already linked to another account." })
    }

    console.error("Dynamic verification failed:", err?.message || err)
    return res.status(401).json({ success: false, error: "Invalid Dynamic token." })
  }
}
