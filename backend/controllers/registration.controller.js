import {
  sendRegistrationOTP,
  verifyRegistrationOTP,
} from "../services/registration.service.js";

/**
 * POST /api/registration/send-otp
 * Sends a 6-digit OTP to the given email for registration verification.
 */
export async function sendOTP(req, res) {
  const { email } = req.body || {};

  if (!email) {
    return res
      .status(400)
      .json({ success: false, error: "Email is required." });
  }

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res
      .status(400)
      .json({ success: false, error: "Please enter a valid email address." });
  }

  try {
    const result = await sendRegistrationOTP(email.trim());
    return res.json({
      success: true,
      message: "A verification code has been sent to your email.",
      provider: result.provider,
    });
  } catch (error) {
    console.error("Send OTP Error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to send the verification code.",
    });
  }
}

/**
 * POST /api/registration/verify-otp
 * Verifies the 6-digit OTP for the given email.
 */
export async function verifyOTP(req, res) {
  const { email, otp } = req.body || {};

  if (!email || !otp) {
    return res
      .status(400)
      .json({ success: false, error: "Email and OTP code are required." });
  }

  try {
    const valid = await verifyRegistrationOTP(email.trim(), otp.trim());
    if (!valid) {
      return res.status(400).json({
        success: false,
        error: "The verification code is invalid or has expired.",
      });
    }

    return res.json({
      success: true,
      message: "Email verified successfully.",
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Verification failed.",
    });
  }
}