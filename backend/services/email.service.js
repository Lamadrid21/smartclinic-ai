import nodemailer from "nodemailer";
import { Resend } from "resend";
import config from "../config/env.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildConfirmationPayload({ patientName, doctorName, appointmentDate, startTime, reason }) {
  const safe = {
    patientName: escapeHtml(patientName) || "Patient",
    doctorName: escapeHtml(doctorName) || "Doctor",
    appointmentDate: escapeHtml(appointmentDate) || "Not specified",
    startTime: escapeHtml(startTime) || "Not specified",
    reason: escapeHtml(reason) || "None",
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">

      <h1 style="color: #2563eb;">
        SmartClinic AI
      </h1>

      <h2>Appointment Confirmation</h2>

      <p>Hello ${safe.patientName},</p>

      <p>
        Your appointment has been successfully booked.
      </p>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 10px;">

        <p>
          <strong>Doctor:</strong> ${safe.doctorName}
        </p>

        <p>
          <strong>Date:</strong> ${safe.appointmentDate}
        </p>

        <p>
          <strong>Time:</strong> ${safe.startTime}
        </p>

        <p>
          <strong>Reason:</strong> ${safe.reason}
        </p>

        <p>
          <strong>Status:</strong> Pending
        </p>

      </div>

      <p>
        Please remember your appointment schedule.
      </p>

      <p>
        Thank you for using SmartClinic AI.
      </p>

    </div>
  `;

  const text = [
    "SmartClinic AI",
    "Appointment Confirmation",
    "",
    `Hello ${safe.patientName},`,
    "",
    "Your appointment has been successfully booked.",
    "",
    `Doctor: ${safe.doctorName}`,
    `Date: ${safe.appointmentDate}`,
    `Time: ${safe.startTime}`,
    `Reason: ${safe.reason}`,
    "Status: Pending",
    "",
    "Please remember your appointment schedule.",
    "Thank you for using SmartClinic AI.",
  ].join("\n");

  return {
    subject: "SmartClinic AI - Appointment Confirmation",
    html,
    text,
  };
}

/**
 * Sends the appointment confirmation email.
 * Primary provider: Resend. Fallback provider: Gmail SMTP (nodemailer),
 * which preserves the original SmartClinic behavior.
 *
 * @returns {Promise<{ messageId: string, provider: "resend"|"gmail" }>}
 */
export async function sendConfirmationEmail({
  email,
  patientName,
  doctorName,
  appointmentDate,
  startTime,
  reason,
}) {
  if (!email) {
    throw new Error("Patient email is required.");
  }

  const { subject, html, text } = buildConfirmationPayload({
    patientName,
    doctorName,
    appointmentDate,
    startTime,
    reason,
  });

  // ---- Primary provider: Resend ----
  if (config.resendApiKey) {
    try {
      const resend = new Resend(config.resendApiKey);
      const { data, error } = await resend.emails.send({
        from: config.resendFromEmail,
        to: [email],
        subject,
        html,
        text,
      });

      if (error) {
        console.error("Resend error:", error);
        throw new Error(error.message || "Resend failed to send the email.");
      }

      return { messageId: data?.id || `resend_${Date.now()}`, provider: "resend" };
    } catch (resendError) {
      console.error("Resend send failed, checking Gmail fallback...", resendError);

      // If Gmail fallback is not configured, surface the Resend error.
      if (!config.gmailEmail || !config.gmailAppPassword) {
        throw resendError;
      }
    }
  }

  // ---- Fallback provider: Gmail SMTP (original SmartClinic behavior) ----
  if (!config.gmailEmail || !config.gmailAppPassword) {
    throw new Error("Email configuration is missing.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.gmailEmail,
      pass: config.gmailAppPassword,
    },
  });

  const info = await transporter.sendMail({
    from: `"SmartClinic AI" <${config.gmailEmail}>`,
    to: email,
    subject,
    html,
  });

  return { messageId: info.messageId || `gmail_${Date.now()}`, provider: "gmail" };
}