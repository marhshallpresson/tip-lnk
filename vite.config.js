import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util', 'string_decoder'],
    }),
    {
      name: 'dynamic-qrcode-fix',
      enforce: 'pre',
      resolveId(source, importer, options) {
        if (source === 'qrcode' && importer && importer.includes('@dynamic-labs')) {
          return this.resolve('qrcode', importer, { skipSelf: true, ...options });
        }
        return null;
      },
    },
  ],
  define: {
    'global': 'globalThis',
  },
  optimizeDeps: {
    include: [
      '@dynamic-labs/sdk-react-core',
      '@dynamic-labs/solana',
      '@dynamic-labs/wallet-connector-core',
      '@dynamic-labs/sdk-api-core',
      '@dynamic-labs/multi-wallet',
      '@dynamic-labs/iconic',
      'string_decoder',
      '@phantom/client',
      '@phantom/openapi-wallet-service'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
    exclude: ['@solana/web3.js', 'tweetnacl']
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1500,
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
        entryFileNames: 'assets/[name]-[hash].js'
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
