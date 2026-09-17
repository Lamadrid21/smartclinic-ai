import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load backend/.env (only server-side secrets live here).
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 4000,

  // Supabase (database + auth verification)
  supabaseUrl:
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey:
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "",
  // NEVER expose this to the frontend/browser.
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",

  // AI provider (Groq - used by SmartClinic AI)
  groqApiKey: process.env.GROQ_API_KEY || "",

  // Email providers
  resendApiKey: process.env.RESEND_API_KEY || "",
  resendFromEmail:
    process.env.RESEND_FROM_EMAIL || "SmartClinic AI <onboarding@resend.dev>",
  gmailEmail: process.env.GMAIL_EMAIL || "",
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD || "",

  // Google reCAPTCHA v2 secret key (server-side only — never exposed to frontend).
  recaptchaSecretKey: process.env.RECAPTCHA_SECRET_KEY || "",

  // Frontend origin allowed by CORS
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
};

export default config;