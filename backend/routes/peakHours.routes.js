import { Router } from "express";
import { getPeakHours } from "../controllers/peakHours.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// GET /api/peak-hours - predicted peak clinic hours (requires auth)
router.get("/", authenticate, getPeakHours);

export default router;