"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import { supabase } from "@/lib/supabase";
import DictationField from "@/components/DictationField";

export default function PrescriptionsPage() {
  const params = useParams();
  const router = useRouter();

  const patientId = params.id;

  const [patient, setPatient] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);

  const [medicationName, setMedicationName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [instructions, setInstructions] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // ========== FEATURE #5: EMR Vitals + Consultation Notes ==========
  const [vitals, setVitals] = useState([]);
  const [heartRate, setHeartRate] = useState("");
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");
  const [temperature, setTemperature] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [oxygenSaturation, setOxygenSaturation] = useState("");
  const [vitalNotes, setVitalNotes] = useState("");

  const [consultationNotes, setConsultationNotes] = useState([]);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [hpi, setHpi] = useState("");
  const [physicalExam, setPhysicalExam] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [followUp, setFollowUp] = useState("");

  useEffect(() => {
    if (!patientId) {
      return;
    }

    // eslint-disable-next-line react-hooks/immutability
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function loadAll() {
    await Promise.all([
      loadPatient(),
      loadPrescriptions(),
      loadVitals(),
      loadConsultationNotes(),
    ]);
  }

  async function loadPatient() {
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .single();

    if (error) {
      console.error("Error loading patient:", error);
      setMessage("Unable to load patient.");
      return;
    }

    setPatient(data);
  }

  async function loadPrescriptions() {
    setLoading(true);

    const { data, error } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading prescriptions:", error);
      setMessage("Unable to load prescriptions.");
      setLoading(false);
      return;
    }

    setPrescriptions(data || []);
    setLoading(false);
  }

  async function handleCreatePrescription(e) {
    e.preventDefault();

    setMessage("");

    if (!medicationName || !dosage || !frequency || !duration) {
      setMessage("Please fill in all required fields.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("prescriptions")
      .insert([
        {
          patient_id: patientId,
          medication_name: medicationName.trim(),
          dosage: dosage.trim(),
          frequency: frequency.trim(),
          duration: duration.trim(),
          instructions: instructions.trim(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating prescription:", error);
      setMessage("Failed to create prescription.");
      setSaving(false);
      return;
    }

    setPrescriptions((current) => [data, ...current]);

    setMedicationName("");
    setDosage("");
    setFrequency("");
    setDuration("");
    setInstructions("");

    setMessage("Prescription created successfully.");
    setSaving(false);
  }

  // ==========================================
  // FEATURE #5: LOAD VITALS
  // ==========================================

  async function loadVitals() {
    const { data, error } = await supabase
      .from("emr_vitals")
      .select("*")
      .eq("patient_id", patientId)
      .order("recorded_at", { ascending: false });

    if (error) {
      console.error("Error loading vitals:", error);
      return;
    }

    setVitals(data || []);
  }

  // ==========================================
  // FEATURE #5: SAVE VITALS
  // ==========================================

  async function handleSaveVitals(e) {
    e.preventDefault();

    setMessage("");

    const hasAny =
      heartRate ||
      bpSystolic ||
      bpDiastolic ||
      temperature ||
      weightKg ||
      heightCm ||
      respiratoryRate ||
      oxygenSaturation;

    if (!hasAny) {
      setMessage("Please enter at least one vital sign.");
      return;
    }

    setSaving(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { data, error } = await supabase
      .from("emr_vitals")
      .insert([
        {
          patient_id: patientId,
          heart_rate: heartRate ? Number(heartRate) : null,
          blood_pressure_systolic: bpSystolic ? Number(bpSystolic) : null,
          blood_pressure_diastolic: bpDiastolic ? Number(bpDiastolic) : null,
          temperature: temperature ? Number(temperature) : null,
          weight_kg: weightKg ? Number(weightKg) : null,
          height_cm: heightCm ? Number(heightCm) : null,
          respiratory_rate: respiratoryRate ? Number(respiratoryRate) : null,
          oxygen_saturation: oxygenSaturation ? Number(oxygenSaturation) : null,
          recorded_by:
            session?.user?.user_metadata?.full_name ||
            session?.user?.email ||
            "Clinic Staff",
          notes: vitalNotes.trim() || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error saving vitals:", error);
      setMessage(`Failed to save vitals: ${error.message}`);
      setSaving(false);
      return;
    }

    setVitals((current) => [data, ...current]);
    setHeartRate("");
    setBpSystolic("");
    setBpDiastolic("");
    setTemperature("");
    setWeightKg("");
    setHeightCm("");
    setRespiratoryRate("");
    setOxygenSaturation("");
    setVitalNotes("");
    setMessage("Vitals saved successfully.");
    setSaving(false);
  }

  // ==========================================
  // FEATURE #5: LOAD CONSULTATION NOTES
  // ==========================================

  async function loadConsultationNotes() {
    const { data, error } = await supabase
      .from("emr_consultation_notes")
      .select("*")
      .eq("patient_id", patientId)
      .order("consultation_date", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error loading consultation notes:", error);
      return;
    }

    setConsultationNotes(data || []);
  }

  // ==========================================
  // FEATURE #5: SAVE CONSULTATION NOTES
  // ==========================================

  async function handleSaveConsultationNotes(e) {
    e.preventDefault();

    setMessage("");

    if (!chiefComplaint.trim()) {
      setMessage("Please enter the chief complaint.");
      return;
    }

    setSaving(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { data, error } = await supabase
      .from("emr_consultation_notes")
      .insert([
        {
          patient_id: patientId,
          chief_complaint: chiefComplaint.trim(),
          history_of_present_illness: hpi.trim() || null,
          physical_examination: physicalExam.trim() || null,
          assessment: assessment.trim() || null,
          plan: plan.trim() || null,
          follow_up: followUp.trim() || null,
          created_by:
            session?.user?.user_metadata?.full_name ||
            session?.user?.email ||
            "Clinic Staff",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error saving consultation notes:", error);
      setMessage(`Failed to save notes: ${error.message}`);
      setSaving(false);
      return;
    }

    setConsultationNotes((current) => [data, ...current]);
    setChiefComplaint("");
    setHpi("");
    setPhysicalExam("");
    setAssessment("");
    setPlan("");
    setFollowUp("");
    setMessage("Consultation notes saved successfully.");
    setSaving(false);
  }

  function handleDownloadPDF(prescription) {
    const doc = new jsPDF();

    const patientName = patient
      ? `${patient.first_name || ""} ${
          patient.middle_name || ""
        } ${patient.last_name || ""}`
          .replace(/\s+/g, " ")
          .trim()
      : "Patient";

    const patientNumber = patient?.patient_number || "N/A";

    const prescriptionDate = prescription.created_at
      ? new Date(prescription.created_at).toLocaleDateString()
      : "N/A";

    // =========================
    // HEADER
    // =========================

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("SMARTCLINIC AI", 20, 25);

    doc.setFontSize(16);
    doc.text("PRESCRIPTION", 20, 40);

    // =========================
    // PATIENT INFORMATION
    // =========================

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");

    doc.text(`Patient: ${patientName}`, 20, 55);

    doc.text(
      `Patient Number: ${patientNumber}`,
      20,
      65
    );

    doc.text(
      `Date: ${prescriptionDate}`,
      20,
      75
    );

    doc.line(20, 82, 190, 82);

    // =========================
    // MEDICATION
    // =========================

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");

    doc.text("Medication", 20, 100);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");

    const medicationLines = doc.splitTextToSize(
      `Medication: ${prescription.medication_name}`,
      170
    );

    doc.text(medicationLines, 20, 115);

    let currentY = 115 + medicationLines.length * 7;

    const dosageLines = doc.splitTextToSize(
      `Dosage: ${prescription.dosage}`,
      170
    );

    doc.text(dosageLines, 20, currentY);

    currentY += dosageLines.length * 7;

    const frequencyLines = doc.splitTextToSize(
      `Frequency: ${prescription.frequency}`,
      170
    );

    doc.text(frequencyLines, 20, currentY);

    currentY += frequencyLines.length * 7;

    const durationLines = doc.splitTextToSize(
      `Duration: ${prescription.duration}`,
      170
    );

    doc.text(durationLines, 20, currentY);

    currentY += durationLines.length * 7 + 8;

    // =========================
    // INSTRUCTIONS
    // =========================

    doc.setFont("helvetica", "bold");
    doc.text("Instructions:", 20, currentY);

    currentY += 8;

    doc.setFont("helvetica", "normal");

    const instructionsText =
      prescription.instructions || "None";

    const instructionLines = doc.splitTextToSize(
      instructionsText,
      170
    );

    doc.text(instructionLines, 20, currentY);

    currentY += instructionLines.length * 7 + 20;

    // =========================
    // PHYSICIAN AREA
    // =========================

    doc.line(20, currentY, 90, currentY);

    doc.text(
      "Prescribing Physician",
      20,
      currentY + 8
    );

    // =========================
    // FOOTER
    // =========================

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);

    doc.text(
      "Generated by SmartClinic AI",
      20,
      285
    );

    // =========================
    // DOWNLOAD
    // =========================

    doc.save(
      `Prescription-${patientNumber}.pdf`
    );
  }

  return (
    <main
      style={{
        padding: "40px",
        maxWidth: "1000px",
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* BACK BUTTON */}

      <button
        onClick={() =>
          router.push(`/patient-records/${patientId}`)
        }
        style={{
          marginBottom: "25px",
          padding: "10px 16px",
          border: "1px solid #ccc",
          borderRadius: "6px",
          background: "#fff",
          cursor: "pointer",
        }}
      >
        ← Back to Patient
      </button>

      {/* PATIENT INFORMATION */}

      {patient && (
        <div
          style={{
            marginBottom: "30px",
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "10px",
            background: "#f8f9fa",
          }}
        >
          <h1 style={{ marginTop: 0 }}>
            Prescriptions
          </h1>

          <p>
            <strong>Patient:</strong>{" "}
            {patient.first_name}{" "}
            {patient.middle_name || ""}{" "}
            {patient.last_name}
          </p>

          <p>
            <strong>Patient Number:</strong>{" "}
            {patient.patient_number}
          </p>
        </div>
      )}

      {/* FEATURE #5: PATIENT VITALS */}
      <section style={{ marginBottom: "40px", padding: "25px", border: "1px solid #ddd", borderRadius: "10px" }}>
        <h2>Vital Signs</h2>
        <form onSubmit={handleSaveVitals} style={{ marginBottom: "25px", borderBottom: "1px solid #ddd", paddingBottom: "22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px" }}>
            <div>
              <label><strong>Heart Rate (bpm)</strong></label>
              <input type="number" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} placeholder="72" style={{ width: "100%", padding: "12px", marginTop: "6px", border: "1px solid #ccc", borderRadius: "6px" }} />
            </div>
            <div>
              <label><strong>BP Systolic</strong></label>
              <input type="number" value={bpSystolic} onChange={(e) => setBpSystolic(e.target.value)} placeholder="120" style={{ width: "100%", padding: "12px", marginTop: "6px", border: "1px solid #ccc", borderRadius: "6px" }} />
            </div>
            <div>
              <label><strong>BP Diastolic</strong></label>
              <input type="number" value={bpDiastolic} onChange={(e) => setBpDiastolic(e.target.value)} placeholder="80" style={{ width: "100%", padding: "12px", marginTop: "6px", border: "1px solid #ccc", borderRadius: "6px" }} />
            </div>
            <div>
              <label><strong>Temperature (°C)</strong></label>
              <input type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="36.6" style={{ width: "100%", padding: "12px", marginTop: "6px", border: "1px solid #ccc", borderRadius: "6px" }} />
            </div>
            <div>
              <label><strong>Weight (kg)</strong></label>
              <input type="number" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="65.5" style={{ width: "100%", padding: "12px", marginTop: "6px", border: "1px solid #ccc", borderRadius: "6px" }} />
            </div>
            <div>
              <label><strong>Height (cm)</strong></label>
              <input type="number" step="0.1" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="165" style={{ width: "100%", padding: "12px", marginTop: "6px", border: "1px solid #ccc", borderRadius: "6px" }} />
            </div>
            <div>
              <label><strong>Respiratory Rate</strong></label>
              <input type="number" value={respiratoryRate} onChange={(e) => setRespiratoryRate(e.target.value)} placeholder="16" style={{ width: "100%", padding: "12px", marginTop: "6px", border: "1px solid #ccc", borderRadius: "6px" }} />
            </div>
            <div>
              <label><strong>O₂ Saturation (%)</strong></label>
              <input type="number" step="0.1" value={oxygenSaturation} onChange={(e) => setOxygenSaturation(e.target.value)} placeholder="98" style={{ width: "100%", padding: "12px", marginTop: "6px", border: "1px solid #ccc", borderRadius: "6px" }} />
            </div>
          </div>
          <DictationField
            label="Notes"
            value={vitalNotes}
            onChange={setVitalNotes}
            placeholder="Optional notes"
            rows={2}
            style={{ marginTop: "15px" }}
          />
          <button type="submit" disabled={saving} style={{ marginTop: "15px", padding: "12px 20px", border: "none", borderRadius: "6px", background: "#2563eb", color: "white", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving..." : "Save Vitals"}
          </button>
        </form>

        {vitals.length === 0 ? (
          <p>No vital signs recorded.</p>
        ) : (
          <div>
            {vitals.map((v) => (
              <div key={v.id} style={{ marginBottom: "15px", padding: "15px", border: "1px solid #ddd", borderRadius: "8px" }}>
                <p style={{ margin: 0 }}>
                  ❤️ <strong>{v.heart_rate || "—"}</strong> bpm · BP <strong>{v.blood_pressure_systolic || "—"}/{v.blood_pressure_diastolic || "—"}</strong> · 🌡️ <strong>{v.temperature ? `${v.temperature}°C` : "—"}</strong> · ⚖️ <strong>{v.weight_kg ? `${v.weight_kg} kg` : "—"}</strong> · 📏 <strong>{v.height_cm ? `${v.height_cm} cm` : "—"}</strong> · RR <strong>{v.respiratory_rate || "—"}</strong> · SpO₂ <strong>{v.oxygen_saturation ? `${v.oxygen_saturation}%` : "—"}</strong>
                </p>
                <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#666" }}>
                  {v.recorded_at ? new Date(v.recorded_at).toLocaleString() : ""}
                  {v.recorded_by ? ` · by ${v.recorded_by}` : ""}
                  {v.notes ? ` — ${v.notes}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FEATURE #5: CONSULTATION NOTES */}
      <section style={{ marginBottom: "40px", padding: "25px", border: "1px solid #ddd", borderRadius: "10px" }}>
        <h2>Consultation Notes</h2>
        <form onSubmit={handleSaveConsultationNotes} style={{ marginBottom: "25px", borderBottom: "1px solid #ddd", paddingBottom: "22px" }}>
          <DictationField
            label="Chief Complaint *"
            value={chiefComplaint}
            onChange={setChiefComplaint}
            placeholder="e.g. Persistent headache for 3 days"
            inputType="input"
          />
          <DictationField
            label="History of Present Illness"
            value={hpi}
            onChange={setHpi}
            placeholder="Onset, duration, progression..."
            rows={3}
          />
          <DictationField
            label="Physical Examination"
            value={physicalExam}
            onChange={setPhysicalExam}
            placeholder="Findings..."
            rows={3}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
            <div>
              <DictationField
                label="Assessment"
                value={assessment}
                onChange={setAssessment}
                placeholder="Diagnosis / impression"
                rows={2}
                style={{ marginBottom: 0 }}
              />
            </div>
            <div>
              <DictationField
                label="Plan"
                value={plan}
                onChange={setPlan}
                placeholder="Treatment plan"
                rows={2}
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>
          <div style={{ marginBottom: "15px" }}>
            <label><strong>Follow-up</strong></label>
            <input type="text" value={followUp} onChange={(e) => setFollowUp(e.target.value)} placeholder="e.g. Return in 1 week" style={{ width: "100%", padding: "12px", marginTop: "6px", border: "1px solid #ccc", borderRadius: "6px" }} />
          </div>
          <button type="submit" disabled={saving} style={{ padding: "12px 20px", border: "none", borderRadius: "6px", background: "#7c3aed", color: "white", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving..." : "Save Consultation Notes"}
          </button>
        </form>

        {consultationNotes.length === 0 ? <p>No consultation notes recorded.</p> : (
          <div>
            {consultationNotes.map((n) => (
              <div key={n.id} style={{ marginBottom: "15px", padding: "15px", border: "1px solid #ddd", borderRadius: "8px" }}>
                <p style={{ margin: 0 }}><strong>{n.chief_complaint}</strong></p>
                {n.history_of_present_illness && <p style={{ margin: "6px 0 0", fontSize: "13px" }}><strong>HPI:</strong> {n.history_of_present_illness}</p>}
                {n.physical_examination && <p style={{ margin: "4px 0 0", fontSize: "13px" }}><strong>PE:</strong> {n.physical_examination}</p>}
                {n.assessment && <p style={{ margin: "4px 0 0", fontSize: "13px" }}><strong>Assessment:</strong> {n.assessment}</p>}
                {n.plan && <p style={{ margin: "4px 0 0", fontSize: "13px" }}><strong>Plan:</strong> {n.plan}</p>}
                {n.follow_up && <p style={{ margin: "4px 0 0", fontSize: "13px" }}><strong>Follow-up:</strong> {n.follow_up}</p>}
                <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#666" }}>
                  {n.consultation_date ? new Date(n.consultation_date).toLocaleString() : ""}
                  {n.created_by ? ` · by ${n.created_by}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CREATE PRESCRIPTION */}

      <section
        style={{
          marginBottom: "40px",
          padding: "25px",
          border: "1px solid #ddd",
          borderRadius: "10px",
        }}
      >
        <h2>Create Prescription</h2>

        <form onSubmit={handleCreatePrescription}>
          {/* MEDICATION NAME */}

          <div style={{ marginBottom: "15px" }}>
            <label>
              <strong>Medication Name *</strong>
            </label>

            <input
              type="text"
              value={medicationName}
              onChange={(e) =>
                setMedicationName(e.target.value)
              }
              placeholder="e.g. Amoxicillin"
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "6px",
                border: "1px solid #ccc",
                borderRadius: "6px",
              }}
            />
          </div>

          {/* DOSAGE */}

          <div style={{ marginBottom: "15px" }}>
            <label>
              <strong>Dosage *</strong>
            </label>

            <input
              type="text"
              value={dosage}
              onChange={(e) =>
                setDosage(e.target.value)
              }
              placeholder="e.g. 500 mg"
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "6px",
                border: "1px solid #ccc",
                borderRadius: "6px",
              }}
            />
          </div>

          {/* FREQUENCY */}

          <div style={{ marginBottom: "15px" }}>
            <label>
              <strong>Frequency *</strong>
            </label>

            <input
              type="text"
              value={frequency}
              onChange={(e) =>
                setFrequency(e.target.value)
              }
              placeholder="e.g. 3 times daily"
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "6px",
                border: "1px solid #ccc",
                borderRadius: "6px",
              }}
            />
          </div>

          {/* DURATION */}

          <div style={{ marginBottom: "15px" }}>
            <label>
              <strong>Duration *</strong>
            </label>

            <input
              type="text"
              value={duration}
              onChange={(e) =>
                setDuration(e.target.value)
              }
              placeholder="e.g. 7 days"
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "6px",
                border: "1px solid #ccc",
                borderRadius: "6px",
              }}
            />
          </div>

          {/* INSTRUCTIONS */}

          <DictationField
            label="Instructions"
            value={instructions}
            onChange={setInstructions}
            placeholder="e.g. Take after meals."
            rows={4}
            micLabel="🎤 Dictate Instructions"
          />

          {/* CREATE BUTTON */}

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "12px 20px",
              border: "none",
              borderRadius: "6px",
              background: "#2563eb",
              color: "white",
              cursor: saving
                ? "not-allowed"
                : "pointer",
            }}
          >
            {saving
              ? "Saving..."
              : "Create Prescription"}
          </button>
        </form>

        {message && (
          <p
            style={{
              marginTop: "15px",
              fontWeight: "bold",
            }}
          >
            {message}
          </p>
        )}
      </section>

      {/* PRESCRIPTION HISTORY */}

      <section>
        <h2>Prescription History</h2>

        {loading ? (
          <p>Loading prescriptions...</p>
        ) : prescriptions.length === 0 ? (
          <p>
            No prescriptions found for this patient.
          </p>
        ) : (
          <div>
            {prescriptions.map((prescription) => (
              <div
                key={prescription.id}
                style={{
                  marginBottom: "20px",
                  padding: "20px",
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                }}
              >
                <h3 style={{ marginTop: 0 }}>
                  {prescription.medication_name}
                </h3>

                <p>
                  <strong>Dosage:</strong>{" "}
                  {prescription.dosage}
                </p>

                <p>
                  <strong>Frequency:</strong>{" "}
                  {prescription.frequency}
                </p>

                <p>
                  <strong>Duration:</strong>{" "}
                  {prescription.duration}
                </p>

                <p>
                  <strong>Instructions:</strong>{" "}
                  {prescription.instructions ||
                    "None"}
                </p>

                <p
                  style={{
                    fontSize: "13px",
                    color: "#666",
                  }}
                >
                  Created:{" "}
                  {prescription.created_at
                    ? new Date(
                        prescription.created_at
                      ).toLocaleString()
                    : "Date not available"}
                </p>

                {/* DOWNLOAD PDF BUTTON */}

                <button
                  onClick={() =>
                    handleDownloadPDF(
                      prescription
                    )
                  }
                  style={{
                    marginTop: "10px",
                    padding: "10px 16px",
                    border: "none",
                    borderRadius: "6px",
                    background: "#16a34a",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  Download Prescription PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}