import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const COOKIE_SECRET = process.env.SESSION_COOKIE_SECRET || process.env.SESSION_TOKEN_SECRET || process.env.JWT_SECRET || "dev-secret-change-me";

app.use(cookieParser(COOKIE_SECRET));
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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Root health probe — Replit workflow system checks GET / for HTTP 200
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "tipstack-api" });
});

export default app;
