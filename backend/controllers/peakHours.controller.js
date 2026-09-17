import { predictPeakHours } from "../services/peakHours.service.js";

export async function getPeakHours(req, res) {
  try {
    // req.supabase is the client bound to the verified session token.
    const { data, error } = await req.supabase
      .from("appointments")
      .select("id, appointment_date, start_time, end_time, status");

    if (error) {
      console.error("Peak Hours Appointment Error:", error);
      return res
        .status(500)
        .json({ success: false, error: error.message });
    }

    const result = await predictPeakHours(data);
    return res.json(result);
  } catch (error) {
    console.error("Peak Hours Controller Error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to generate peak hour prediction.",
    });
  }
}