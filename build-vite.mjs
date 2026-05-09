process.env.NODE_ENV = 'production';

const localUrlPattern = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/.*)?$/i;
if (!process.env.VITE_API_BASE_URL || localUrlPattern.test(process.env.VITE_API_BASE_URL)) {
  process.env.VITE_API_BASE_URL = '';
}

if (process.argv.includes('--debug')) {
  process.env.DEBUG = process.env.DEBUG || 'vite:*';
}

const { build } = await import('vite');
const { copyFile, mkdir } = await import('fs/promises');
const { join } = await import('path');

await build({ mode: 'production' });

// Ensure public assets are correctly placed for CDN delivery
try {
  await copyFile('public/widget.js', 'dist/widget.js');
  console.log('✅ widget.js copied to dist/');
} catch (err) {
  console.error('❌ Failed to copy widget.js:', err.message);
}
