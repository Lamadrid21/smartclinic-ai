import { createClient } from "@supabase/supabase-js";
import config from "../config/env.js";

const email = `sclinic_test_${Date.now()}@example.com`;
const password = "SclinicTest!2026";
const admin = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);

// 1) Create a confirmed test user (cleaned up at the end)
const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (createError) {
  console.error("CREATE USER FAILED:", createError.message);
  process.exit(1);
}

// 2) Log in as that user to obtain a real session token
const anonClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
const { data: sessionData, error: loginError } = await anonClient.auth.signInWithPassword({
  email,
  password,
});

if (loginError || !sessionData?.session) {
  console.error("LOGIN FAILED:", loginError?.message);
  await admin.auth.admin.deleteUser(created.user.id);
  process.exit(1);
}

const token = sessionData.session.access_token;

// 3) Test POST /api/ai (authenticated, real Groq call)
try {
  const aiRes = await fetch("http://localhost:4000/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message: "What are the clinic hours?" }),
  });
  const aiBody = await aiRes.json();
  console.log(
    "AI endpoint: status",
    aiRes.status,
    "| success:",
    aiBody.success,
    "| response length:",
    aiBody.response?.length ?? "n/a",
    "| error:",
    aiBody.error ?? null
  );
} catch (e) {
  console.error("AI TEST ERROR:", e.message);
}

// 4) Test GET /api/peak-hours (authenticated) - test user has no appointments
try {
  const phRes = await fetch("http://localhost:4000/api/peak-hours", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const phBody = await phRes.json();
  console.log(
    "PeakHours endpoint: status",
    phRes.status,
    "| success:",
    phBody.success,
    "| message:",
    phBody.message ?? null,
    "| peakHour:",
    phBody.peakHour ?? null
  );
} catch (e) {
  console.error("PEAK HOURS TEST ERROR:", e.message);
}

// 5) Test GET /api/send-confirmation would send email - only validate auth path (401 vs 200)
try {
  const emailRes = await fetch("http://localhost:4000/api/send-confirmation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email, patientName: "Test Patient", doctorName: "Dr. Test", appointmentDate: "2026-09-20", startTime: "09:00", reason: "Smoke test" }),
  });
  const emailBody = await emailRes.json();
  console.log(
    "Email endpoint: status",
    emailRes.status,
    "| success:",
    emailBody.success,
    "| provider:",
    emailBody.provider ?? null,
    "| error:",
    emailBody.error ?? null
  );
} catch (e) {
  console.error("EMAIL TEST ERROR:", e.message);
}

// 6) Cleanup: delete test user and any usage log rows for it
await admin.auth.admin.deleteUser(created.user.id);
const { error: logCleanupError } = await admin
  .from("ai_usage_logs")
  .delete()
  .eq("user_id", created.user.id);
console.log("Cleanup done | user deleted | log cleanup error:", logCleanupError?.message ?? "none");