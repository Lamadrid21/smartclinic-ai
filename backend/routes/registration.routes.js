import { Router } from "express";
import { sendOTP, verifyOTP } from "../controllers/registration.controller.js";

const router = Router();

// POST /api/registration/send-otp - send a verification code to an email
router.post("/send-otp", sendOTP);

// POST /api/registration/verify-otp - verify the emailed code
router.post("/verify-otp", verifyOTP);

export default router;