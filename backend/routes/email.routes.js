import { Router } from "express";
import { sendConfirmation } from "../controllers/email.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// POST /api/send-confirmation - appointment confirmation email (requires auth)
router.post("/", authenticate, sendConfirmation);

export default router;