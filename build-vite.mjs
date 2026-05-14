import { spawn } from 'child_process';

/**
 * Proxy build script for Vercel
 * Executes vite build using the current config.
 */
console.log('🚀 Launching Vite Build Proxy...');

const vite = spawn('npx', ['vite', 'build'], { 
  stdio: 'inherit', 
  shell: true,
  env: { ...process.env, NODE_ENV: 'production' }
});

vite.on('exit', (code) => {
  if (code === 0) {
    console.log('✅ Build completed successfully.');
  } else {
    console.error(`❌ Build failed with exit code ${code}`);
  }
  process.exit(code);
});
