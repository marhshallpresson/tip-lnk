import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util', 'string_decoder', 'process', 'events'],
    }),
  ],
  define: {
    'global': 'globalThis',
    // PATCH: Intercept hardcoded browser-side node_modules references that cause 404s
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  optimizeDeps: {
    include: [
      '@dynamic-labs/sdk-react-core',
      '@dynamic-labs/solana',
      '@dynamic-labs/wallet-connector-core',
      '@dynamic-labs/sdk-api-core',
      '@dynamic-labs/multi-wallet',
      '@dynamic-labs/iconic',
      '@dynamic-labs/sdk-react-core/src/lib/views/WaasUpgradeView/WaasUpgradeView',
      '@dynamic-labs/sdk-react-core/src/lib/utils/hooks/useUpgradeEmbeddedWallet/useUpgradeEmbeddedWallet',
      '@dynamic-labs/sdk-react-core/src/lib/utils/hooks/useUpgradeToDynamicWaasFlow/useUpgradeToDynamicWaasFlow',
      '@dynamic-labs/sdk-react-core/src/lib/views/AccountUpgradedView/AccountUpgradedView',
      '@dynamic-labs/sdk-react-core/src/lib/views/WalletUpgradeFlowView/WalletUpgradeFlowView',
      '@dynamic-labs/sdk-api-core/src/models/UpgradeEmbeddedWalletToV2Request',
      'string_decoder',
      '@phantom/client',
      '@phantom/openapi-wallet-service',
      'rpc-websockets',
      'eventemitter3',
      'jayson',
      'react-dom/client',
      'qrcode'
    ],
    exclude: [
      '@solana/web3.js', 
      'tweetnacl'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 2000,
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/@dynamic-labs/, /node_modules/],
    },
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        if (warning.message.includes('contains an annotation that Rollup cannot interpret')) return;
        warn(warning);
      },
      external: (id) => {
        const serverOnly = ['bcryptjs', 'nodemailer', 'express', 'pg', 'knex', 'sqlite3'];
        return serverOnly.some(pkg => id.includes(pkg));
      },
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        manualChunks(id) {
          if (id.includes('@dynamic-labs')) {
            return 'dynamic-sdk';
          }
        }
      },
    }
  },
  base: '/',
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      string_decoder: 'string_decoder',
    },
  },
});
