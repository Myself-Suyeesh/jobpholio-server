import { Router, Request, Response } from "express";
import { getDatabaseHealth } from "../config/database.js";
import authRouter from "../modules/auth/auth.routes.js";
import sessionsRouter from "../modules/auth/sessions.routes.js";
import profileRouter from "../modules/profile/profile.routes.js";
import applicationRouter from "../modules/applications/application.routes.js";
import calendarRouter from "../modules/calendar/calendar.routes.js";
import dashboardRouter from "../modules/dashboard/dashboard.routes.js";

const router = Router();

// Health Check Endpoint
router.get("/health", (_req: Request, res: Response) => {
  const dbHealth = getDatabaseHealth();

  res.status(dbHealth.connected ? 200 : 503).json({
    status: dbHealth.connected ? "ok" : "degraded",
    service: "JobPholio Backend API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    database: dbHealth,
  });
});

// API v1 Sub-Router Mount Point
const v1Router = Router();

v1Router.get("/ping", (_req: Request, res: Response) => {
  res.json({ success: true, data: { message: "pong" } });
});

v1Router.use("/auth", authRouter);
v1Router.use("/sessions", sessionsRouter);
v1Router.use("/profile", profileRouter);
v1Router.use("/applications", applicationRouter);
v1Router.use("/calendar", calendarRouter);
v1Router.use("/dashboard", dashboardRouter);

router.use("/api/v1", v1Router);
router.get("/", (_req, res) => {
  res.send("<h1>JobPholio Backend is running</h1>");
});

export default router;
