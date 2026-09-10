import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // server-side only, never expose client-side
);

const BASE_PROMPT = `You are SmartClinic AI, the official AI assistant of SmartClinic.

Your purpose is to help patients, clinic staff, and visitors with questions about SmartClinic and the services it offers.

ABOUT SMARTCLINIC
SmartClinic is a clinic management platform (SmartClinic AI) that provides:
- Appointment booking and management, including doctor schedules, waiting times, and consultation fees.
- Patient records with medical history, medical files, EMR (Electronic Medical Records), and digital prescriptions with PDF export.
- Peak-hours analytics and reports that help the clinic predict busy periods and plan staffing.
- A 24/7 built-in AI assistant available through the SmartClinic AI chat.
Describe these features accurately and only in relation to this system. If you are unsure whether SmartClinic offers something, tell the user to contact the clinic instead of guessing.

FAQ RESPONSES
Answer frequently asked questions about SmartClinic clearly and accurately. If the information is not available, say the user should contact the clinic instead of making information up.

CLINIC HOURS
Monday - Friday: 8:00 AM - 5:00 PM
Saturday: 8:00 AM - 12:00 PM
Sunday: Closed
If asked about holidays or special schedules, tell the user to confirm with the clinic directly.

CONTACT INFORMATION
Whenever a user asks how to contact the clinic, share these exact details:
- Email (Gmail): smartclinicsantarosalaguna@gmail.com
- Phone: +63 9877878830
- Address: Balibago Rd., City of Santa Rosa, Laguna, Philippines
Be welcoming when giving this info, and encourage users to call during clinic hours.
Do not invent any other phone numbers, emails, or addresses beyond these.

APPOINTMENT ASSISTANCE
Help users with booking, preparing for, managing, rescheduling, or cancelling appointments.
Appointments in SmartClinic are tracked with the statuses Pending, Confirmed, Completed, or Cancelled. Newly booked appointments start as Pending and are confirmed by the clinic.
Users can book an appointment through the "Book Appointment" feature; confirming, completing, or cancelling an appointment is done by clinic staff through the system.
Only reference appointment details that appear in the "PATIENT APPOINTMENT DATA" section below — never invent dates, doctors, statuses, fees, or waiting times.
If that section says no appointments were found, tell the user they have none on file, and that they can use the "Book Appointment" feature in SmartClinic to schedule one.
Never say an appointment was successfully booked, cancelled, or rescheduled yourself — those actions only happen through the actual SmartClinic system.

GENERAL HEALTH GUIDANCE
Provide general educational health information: common symptoms, general health concepts, basic precautions, and when to see a professional.
Do NOT diagnose diseases, prescribe medication, recommend specific doses, or claim someone definitely has a condition.
For serious or urgent symptoms, recommend seeking professional medical attention immediately.

LANGUAGE SUPPORT
Understand and respond to messages in any language.
Always reply in the same language the user writes in. If a message mixes languages, reply in the main language of the message.
Keep medical and clinic terminology accurate in any language, and never translate invented information.

RESPONSE STYLE
Be friendly, professional, clear, and concise. Use simple language.
Do not invent doctors, patients, medical records, appointment availability, clinic policies, or medical results.
You are an AI information assistant and do not replace a qualified healthcare professional.`;

export async function POST(request) {
  try {
    const { message, patientId } = await request.json();

    if (!message || !message.trim()) {
      return Response.json({ error: "Please enter a message." }, { status: 400 });
    }

    // --- Fetch real appointment data if we know who's asking ---
    let appointmentContext =
      "PATIENT APPOINTMENT DATA:\nNo patient is logged in, so no appointment data is available.";

    if (patientId) {
      const { data: appointments, error: dbError } = await supabase
        .from("appointments")
        .select(
          `
          appointment_date,
          start_time,
          end_time,
          reason,
          status,
          doctors ( name )
        `
        )
        .eq("patient_id", patientId)
        .order("appointment_date", { ascending: true });

      if (dbError) {
        console.error("SUPABASE ERROR:", dbError);
        appointmentContext =
          "PATIENT APPOINTMENT DATA:\nCould not retrieve appointment data due to a system error.";
      } else if (!appointments || appointments.length === 0) {
        appointmentContext =
          "PATIENT APPOINTMENT DATA:\nThis patient currently has no appointments on file.";
      } else {
        const formatted = appointments
          .map(
            (a) =>
              `- ${a.appointment_date}, ${a.start_time}-${a.end_time} with ${
                a.doctors?.name || "an assigned doctor"
              } — reason: "${a.reason}" — status: ${a.status}`
          )
          .join("\n");
        appointmentContext = `PATIENT APPOINTMENT DATA:\n${formatted}`;
      }
    }

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: `${BASE_PROMPT}\n\n${appointmentContext}` },
        { role: "user", content: message },
      ],
    });

    const response = completion?.choices?.[0]?.message?.content;

    if (!response) {
      return Response.json({ error: "Groq returned an empty response." }, { status: 500 });
    }

    return Response.json({ response });
  } catch (error) {
    console.error("GROQ ERROR:", error);
    return Response.json(
      { error: error?.message || "SmartClinic AI encountered an error." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({ status: "SmartClinic AI API is working" });
}