import app from "./_app.js";
import { logger } from "./_lib/logger.js";

const port = process.env.PORT || 5000;

app.listen(port, () => {
  logger.info(`[api-server] API server listening on port ${port}`);
  console.log(`[api-server] API server listening on port ${port}`);
});
