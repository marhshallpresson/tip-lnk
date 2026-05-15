import { Router, type IRouter } from "express";

const router: IRouter = Router();

const handler = (_req: any, res: any) => {
  res.json({ status: "ok" });
};

router.get("/", handler);
router.get("/health", handler);
router.get("/healthz", handler);

export default router;
