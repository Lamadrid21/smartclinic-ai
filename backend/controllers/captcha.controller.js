import config from "../config/env.js";

// Server-side in-memory tracking of consecutive failed login attempts.
// Keyed by IP address and/or normalized email.
const failedAttemptsMap = new Map();

function getClientKey(req, customEmail = "") {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown-ip";

  const rawEmail =
    customEmail ||
    req.body?.email ||
    req.query?.email ||
    "";

  const normalizedEmail = String(rawEmail).toLowerCase().trim();

  return normalizedEmail ? `${ip}:${normalizedEmail}` : ip;
}

// Clean up stale attempt records older than 2 hours.
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of failedAttemptsMap.entries()) {
    if (now - record.lastAttempt > 2 * 60 * 60 * 1000) {
      failedAttemptsMap.delete(key);
    }
  }
}, 15 * 60 * 1000);

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
 * GET or POST /api/auth/login-status
 * Query or Body: { email }
 *
 * Response:
 *   { success: true, failedAttempts: number, captchaRequired: boolean }
 */
export function getLoginStatus(req, res) {
  const key = getClientKey(req);
  const record = failedAttemptsMap.get(key);
  const count = record ? record.count : 0;

  return res.json({
    success: true,
    failedAttempts: count,
    captchaRequired: count >= 10,
  });
}

/**
 * POST /api/auth/record-login-failure
 * Body: { email }
 *
 * Increments the consecutive failed login attempt counter on the server.
 * Response:
 *   { success: true, failedAttempts: number, captchaRequired: boolean }
 */
export function recordLoginFailure(req, res) {
  const key = getClientKey(req);
  const now = Date.now();
  const record = failedAttemptsMap.get(key) || { count: 0, lastAttempt: now };

  record.count += 1;
  record.lastAttempt = now;
  failedAttemptsMap.set(key, record);

  // Also record on pure IP if email was provided
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown-ip";
  if (key !== ip) {
    const ipRecord = failedAttemptsMap.get(ip) || { count: 0, lastAttempt: now };
    ipRecord.count += 1;
    ipRecord.lastAttempt = now;
    failedAttemptsMap.set(ip, ipRecord);
  }

  return res.json({
    success: true,
    failedAttempts: record.count,
    captchaRequired: record.count >= 10,
  });
}

/**
 * POST /api/auth/record-login-success
 * Body: { email }
 *
 * Resets the consecutive failed login attempt counter on the server.
 * Response:
 *   { success: true, failedAttempts: 0, captchaRequired: false }
 */
export function recordLoginSuccess(req, res) {
  const key = getClientKey(req);
  failedAttemptsMap.delete(key);

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown-ip";
  failedAttemptsMap.delete(ip);

  return res.json({
    success: true,
    failedAttempts: 0,
    captchaRequired: false,
  });
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