import app from './app.js';
import { db, initSchema } from './lib/db.js';
import { logError, serializeError } from './lib/logger.js';

const PORT = Number(process.env.PORT || process.env.API_PORT || 3005);

async function start() {
  try {
    console.log('Initializing database...');
    await initSchema();
    console.log('Database initialized.');

    app.listen(PORT, () => {
      console.log(`TipLnk Auth Backend ready on port ${PORT}`);
    });
  } catch (err) {
    logError('server_startup_error', { error: serializeError(err) });
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  logError('unhandled_rejection', { error: serializeError(reason) });
});

process.on('uncaughtException', (err) => {
  logError('uncaught_exception', { error: serializeError(err) });
  process.exit(1);
});

start();
