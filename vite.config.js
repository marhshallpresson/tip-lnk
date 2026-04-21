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
  optimizeDeps: {
    exclude: ['@solana/web3.js', 'tweetnacl']
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      external: (id) => {
        const serverOnly = ['bcryptjs', 'nodemailer', 'express', 'pg', 'knex', 'sqlite3']
        return serverOnly.some(pkg => id.includes(pkg))
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
