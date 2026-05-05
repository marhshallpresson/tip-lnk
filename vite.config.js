import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util', 'string_decoder', 'process', 'events'],
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
      'bs58'
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
      include: [/node_modules/],
    },
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        if (warning.message.includes('contains an annotation that Rollup cannot interpret')) return;
        warn(warning);
      },
      external: (id) => {
        const serverOnly = ['bcryptjs', 'nodemailer', 'express', 'pg', 'knex', 'sqlite3'];
        return serverOnly.some(pkg => id.includes(pkg)) || id.startsWith('@reown') || id.startsWith('@trezor');
      },
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@solana') || id.includes('@coral-xyz')) {
              return 'vendor-solana';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('@phantom') || id.includes('@dynamic') || id.includes('@walletconnect')) {
              return 'vendor-wallets';
            }
            if (id.includes('@kamino-finance') || id.includes('@jup-ag')) {
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
      bs58: path.resolve(__dirname, 'node_modules/bs58/src/cjs/index.cjs'),
    },
  },
});
