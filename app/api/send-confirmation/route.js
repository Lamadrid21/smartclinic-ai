import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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

    const { data, error } = await resend.emails.send({
      from: "SmartClinic AI <onboarding@resend.dev>",
      to: [email],
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

          <div
            style="
              background-color: #f3f4f6;
              padding: 20px;
              border-radius: 10px;
            "
          >
            <p>
              <strong>Doctor:</strong> ${doctorName || "Doctor"}
            </p>

            <p>
              <strong>Date:</strong> ${appointmentDate}
            </p>

            <p>
              <strong>Time:</strong> ${startTime}
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
    });

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      data,
    });

  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}