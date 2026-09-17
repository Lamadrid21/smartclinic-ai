import config from "../config/env.js";
import { getAdminClient } from "./supabase.js";
import { Resend } from "resend";
import nodemailer from "nodemailer";

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Creates and stores a 6-digit OTP in registration_otps,
 * then sends it to the given email.
 */
export async function sendRegistrationOTP(email) {
  if (!email) {
    throw new Error("Email is required.");
  }

  const otp = generateOTP();
  const supabase = getAdminClient();

  // Insert the OTP (expires in 10 minutes)
  const { error: insertError } = await supabase
    .from("registration_otps")
    .insert([
      {
        email: email.toLowerCase().trim(),
        otp_code: otp,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        verified: false,
      },
    ]);

  if (insertError) {
    console.error("OTP insert error:", insertError);
    throw new Error("Failed to create OTP.");
  }

  const safeEmail = escapeHtml(email);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
      <h1 style="color: #2563eb;">SmartClinic AI</h1>
      <h2>Email Verification</h2>
      <p>Your verification code is:</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 10px; text-align: center;">
        <p style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px; margin: 10px 0;">${otp}</p>
      </div>
      <p>This code expires in <strong>10 minutes</strong>.</p>
      <p>If you did not request this code, please ignore this email.</p>
    </div>
  `;
  const text = `SmartClinic AI - Verification Code: ${otp} (expires in 10 minutes)`;

  // Primary: Resend
  if (config.resendApiKey) {
    try {
      const resend = new Resend(config.resendApiKey);
      const { error } = await resend.emails.send({
        from: config.resendFromEmail,
        to: [email],
        subject: "SmartClinic AI — Email Verification Code",
        html,
        text,
      });
      if (!error) return { provider: "resend" };
      console.error("Resend OTP error:", error);
    } catch (e) {
      console.error("Resend failed, trying Gmail:", e);
    }
  }

  // Fallback: Gmail SMTP
  if (!config.gmailEmail || !config.gmailAppPassword) {
    throw new Error("Email configuration is missing.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: config.gmailEmail, pass: config.gmailAppPassword },
  });

  await transporter.sendMail({
    from: `"SmartClinic AI" <${config.gmailEmail}>`,
    to: email,
    subject: "SmartClinic AI — Email Verification Code",
    html,
    text,
  });

  return { provider: "gmail" };
}

/**
 * Verifies the 6-digit OTP for the given email.
 * Returns true if valid and marks the OTP as verified.
 */
export async function verifyRegistrationOTP(email, otpCode) {
  if (!email || !otpCode) {
    return false;
  }

  const supabase = getAdminClient();
  const now = new Date().toISOString();

  const { data: rows, error: fetchError } = await supabase
    .from("registration_otps")
    .select("id, otp_code, expires_at, verified")
    .eq("email", email.toLowerCase().trim())
    .eq("otp_code", otpCode.trim())
    .eq("verified", false)
    .order("created_at", { ascending: false })
    .limit(1);

  if (fetchError) {
    console.error("OTP verify fetch error:", fetchError);
    return false;
  }

  if (!rows || rows.length === 0) {
    return false;
  }

  const record = rows[0];

  // Check expiry
  if (new Date(record.expires_at).getTime() < Date.now()) {
    return false;
  }

  // Mark verified
  const { error: updateError } = await supabase
    .from("registration_otps")
    .update({ verified: true })
    .eq("id", record.id);

  if (updateError) {
    console.error("OTP mark verified error:", updateError);
    return false;
  }

  return true;
}