import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util', 'string_decoder', 'process', 'events'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  define: {
    'global': 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  optimizeDeps: {
    include: [
      'string_decoder',
      '@phantom/client',
      '@phantom/openapi-wallet-service',
      'rpc-websockets',
      'eventemitter3',
      'jayson',
      'react-dom/client',
      'qrcode.react',
      'bs58',
      'buffer',
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
    chunkSizeWarningLimit: 5000,
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
        const serverOnly = ['bcryptjs', 'nodemailer', 'express', 'pg', 'knex', 'sqlite3'];
        return serverOnly.some(pkg => id.includes(pkg));
      },
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // High-level protocol libraries that are large but mostly independent
            if (id.includes('@kamino-finance') || id.includes('@jup-ag') || id.includes('@orca-so')) {
              return 'vendor-defi';
            }
            // Identity and Wallet providers
            if (id.includes('@dynamic-labs') || id.includes('@walletconnect') || id.includes('@reown') || id.includes('@trezor') || id.includes('@ledgerhq')) {
              return 'vendor-auth';
            }
            // Keep core libraries (Solana web3, React, Crypto) together to avoid circular resolution issues
            return 'vendor';
          }
        },
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
      '@kamino-finance/farms-sdk/dist/@codegen/farms/programId': path.resolve(__dirname, 'src/shims/kamino-farms-programId.js'),
    },
  },
});
