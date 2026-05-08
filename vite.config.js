import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import wasm from "vite-plugin-wasm";
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => {
  const nodeEnv = command === 'build' ? 'production' : (process.env.NODE_ENV || 'development');
  process.env.NODE_ENV = nodeEnv;

  return {
  plugins: [
    react(),
    wasm(),
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
    'process.env.NODE_ENV': JSON.stringify(nodeEnv),
  },
  esbuild: command === 'build' ? {
    jsxDev: false,
  } : undefined,
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
      '@dynamic-labs/sdk-react-core',
      '@dynamic-labs/sdk-api-core',
      '@dynamic-labs/solana',
      '@dynamic-labs/ethereum',
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
    chunkSizeWarningLimit: 8000,
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
        const normalizedId = id.replace(/\\/g, '/');
        return serverOnly.some(pkg =>
          id === pkg ||
          id.startsWith(`${pkg}/`) ||
          normalizedId.includes(`/node_modules/${pkg}/`)
        );
      },
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        manualChunks(id) {
          if (id.includes('node_modules')) {
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
  };
});
