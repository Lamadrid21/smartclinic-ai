import config from "../config/env.js";
import { getAdminClient } from "../services/supabase.js";

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
export async function getLoginStatus(req, res) {
  const key = getClientKey(req);
  let count = 0;

  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("login_attempts")
      .select("failed_count, last_failed_at")
      .eq("key", key)
      .maybeSingle();

    if (error) {
      console.error("[LoginStatus] Error reading login attempts:", error);
    } else if (data) {
      const now = Date.now();
      const lastFailedTime = new Date(data.last_failed_at).getTime();
      const isExpired = (now - lastFailedTime) > 2 * 60 * 60 * 1000;
      count = isExpired ? 0 : (data.failed_count || 0);
    }
  } catch (err) {
    console.error("[LoginStatus] Unexpected error:", err);
  }

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
export async function recordLoginFailure(req, res) {
  const key = getClientKey(req);
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown-ip";

  const keysToUpdate = [key];
  if (key !== ip) {
    keysToUpdate.push(ip);
  }

  let latestCount = 1;

  try {
    const supabase = getAdminClient();

    // Opportunistic cleanup of rows older than 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    await supabase
      .from("login_attempts")
      .delete()
      .lt("last_failed_at", twoHoursAgo);

    const now = new Date().toISOString();
    const nowMs = Date.now();

    for (const k of keysToUpdate) {
      const { data: existing, error: selectError } = await supabase
        .from("login_attempts")
        .select("failed_count, last_failed_at")
        .eq("key", k)
        .maybeSingle();

      if (selectError) {
        console.error("[RecordLoginFailure] Error selecting login attempt for key", k, selectError);
      }

      let count = 1;
      if (existing) {
        const lastFailedTime = new Date(existing.last_failed_at).getTime();
        const isExpired = (nowMs - lastFailedTime) > 2 * 60 * 60 * 1000;
        count = isExpired ? 1 : (existing.failed_count || 0) + 1;
      }

      const { error: upsertError } = await supabase
        .from("login_attempts")
        .upsert({
          key: k,
          failed_count: count,
          last_failed_at: now,
        }, { onConflict: "key" });

      if (upsertError) {
        console.error("[RecordLoginFailure] Error upserting login attempt for key", k, upsertError);
      }

      if (k === key) {
        latestCount = count;
      }
    }
  } catch (error) {
    console.error("[RecordLoginFailure] Unexpected error:", error);
  }

  return res.json({
    success: true,
    failedAttempts: latestCount,
    captchaRequired: latestCount >= 10,
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
export async function recordLoginSuccess(req, res) {
  const key = getClientKey(req);
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown-ip";

  const keysToDelete = [key];
  if (key !== ip) {
    keysToDelete.push(ip);
  }

  try {
    const supabase = getAdminClient();
    const { error } = await supabase
      .from("login_attempts")
      .delete()
      .in("key", keysToDelete);

    if (error) {
      console.error("[RecordLoginSuccess] Error deleting login attempts:", error);
    }
  } catch (error) {
    console.error("[RecordLoginSuccess] Unexpected error:", error);
  }

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