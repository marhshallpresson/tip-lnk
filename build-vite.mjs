process.env.NODE_ENV = 'production';

const localUrlPattern = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/.*)?$/i;
if (!process.env.VITE_API_BASE_URL || localUrlPattern.test(process.env.VITE_API_BASE_URL)) {
  process.env.VITE_API_BASE_URL = '';
}

if (process.argv.includes('--debug')) {
  process.env.DEBUG = process.env.DEBUG || 'vite:*';
}

const { build } = await import('vite');

await build({ mode: 'production' });
