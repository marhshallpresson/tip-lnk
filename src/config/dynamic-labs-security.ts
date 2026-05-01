/**
 * Dynamic Labs Security Configuration
 * Handles wallet authentication, MPC wallet provisioning, and security settings
 */

export const DYNAMIC_CONFIG = {
  // Environment configuration
  environment: {
    id: import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID,
    apiKey: import.meta.env.VITE_DYNAMIC_API_KEY,
  },

  // Wallet configuration
  wallet: {
    // MPC Wallet settings
    mpc: {
      enabled: true,
      autoConnect: false,
      embedded: true,
      allowRecovery: true,
    },
    
    // External wallet support
    external: {
      phantom: true,
      solflare: true,
      magicEden: true,
      backpack: true,
    },

    // Disable WaaS upgrade features to prevent 404 errors
    waas: {
      enabled: false,
      upgradeEnabled: false,
    },

    // Default chain
    defaultChain: 'SOL',
    supportedChains: ['SOL'],
  },

  // Security settings
  security: {
    // Email verification
    emailVerification: {
      required: false,
      sendConfirmation: true,
    },

    // Social recovery
    socialRecovery: {
      enabled: true,
      providers: ['google', 'github', 'twitter'],
    },

    // Session management
    session: {
      timeout: 3600000, // 1 hour in ms
      refreshInterval: 300000, // 5 minutes
      storageType: 'localStorage',
    },

    // Rate limiting
    rateLimiting: {
      enabled: true,
      maxLoginAttempts: 5,
      lockoutDuration: 900000, // 15 minutes
    },

    // Two-factor authentication
    twoFactor: {
      enabled: false,
      methods: ['email', 'authenticator'],
    },
  },

  // UI Configuration
  ui: {
    theme: 'dark',
    logo: '/logo.svg',
    signupFlow: 'email-first',
    showSignupForm: true,
    // Disable WaaS related UI
    showWaasUpgrade: false,
  },

  // Callbacks
  callbacks: {
    onConnect: (wallet) => {
      console.log('Wallet connected:', wallet);
    },
    onDisconnect: () => {
      console.log('Wallet disconnected');
    },
    onError: (error) => {
      console.error('Auth error:', error);
    },
  },
};

export const DYNAMIC_LABS_CONFIG = DYNAMIC_CONFIG;
export const initializeDynamicLabs = () => {
  if (!DYNAMIC_CONFIG.environment.id) {
    console.warn('Dynamic Labs environment ID not configured');
  }
  return DYNAMIC_CONFIG;
};

export default DYNAMIC_CONFIG;
