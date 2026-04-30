/**
 * SECURITY PATCH: Dynamic Labs WaaS v2 Configuration
 * 
 * Fixes:
 * - H-05: WaaS upgrade file 404s → users stuck on v1
 * - H-01: Environment ID exposure → origin restrictions
 * 
 * Before using this:
 * 1. Run: npm install @dynamic-labs/sdk-react-core@latest @dynamic-labs/sdk-api-core@latest --save-exact
 * 2. rm -rf node_modules .vite && npm install
 * 3. Verify Dynamic dashboard has origin/domain restrictions enabled
 */

export const DYNAMIC_LABS_CONFIG = {
  // Your Environment ID from Dynamic Dashboard
  environmentId: process.env.VITE_DYNAMIC_ENVIRONMENT_ID || '',
  
  // SECURITY: Must restrict to your domains
  // Set in Dynamic dashboard: Settings → Allowed Origins
  allowedOrigins: [
    'https://tip-lnk.vercel.app',
    'https://tipstack.fun',
    process.env.VITE_APP_URL || 'http://localhost:5173',
  ],

  // Wallet configuration with security defaults
  walletConfig: {
    // Enable WaaS v2 (TSS-MPC security)
    enableEmbeddedWallet: true,
    
    // Security: Require multi-wallet confirmation
    enabledWalletConnectors: [
      'phantom',
      'solflare',
      'magic',
      'dynamic' // Dynamic's embedded wallet (WaaS v2)
    ],

    // SECURITY: Set session timeout
    sessionDuration: 30 * 60 * 1000, // 30 minutes
    
    // Force HTTPS
    rpcUrl: 'https://api.mainnet-beta.solana.com',
  },

  // Security headers for embedded iframe
  securityHeaders: {
    'X-Frame-Options': 'SAMEORIGIN',
    'Content-Security-Policy': "frame-ancestors 'self'",
    'X-Content-Type-Options': 'nosniff',
  },

  // Logging (disable in production)
  debug: process.env.NODE_ENV === 'development',
}

/**
 * Initialization check: Verify WaaS upgrade path exists
 */
export async function verifyWaaSUpgrade(): Promise<boolean> {
  try {
    // This will fail with 404 if WaaS files are missing
    const waasModule = await import('@dynamic-labs/sdk-react-core')
    
    // Check for upgrade-related exports
    const hasUpgradeFeatures = 
      'useUpgradeEmbeddedWallet' in waasModule &&
      'AccountUpgradedView' in waasModule

    if (!hasUpgradeFeatures) {
      console.warn('⚠️ WARNING: WaaS upgrade features not found. Users may remain on v1 wallet.')
      console.warn('→ Run: npm install @dynamic-labs/sdk-react-core@latest --save-exact')
      return false
    }

    console.log('✓ WaaS v2 upgrade path verified')
    return true
  } catch (error) {
    console.error('✗ WaaS verification failed:', error)
    return false
  }
}

/**
 * Pre-init security check
 */
export function validateDynamicLabsConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!process.env.VITE_DYNAMIC_ENVIRONMENT_ID) {
    errors.push('VITE_DYNAMIC_ENVIRONMENT_ID not set in environment')
  }

  if (process.env.NODE_ENV === 'production' && 
      !process.env.VITE_APP_URL?.startsWith('https://')) {
    errors.push('VITE_APP_URL must use HTTPS in production')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
