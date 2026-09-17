import Groq from "groq-sdk";
import config from "../config/env.js";
import { getAdminClient } from "./supabase.js";

const groq = new Groq({
  apiKey: config.groqApiKey,
});

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

/**
 * Builds the "PATIENT APPOINTMENT DATA" context for a logged-in user.
 * Uses the service-role client server-side; the user id always comes from
 * the verified session token, never from client-supplied input.
 */
async function buildAppointmentContext(userId) {
  if (!userId) {
    return "PATIENT APPOINTMENT DATA:\nNo patient is logged in, so no appointment data is available.";
  }

  const supabase = getAdminClient();

  const { data: appointments, error } = await supabase
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
    .eq("patient_id", userId)
    .order("appointment_date", { ascending: true });

  if (error) {
    console.error("SUPABASE ERROR:", error);
    return "PATIENT APPOINTMENT DATA:\nCould not retrieve appointment data due to a system error.";
  }

  if (!appointments || appointments.length === 0) {
    return "PATIENT APPOINTMENT DATA:\nThis patient currently has no appointments on file.";
  }

  const formatted = appointments
    .map(
      (a) =>
        `- ${a.appointment_date}, ${a.start_time}-${a.end_time} with ${
          a.doctors?.name || "an assigned doctor"
        } — reason: "${a.reason}" — status: ${a.status}`
    )
    .join("\n");

  return `PATIENT APPOINTMENT DATA:\n${formatted}`;
}

/**
 * Builds the "DOCTOR DIRECTORY" context with each doctor's specialization.
 * Shared helper used by buildDoctorsContext and specialty matching.
 */
const SPECIALTY_KEYWORDS = {
  Cardiology: [
    "heart", "chest pain", "palpitation", "blood pressure", "hypertension",
    "arrhythmia", "heart attack", "cardiovascular", "ecg", "cholesterol",
  ],
  Neurology: [
    "headache", "migraine", "seizure", "epilepsy", "tremor", "stroke",
    "numb", "dizziness", "vertigo", "memory", "parkinson", "neuro",
  ],
  Pediatrics: [
    "child", "baby", "infant", "kid", "toddler", "adolescent", "vaccination",
    "vaccine", "colic", "ear infection", "growth",
  ],
  Dermatology: [
    "skin", "rash", "acne", "eczema", "psoriasis", "hair loss", "itching",
    "itchy", "mole", "wart", "derma", "allergy rash", "hives",
  ],
};

const GENERAL_MEDICINE_KEYWORDS = [
  "fever", "cough", "cold", "flu", "infection", "check-up", "sore throat",
  "general", "diabetes", "stomach", "abdominal", "fatigue", "malaise",
  "headache", "flu-like", "virus",
];

/**
 * Builds a "DOCTOR DIRECTORY" context block for the AI prompt so the
 * assistant can warn about a specialty mismatch when a patient describes
 * symptoms that do not match the selected doctor.
 */
async function buildDoctorsContext() {
  const supabase = getAdminClient();

  const { data: doctors, error } = await supabase
    .from("doctors")
    .select("name, specialization")
    .order("name");

  if (error) {
    console.error("DOCTOR DIRECTORY ERROR:", error);
    return "DOCTOR DIRECTORY:\nNo doctor directory is currently available.";
  }

  if (!doctors || doctors.length === 0) {
    return "DOCTOR DIRECTORY:\nNo doctors are registered in the clinic right now.";
  }

  const formatted = doctors
    .map(
      (doctor) =>
        `- ${doctor.name} — specialization: ${doctor.specialization || "General Practice"}`
    )
    .join("\n");

  return `DOCTOR DIRECTORY:\nThe clinic currently has the following doctors on staff:\n${formatted}\n\nTELLING PATIENTS WHICH DOCTOR TO SEE:\nWhen a patient tells you what they are experiencing and asks which doctor they should see (or which specialty matches their symptoms), suggest the appropriate specialization based on the clinic doctors above. If no listed doctor matches their symptoms well, tell them a General Medicine doctor is the best starting point. Never invent a doctor that is not listed above.`;
}

/**
 * Detects whether the given symptom description fits a doctor's specialty.
 * Used by the booking UI for an instant "specialty matches?" hint (no API cost).
 *
 * @param {string} reason - The appointment reason typed by the patient.
 * @param {string} specialization - The selected doctor's specialization.
 * @returns {{matches: boolean, message: string, confidence: 'high'|'medium'|'low'}}
 */
export function matchSymptomToSpecialty(reason = "", specialization = "") {
  const text = reason.toLowerCase().trim();
  const spec = (specialization || "").toLowerCase().trim();

  if (!text) {
    return { matches: true, message: "", confidence: "low" };
  }

  const hitKeyword = (keywords) =>
    keywords.some((keyword) => text.includes(keyword));

  const matchedCardio = hitKeyword(SPECIALTY_KEYWORDS.Cardiology);
  const matchedNeuro = hitKeyword(SPECIALTY_KEYWORDS.Neurology);
  const matchedPeds = hitKeyword(SPECIALTY_KEYWORDS.Pediatrics);
  const matchedDerma = hitKeyword(SPECIALTY_KEYWORDS.Dermatology);
  const matchedGeneral = hitKeyword(GENERAL_MEDICINE_KEYWORDS);

  const isCardio = spec.includes("cardio");
  const isNeuro = spec.includes("neuro");
  const isPeds = spec.includes("pedia");
  const isDerma = spec.includes("derma");

  // The keyword list with the sources used for hint text.
  const matches = [
    { name: "Cardiology", hit: matchedCardio, is: isCardio },
    { name: "Neurology", hit: matchedNeuro, is: isNeuro },
    { name: "Pediatrics", hit: matchedPeds, is: isPeds },
    { name: "Dermatology", hit: matchedDerma, is: isDerma },
  ].filter((entry) => entry.hit);

  if (matches.length === 0) {
    // No specialty keyword matched; assume General Medicine is a safe fit.
    if (
      isCardio ||
      isNeuro ||
      isPeds ||
      isDerma ||
      spec.includes("general") ||
      spec === "" ||
      spec === "general practice"
    ) {
      return {
        matches: true,
        message:
          "No specific specialty keywords detected. General Medicine doctors can assess this symptom and refer you if needed.",
        confidence: "low",
      };
    }

    return {
      matches: true,
      message: "No specialty mismatch detected.",
      confidence: "low",
    };
  }

  // At least one specialty keyword matched — check whether it aligns.
  const anyAligned = matches.some((entry) => entry.hit && entry.is);
  const anyMismatch = matches.some((entry) => entry.hit && !entry.is);

  if (anyAligned && !anyMismatch) {
    return {
      matches: true,
      message:
        "Your described symptom matches this doctor's specialty.",
      confidence: "high",
    };
  }

  if (anyMismatch) {
    // Suggest the specialties that matched the symptom keywords but are
    // *not* the currently-selected doctor.
    const suggested = matches
      .filter((entry) => entry.hit && !entry.is)
      .map((entry) => entry.name);

    const suggestedText =
      suggested.length > 0
        ? `${suggested.join(" or ")}`
        : "General Medicine";

    return {
      matches: false,
      message: `This doctor may not be the best match for your symptom. Consider a ${suggestedText} specialist instead.`,
      confidence: "high",
    };
  }

  return {
    matches: true,
    message:
      "Your described symptom is acceptable for this doctor.",
    confidence: "low",
  };
}

/**
 * Records one AI usage entry server-side. This runs on the backend so the
 * full conversation/response is never handled by the client for logging.
 */
async function logUsage(userId, message, response) {
  if (!userId) return;

  try {
    const supabase = getAdminClient();
    const { error } = await supabase.from("ai_usage_logs").insert({
      user_id: userId,
      message,
      response,
    });
    if (error) console.error("Usage logging error:", error);
  } catch (error) {
    console.error("Usage logging error:", error);
  }
}

/**
 * Generates a SmartClinic AI response for the given user message.
 * Returns the response text, or null if the model returned nothing.
 */
export async function generateAssistantResponse(message, userId) {
  if (!config.groqApiKey) {
    throw new Error("GROQ_API_KEY is not configured on the backend.");
  }

  const [appointmentContext, doctorsContext] = await Promise.all([
    buildAppointmentContext(userId),
    buildDoctorsContext(),
  ]);

  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      {
        role: "system",
        content: `${BASE_PROMPT}\n\n${appointmentContext}\n\n${doctorsContext}`,
      },
      { role: "user", content: message },
    ],
  });

  const response = completion?.choices?.[0]?.message?.content;

  if (!response) {
    return null;
  }

  await logUsage(userId, message, response);

  return response;
}