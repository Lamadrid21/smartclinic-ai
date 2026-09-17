import { sendConfirmationEmail } from "../services/email.service.js";

export async function sendConfirmation(req, res) {
  const {
    email,
    patientName,
    doctorName,
    appointmentDate,
    startTime,
    reason,
  } = req.body || {};

  if (!email) {
    return res
      .status(400)
      .json({ success: false, error: "Patient email is required." });
  }

  try {
    const result = await sendConfirmationEmail({
      email,
      patientName,
      doctorName,
      appointmentDate,
      startTime,
      reason,
    });

    return res.json({
      success: true,
      message: "Appointment confirmation email sent successfully.",
      messageId: result.messageId,
      provider: result.provider,
    });
  } catch (error) {
    console.error("Email Controller Error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to send the confirmation email.",
    });
  }
}