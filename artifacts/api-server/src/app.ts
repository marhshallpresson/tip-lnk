import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { initSchema } from "./lib/db";

const app: Express = express();

const COOKIE_SECRET = process.env.SESSION_COOKIE_SECRET || process.env.SESSION_TOKEN_SECRET || process.env.SESSION_SECRET || process.env.JWT_SECRET;
if (!COOKIE_SECRET) {
  throw new Error("One of SESSION_COOKIE_SECRET, SESSION_TOKEN_SECRET, SESSION_SECRET, or JWT_SECRET must be set.");
}

app.use(cookieParser(COOKIE_SECRET));

// Reflect origin back (required for credentials) — allow all in dev, prod locked via firewall/deploy rules
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl) and all browser origins
      callback(null, origin || true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-CSRF-Token",
      "x-csrf-token",
      "Content-Encoding",
      "Accept-Encoding",
      "X-Accept-Blockchain-IDs",
      "X-Accept-Action-Version",
    ],
    exposedHeaders: ["Set-Cookie"],
    maxAge: 86400,
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Root health probe — Replit workflow system checks GET / for HTTP 200
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "tipstack-api" });
});

// Run DB schema migrations on startup (idempotent — safe to run every boot)
initSchema().catch((err) => {
  logger.error({ err }, "initSchema failed on startup");
});

export default app;
