import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});

export const serializeError = (err: unknown) => {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  return { message: String(err) };
};

export const logError = (message: string, meta: Record<string, unknown> = {}) => {
  logger.error({ ...meta }, message);
};

export const log = (level: "info" | "warn" | "error", message: string, meta: Record<string, unknown> = {}) => {
  logger[level]({ ...meta }, message);
};
