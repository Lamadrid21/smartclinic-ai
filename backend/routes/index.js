import { Router } from "express";
import aiRouter from "./ai.routes.js";
import peakHoursRouter from "./peakHours.routes.js";
import emailRouter from "./email.routes.js";
import registrationRouter from "./registration.routes.js";
import authRouter from "./auth.routes.js";

const router = Router();

// All backend API endpoints are mounted under /api
router.use("/ai", aiRouter);
router.use("/peak-hours", peakHoursRouter);
router.use("/send-confirmation", emailRouter);
router.use("/registration", registrationRouter);
router.use("/auth", authRouter);

export default router;