import { Router } from "express";
import {
  verifyCaptcha,
  getLoginStatus,
  recordLoginFailure,
  recordLoginSuccess,
} from "../controllers/captcha.controller.js";

const router = Router();

// POST /api/auth/verify-captcha - verify a Google reCAPTCHA v2 token
router.post("/verify-captcha", verifyCaptcha);

// GET /api/auth/login-status & POST /api/auth/login-status - get failed attempt / captcha requirement status
router.get("/login-status", getLoginStatus);
router.post("/login-status", getLoginStatus);

// POST /api/auth/record-login-failure - record a failed login attempt
router.post("/record-login-failure", recordLoginFailure);

// POST /api/auth/record-login-success - record a successful login and reset counter
router.post("/record-login-success", recordLoginSuccess);

export default router;