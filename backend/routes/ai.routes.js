import { Router } from "express";
import { chat, matchSpecialty } from "../controllers/ai.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// POST /api/ai - SmartClinic AI chat (requires a valid Supabase session)
router.post("/", authenticate, chat);

// POST /api/ai/specialty-match - instant specialty/hint check
router.post("/specialty-match", matchSpecialty);

// GET /api/ai - simple health check
router.get("/", (_req, res) => {
  res.json({ status: "SmartClinic AI API is working" });
});

export default router;