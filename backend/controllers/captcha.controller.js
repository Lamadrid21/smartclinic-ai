import config from "../config/env.js";

/**
 * Verify a Google reCAPTCHA v2 token server-side.
 * Never trusts the client — always checks with Google's siteverify endpoint.
 *
 * Returns the Google verification result (an object) or throws an Error
 * when no secret key is configured.
 */
async function verifyWithGoogle(token) {
  const secret = config.recaptchaSecretKey;
  if (!secret) {
    throw new Error(
      "RECAPTCHA_SECRET_KEY is not configured on the backend/server."
    );
  }

  const params = new URLSearchParams({
    secret,
    response: token,
  });

  const response = await fetch(
    "https://www.google.com/recaptcha/api/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Google reCAPTCHA verification request failed (HTTP ${response.status}).`
    );
  }

  return response.json();
}

/**
 * POST /api/auth/verify-captcha
 * Body: { token }
 *
 * Response:
 *   { success: true }                      — CAPTCHA passed
 *   { success: false, error: "..." }       — CAPTCHA rejected with 400/403
 *
 * Deliberately maps every Google failure to a clean, user-facing message
 * and never leaks the secret key or internal details.
 */
export async function verifyCaptcha(req, res) {
  const { token } = req.body || {};

  // 1) Missing token → reject immediately.
  if (!token || typeof token !== "string" || !token.trim()) {
    return res.status(400).json({
      success: false,
      error: "Please complete the CAPTCHA.",
    });
  }

  try {
    const result = await verifyWithGoogle(token.trim());

    // 2) Backend says the CAPTCHA failed.
    if (!result.success) {
      console.warn("[reCAPTCHA] Verification failed:", result?.["error-codes"]);

      // Reject expired/invalid tokens with a specific message.
      const hasExpiredOrInvalid =
        Array.isArray(result?.["error-codes"]) &&
        (result["error-codes"].includes("timeout-or-duplicate") ||
          result["error-codes"].includes("invalid-input-response"));

      return res.status(400).json({
        success: false,
        error: hasExpiredOrInvalid
          ? "CAPTCHA verification expired. Please try again."
          : "CAPTCHA verification failed. Please try again.",
      });
    }

    // 3) Passed — the frontend may now continue with Supabase auth.
    return res.json({ success: true });
  } catch (error) {
    console.error("[reCAPTCHA] verify error:", error);

    // Do not expose Google's internal error or the missing-secret reason.
    return res.status(500).json({
      success: false,
      error: "CAPTCHA verification failed. Please try again.",
    });
  }
}