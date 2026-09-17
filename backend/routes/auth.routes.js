import { Router } from "express";
import { verifyCaptcha } from "../controllers/captcha.controller.js";

const router = Router();

// POST /api/auth/verify-captcha - verify a Google reCAPTCHA v2 token
router.post("/verify-captcha", verifyCaptcha);

export default router;