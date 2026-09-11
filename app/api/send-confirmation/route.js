import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(request) {
  try {
    const {
      email,
      patientName,
      doctorName,
      appointmentDate,
      startTime,
      reason,
    } = await request.json();

    if (!email) {
      return Response.json(
        { error: "Patient email is required." },
        { status: 400 }
      );
    }

    if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
      return Response.json(
        { error: "Gmail configuration is missing." },
        { status: 500 }
      );
    }

    const mailOptions = {
      from: `"SmartClinic AI" <${process.env.GMAIL_EMAIL}>`,
      to: email,
      subject: "SmartClinic AI - Appointment Confirmation",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">

          <h1 style="color: #2563eb;">
            SmartClinic AI
          </h1>

          <h2>Appointment Confirmation</h2>

          <p>Hello ${patientName || "Patient"},</p>

          <p>
            Your appointment has been successfully booked.
          </p>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 10px;">

            <p>
              <strong>Doctor:</strong> ${doctorName || "Doctor"}
            </p>

            <p>
              <strong>Date:</strong> ${appointmentDate || "Not specified"}
            </p>

            <p>
              <strong>Time:</strong> ${startTime || "Not specified"}
            </p>

            <p>
              <strong>Reason:</strong> ${reason || "None"}
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
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    return Response.json({
      success: true,
      message: "Appointment confirmation email sent successfully.",
      messageId: info.messageId,
    });

  } catch (error) {
    console.error("Email Error:", error);

    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}