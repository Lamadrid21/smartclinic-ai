"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import { supabase } from "@/lib/supabase";

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

  useEffect(() => {
    if (patientId) {
      loadPatient();
      loadPrescriptions();
    }
  }, [patientId]);

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

          <div style={{ marginBottom: "20px" }}>
            <label>
              <strong>Instructions</strong>
            </label>

            <textarea
              value={instructions}
              onChange={(e) =>
                setInstructions(e.target.value)
              }
              placeholder="e.g. Take after meals."
              rows={4}
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "6px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                resize: "vertical",
              }}
            />
          </div>

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