"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function EMRPage() {
  const params = useParams();
  const router = useRouter();

  const patientId = params.id;

  const [patient, setPatient] = useState(null);
  const [emrRecords, setEmrRecords] = useState([]);

  const [diagnosis, setDiagnosis] = useState("");
  const [treatmentNotes, setTreatmentNotes] = useState("");

  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (patientId) {
      loadPatient();
      loadEMR();
    }
  }, [patientId]);

  async function loadPatient() {
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .single();

    if (error) {
      console.error("Patient error:", error);
      setError("Unable to load patient information.");
      return;
    }

    setPatient(data);
  }

  async function loadEMR() {
    setLoading(true);

    const { data, error } = await supabase
      .from("emr")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("EMR error:", error);
      setError("Unable to load EMR records.");
      setLoading(false);
      return;
    }

    setEmrRecords(data || []);
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!diagnosis.trim()) {
      setError("Please enter a diagnosis.");
      return;
    }

    if (!treatmentNotes.trim()) {
      setError("Please enter treatment notes.");
      return;
    }

    setSaving(true);

    /* =========================
       UPDATE EXISTING EMR
       ========================= */

    if (editingId) {
      const { data, error } = await supabase
        .from("emr")
        .update({
          diagnosis: diagnosis.trim(),
          treatment_notes: treatmentNotes.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId)
        .eq("patient_id", patientId)
        .select()
        .single();

      if (error) {
        console.error("Update EMR error:", error);
        setError(error.message);
        setSaving(false);
        return;
      }

      setEmrRecords((previous) =>
        previous.map((record) =>
          record.id === editingId ? data : record
        )
      );

      setDiagnosis("");
      setTreatmentNotes("");
      setEditingId(null);

      setMessage("EMR updated successfully.");
      setSaving(false);

      return;
    }

    /* =========================
       CREATE NEW EMR
       ========================= */

    const { data, error } = await supabase
      .from("emr")
      .insert([
        {
          patient_id: patientId,
          diagnosis: diagnosis.trim(),
          treatment_notes: treatmentNotes.trim(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Create EMR error:", error);
      setError(error.message);
      setSaving(false);
      return;
    }

    setEmrRecords((previous) => [data, ...previous]);

    setDiagnosis("");
    setTreatmentNotes("");

    setMessage("EMR created successfully.");
    setSaving(false);
  }

  function handleEdit(record) {
    setEditingId(record.id);
    setDiagnosis(record.diagnosis || "");
    setTreatmentNotes(record.treatment_notes || "");

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setDiagnosis("");
    setTreatmentNotes("");

    setMessage("");
    setError("");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "32px",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        {/* Back Button */}

        <button
          onClick={() =>
            router.push(`/patient-records/${patientId}`)
          }
          style={{
            background: "#64748b",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "12px 20px",
            fontSize: "16px",
            cursor: "pointer",
            marginBottom: "24px",
          }}
        >
          ← Back to Patient
        </button>

        {/* Patient Header */}

        <section
          style={{
            background: "white",
            border: "1px solid #dbe3ef",
            borderRadius: "18px",
            padding: "34px",
            marginBottom: "28px",
          }}
        >
          <h1
            style={{
              color: "#173f91",
              fontSize: "36px",
              marginBottom: "14px",
            }}
          >
            Electronic Medical Record
          </h1>

          {patient ? (
            <>
              <p
                style={{
                  fontSize: "20px",
                  margin: "8px 0",
                }}
              >
                <strong>Patient:</strong>{" "}
                {patient.first_name}{" "}
                {patient.middle_name
                  ? patient.middle_name + " "
                  : ""}
                {patient.last_name}
              </p>

              <p
                style={{
                  fontSize: "20px",
                  margin: "8px 0",
                }}
              >
                <strong>Patient ID:</strong>{" "}
                {patient.patient_number}
              </p>
            </>
          ) : (
            <p>Loading patient information...</p>
          )}
        </section>

        {/* Create / Edit EMR Form */}

        <section
          style={{
            background: "white",
            border: "1px solid #dbe3ef",
            borderRadius: "18px",
            padding: "34px",
            marginBottom: "28px",
          }}
        >
          <h2
            style={{
              fontSize: "30px",
              marginBottom: "24px",
            }}
          >
            {editingId ? "Edit EMR" : "Create New EMR"}
          </h2>

          <form onSubmit={handleSubmit}>
            {/* Diagnosis */}

            <label
              style={{
                display: "block",
                fontWeight: "bold",
                fontSize: "18px",
                marginBottom: "8px",
              }}
            >
              Diagnosis
            </label>

            <input
              type="text"
              value={diagnosis}
              onChange={(e) =>
                setDiagnosis(e.target.value)
              }
              placeholder="Enter diagnosis"
              style={{
                width: "100%",
                padding: "16px",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                fontSize: "17px",
                marginBottom: "28px",
              }}
            />

            {/* Treatment Notes */}

            <label
              style={{
                display: "block",
                fontWeight: "bold",
                fontSize: "18px",
                marginBottom: "8px",
              }}
            >
              Treatment Notes
            </label>

            <textarea
              value={treatmentNotes}
              onChange={(e) =>
                setTreatmentNotes(e.target.value)
              }
              placeholder="Enter treatment notes"
              rows={7}
              style={{
                width: "100%",
                padding: "16px",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                fontSize: "17px",
                resize: "vertical",
                marginBottom: "20px",
              }}
            />

            {/* Error */}

            {error && (
              <div
                style={{
                  background: "#fee2e2",
                  color: "#991b1b",
                  padding: "14px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                }}
              >
                {error}
              </div>
            )}

            {/* Success */}

            {message && (
              <div
                style={{
                  background: "#dcfce7",
                  color: "#166534",
                  padding: "14px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                }}
              >
                {message}
              </div>
            )}

            {/* Buttons */}

            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: "#173f91",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  padding: "14px 26px",
                  fontSize: "17px",
                  cursor: saving
                    ? "not-allowed"
                    : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update EMR"
                  : "Create EMR"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  style={{
                    background: "#64748b",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    padding: "14px 26px",
                    fontSize: "17px",
                    cursor: "pointer",
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        {/* EMR History */}

        <section
          style={{
            background: "white",
            border: "1px solid #dbe3ef",
            borderRadius: "18px",
            padding: "34px",
          }}
        >
          <h2
            style={{
              fontSize: "30px",
              marginBottom: "24px",
            }}
          >
            EMR History
          </h2>

          {loading ? (
            <p>Loading EMR records...</p>
          ) : emrRecords.length === 0 ? (
            <p
              style={{
                color: "#64748b",
              }}
            >
              No EMR records yet.
            </p>
          ) : (
            <div>
              {emrRecords.map((record) => (
                <div
                  key={record.id}
                  style={{
                    border: "1px solid #dbe3ef",
                    borderRadius: "12px",
                    padding: "22px",
                    marginBottom: "18px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "21px",
                      marginBottom: "10px",
                    }}
                  >
                    Diagnosis
                  </h3>

                  <p
                    style={{
                      marginBottom: "20px",
                    }}
                  >
                    {record.diagnosis}
                  </p>

                  <h3
                    style={{
                      fontSize: "21px",
                      marginBottom: "10px",
                    }}
                  >
                    Treatment Notes
                  </h3>

                  <p
                    style={{
                      whiteSpace: "pre-wrap",
                      marginBottom: "18px",
                    }}
                  >
                    {record.treatment_notes}
                  </p>

                  <p
                    style={{
                      color: "#64748b",
                      fontSize: "14px",
                      marginBottom: "18px",
                    }}
                  >
                    Created:{" "}
                    {record.created_at
                      ? new Date(
                          record.created_at
                        ).toLocaleString()
                      : "Date not available"}
                  </p>

                  {/* Edit Button */}

                  <button
                    onClick={() => handleEdit(record)}
                    style={{
                      background: "#173f91",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      padding: "10px 18px",
                      fontSize: "15px",
                      cursor: "pointer",
                    }}
                  >
                    Edit EMR
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}