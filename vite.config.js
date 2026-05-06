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
    }),
  ],
  define: {
    'global': 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'Buffer': ['buffer', 'Buffer'],
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
            // Group Solana and its fundamental crypto/math dependencies together
            // to prevent circularity between the solana chunk and core deps.
            if (
              id.includes('@solana') || 
              id.includes('@coral-xyz') || 
              id.includes('bn.js') || 
              id.includes('bs58') || 
              id.includes('tweetnacl') || 
              id.includes('buffer') ||
              id.includes('crypto-browserify') ||
              id.includes('stream-browserify') ||
              id.includes('events') ||
              id.includes('util')
            ) {
              return 'vendor-solana';
            }
            if (id.includes('react') || id.includes('scheduler') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('@phantom') || id.includes('@dynamic') || id.includes('@walletconnect') || id.includes('@reown')) {
              return 'vendor-wallets';
            }
            if (id.includes('@kamino-finance') || id.includes('@jup-ag') || id.includes('@orca-so')) {
              return 'vendor-defi';
            }
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
