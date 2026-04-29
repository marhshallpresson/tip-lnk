import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util', 'string_decoder'],
    }),
  ],
  define: {
    'global': 'globalThis',
  },
  optimizeDeps: {
    include: [
      '@dynamic-labs/sdk-react-core',
      '@dynamic-labs/solana',
      '@dynamic-labs/wallet-connector-core',
      '@dynamic-labs/sdk-api',
      '@dynamic-labs/multi-wallet'
    ],
    exclude: ['@solana/web3.js', 'tweetnacl']
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1500,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        if (warning.message.includes('contains an annotation that Rollup cannot interpret')) return;
        warn(warning);
      },
      external: (id) => {
        const serverOnly = ['bcryptjs', 'nodemailer', 'express', 'pg', 'knex', 'sqlite3']
        return serverOnly.some(pkg => id.includes(pkg))
      },
      output: {
        manualChunks: {
          'dynamic-sdk': ['@dynamic-labs/sdk-react-core', '@dynamic-labs/solana']
        }
      }
    }
  },
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
