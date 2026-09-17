import {
  generateAssistantResponse,
  matchSymptomToSpecialty,
} from "../services/ai.service.js";

export async function chat(req, res) {
  const userId = req.user?.id || null;

  const { message } = req.body || {};

  if (!message || !String(message).trim()) {
    return res
      .status(400)
      .json({ success: false, error: "Please enter a message." });
  }

  try {
    const response = await generateAssistantResponse(String(message).trim(), userId);

    if (!response) {
      return res
        .status(500)
        .json({ success: false, error: "Groq returned an empty response." });
    }

    return res.json({ success: true, response });
  } catch (error) {
    console.error("AI Controller Error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "SmartClinic AI encountered an error.",
    });
  }
}

/**
 * POST /api/ai/specialty-match
 * Instantly checks whether a described symptom fits the selected doctor's
 * specialization. Free rule-based check (no LLM call needed).
 */
export async function matchSpecialty(req, res) {
  const { reason, specialization } = req.body || {};

  if (!reason || !String(reason).trim()) {
    return res.status(400).json({
      success: false,
      error: "Please describe the reason for your appointment.",
    });
  }

  const result = matchSymptomToSpecialty(
    String(reason).trim(),
    String(specialization || "")
  );

  return res.json({
    success: true,
    matches: result.matches,
    confidence: result.confidence,
    message: result.message,
  });
}