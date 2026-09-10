"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppLayout from "@/components/AppLayout";

export default function PatientDetails() {
  const params = useParams();
  const router = useRouter();

  const id = params.id;

  const [patient, setPatient] = useState(null);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [medicalFiles, setMedicalFiles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ==========================================
  // MEDICAL HISTORY FORM
  // ==========================================

  const [diagnosis, setDiagnosis] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [treatment, setTreatment] = useState("");
  const [medications, setMedications] = useState("");
  const [allergies, setAllergies] = useState("");
  const [notes, setNotes] = useState("");

  // ==========================================
  // ERROR HELPER
  // ==========================================

  function getErrorMessage(error) {
    if (!error) {
      return "Unknown error";
    }

    if (typeof error === "string") {
      return error;
    }

    return (
      error.message ||
      error.details ||
      error.hint ||
      "Unknown error"
    );
  }

  // ==========================================
  // LOAD ALL DATA
  // ==========================================

  useEffect(() => {
    if (!id) {
      return;
    }

    // eslint-disable-next-line react-hooks/immutability
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadAll() {
    setLoading(true);
    setErrorMessage("");

    await Promise.all([
      loadPatient(),
      loadMedicalHistory(),
      loadMedicalFiles(),
    ]);

    setLoading(false);
  }

  // ==========================================
  // LOAD PATIENT
  // ==========================================

  async function loadPatient() {
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("PATIENT ERROR:", error);

      setErrorMessage(
        `Patient error: ${getErrorMessage(error)}`
      );

      return;
    }

    setPatient(data);
  }

  // ==========================================
  // LOAD MEDICAL HISTORY
  // ==========================================

  async function loadMedicalHistory() {
    const { data, error } = await supabase
      .from("medical_history")
      .select("*")
      .eq("patient_id", id)
      .order("id", {
        ascending: false,
      });

    if (error) {
      console.error(
        "MEDICAL HISTORY ERROR:",
        error
      );

      setErrorMessage(
        `Medical history error: ${getErrorMessage(error)}`
      );

      return;
    }

    setMedicalHistory(data || []);
  }

  // ==========================================
  // LOAD MEDICAL FILES
  // ==========================================

  async function loadMedicalFiles() {
    console.log(
      "Loading medical files for patient:",
      id
    );

    // IMPORTANT:
    // We use "id" for ordering.
    //
    // DO NOT use:
    // .order("created_at")
    //
    // because your medical_files table
    // does not have a created_at column.

    const { data, error } = await supabase
      .from("medical_files")
      .select("*")
      .eq("patient_id", id)
      .order("id", {
        ascending: false,
      });

    if (error) {
      console.error(
        "MEDICAL FILES ERROR:",
        error
      );

      setErrorMessage(
        `Medical files error: ${getErrorMessage(error)}`
      );

      return;
    }

    console.log(
      "Medical files loaded:",
      data
    );

    setMedicalFiles(data || []);
  }

  // ==========================================
  // ADD MEDICAL HISTORY
  // ==========================================

  async function handleAddMedicalHistory(e) {
    e.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (
      !diagnosis.trim() &&
      !symptoms.trim() &&
      !treatment.trim() &&
      !medications.trim() &&
      !allergies.trim() &&
      !notes.trim()
    ) {
      setErrorMessage(
        "Please enter at least one medical history field."
      );

      return;
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      setErrorMessage(
        "You are not logged in. Please log in again."
      );

      return;
    }

    const { data, error } = await supabase
      .from("medical_history")
      .insert([
        {
          patient_id: id,
          diagnosis: diagnosis.trim(),
          symptoms: symptoms.trim(),
          treatment: treatment.trim(),
          medications: medications.trim(),
          allergies: allergies.trim(),
          notes: notes.trim(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(
        "ADD MEDICAL HISTORY ERROR:",
        error
      );

      setErrorMessage(
        `Medical history error: ${getErrorMessage(error)}`
      );

      return;
    }

    setMedicalHistory((current) => [
      data,
      ...current,
    ]);

    setDiagnosis("");
    setSymptoms("");
    setTreatment("");
    setMedications("");
    setAllergies("");
    setNotes("");

    setSuccessMessage(
      "Medical history added successfully."
    );
  }

  // ==========================================
  // UPLOAD MEDICAL FILE
  // ==========================================

  async function handleFileUpload(e) {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setUploading(true);

    try {
      // Maximum file size: 10 MB
      const maxFileSize =
        10 * 1024 * 1024;

      if (selectedFile.size > maxFileSize) {
        setErrorMessage(
          "File is too large. Maximum size is 10 MB."
        );

        e.target.value = "";
        setUploading(false);

        return;
      }

      // ==========================================
      // CHECK LOGIN SESSION
      // ==========================================

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "SESSION ERROR:",
          sessionError
        );

        setErrorMessage(
          `Session error: ${getErrorMessage(sessionError)}`
        );

        e.target.value = "";
        setUploading(false);

        return;
      }

      if (!session) {
        setErrorMessage(
          "You are not logged in. Please log in again."
        );

        e.target.value = "";
        setUploading(false);

        return;
      }

      // ==========================================
      // FILE EXTENSION
      // ==========================================

      const fileExtension =
        selectedFile.name.includes(".")
          ? selectedFile.name
              .split(".")
              .pop()
              .toLowerCase()
          : "";

      // ==========================================
      // UNIQUE FILE NAME
      // ==========================================

      const uniqueFileName =
        `${Date.now()}-${Math.random()
          .toString(36)
          .substring(2)}` +
        (fileExtension
          ? `.${fileExtension}`
          : "");

      // ==========================================
      // PATIENT FOLDER
      // ==========================================

      const filePath =
        `${id}/${uniqueFileName}`;

      console.log(
        "Uploading medical file:",
        {
          patientId: id,
          originalName: selectedFile.name,
          filePath: filePath,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
        }
      );

      // ==========================================
      // UPLOAD TO SUPABASE STORAGE
      // ==========================================

      const {
        error: uploadError,
      } = await supabase.storage
        .from("medical-files")
        .upload(
          filePath,
          selectedFile
        );

      if (uploadError) {
        console.error(
          "FILE UPLOAD ERROR:",
          uploadError
        );

        setErrorMessage(
          `File upload error: ${getErrorMessage(uploadError)}`
        );

        e.target.value = "";
        setUploading(false);

        return;
      }

      // ==========================================
      // SAVE FILE INFORMATION TO DATABASE
      // ==========================================

      // IMPORTANT:
      // We do NOT insert created_at because
      // your medical_files table does not have it.

      const {
        data: fileData,
        error: databaseError,
      } = await supabase
        .from("medical_files")
        .insert([
          {
            patient_id: id,
            file_name: selectedFile.name,
            file_path: filePath,
            file_type:
              selectedFile.type ||
              "Unknown",
          },
        ])
        .select()
        .single();

      if (databaseError) {
        console.error(
          "MEDICAL FILE DATABASE ERROR:",
          databaseError
        );

        // Delete uploaded file if database insert fails
        await supabase.storage
          .from("medical-files")
          .remove([filePath]);

        setErrorMessage(
          `Medical file database error: ${getErrorMessage(databaseError)}`
        );

        e.target.value = "";
        setUploading(false);

        return;
      }

      // ==========================================
      // ADD FILE TO SCREEN
      // ==========================================

      setMedicalFiles((current) => [
        fileData,
        ...current,
      ]);

      setSuccessMessage(
        "Medical file uploaded successfully."
      );

      // Clear file input
      e.target.value = "";
    } catch (error) {
      console.error(
        "MEDICAL FILE ERROR:",
        error
      );

      setErrorMessage(
        `Medical file error: ${getErrorMessage(error)}`
      );

      e.target.value = "";
    }

    setUploading(false);
  }

  // ==========================================
  // VIEW MEDICAL FILE
  // ==========================================

  async function handleViewFile(file) {
    setErrorMessage("");

    const {
      data,
      error,
    } = await supabase.storage
      .from("medical-files")
      .createSignedUrl(
        file.file_path,
        60 * 5
      );

    if (error) {
      console.error(
        "SIGNED URL ERROR:",
        error
      );

      setErrorMessage(
        `Unable to open file: ${getErrorMessage(error)}`
      );

      return;
    }

    if (data?.signedUrl) {
      window.open(
        data.signedUrl,
        "_blank"
      );
    }
  }

  // ==========================================
  // LOADING
  // ==========================================

  if (loading && !patient) {
    return (
      <AppLayout title="Patient Details" subtitle="Medical history and patient information" activeNav="patients">
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
          <p className="text-slate-400 text-sm">Loading patient records...</p>
        </div>
      </AppLayout>
    );
  }

  // ==========================================
  // PATIENT NOT FOUND
  // ==========================================

  if (!patient) {
    return (
      <main
        style={{
          padding: "40px",
          fontFamily:
            "Arial, sans-serif",
        }}
      >
        <h1>
          Patient not found
        </h1>

        <button
          onClick={() =>
            router.push(
              "/patient-records"
            )
          }
          style={{
            padding: "10px 16px",
            border: "none",
            borderRadius: "6px",
            background:
              "#2563eb",
            color: "white",
            cursor: "pointer",
          }}
        >
          ← Back to Patient Records
        </button>
      </main>
    );
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <AppLayout
      title="Patient Details"
      subtitle="Medical history, appointments, and records"
      activeNav="patients"
    >
      <div style={{ padding: "20px 0" }}>
      {/* BACK BUTTON */}

      <button
        onClick={() =>
          router.push(
            "/patient-records"
          )
        }
        style={{
          marginBottom: "20px",
          padding: "10px 16px",
          border:
            "1px solid #ccc",
          borderRadius: "6px",
          background: "rgba(15,23,42,0.6)",
          cursor: "pointer",
        }}
      >
        ← Back to Patient Records
      </button>

      {/* ERROR MESSAGE */}

      {errorMessage && (
        <div
          style={{
            marginBottom: "20px",
            padding: "15px",
            background:
              "#fee2e2",
            border:
              "1px solid #fca5a5",
            borderRadius: "8px",
            color: "#991b1b",
          }}
        >
          <strong>
            Error:
          </strong>{" "}
          {errorMessage}
        </div>
      )}

      {/* SUCCESS MESSAGE */}

      {successMessage && (
        <div
          style={{
            marginBottom: "20px",
            padding: "15px",
            background:
              "#dcfce7",
            border:
              "1px solid #86efac",
            borderRadius: "8px",
            color: "#34d399",
          }}
        >
          {successMessage}
        </div>
      )}

      {/* ======================================
          PATIENT INFORMATION
      ====================================== */}

      <section
        style={{
          marginBottom: "30px",
          padding: "30px",
          background: "rgba(15,23,42,0.6)",
          border:
            "1px solid #ddd",
          borderRadius: "12px",
        }}
      >
        <h1
          style={{
            marginTop: 0,
            marginBottom: "30px",
          }}
        >
          Patient Information
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, 1fr)",
            gap: "25px",
          }}
        >
          <div>
            <strong>Name</strong>

            <p>
              {patient.first_name}{" "}
              {patient.middle_name || ""}{" "}
              {patient.last_name}
            </p>
          </div>

          <div>
            <strong>
              Patient ID
            </strong>

            <p>
              {patient.patient_number ||
                "N/A"}
            </p>
          </div>

          <div>
            <strong>
              Date of Birth
            </strong>

            <p>
              {patient.date_of_birth ||
                "N/A"}
            </p>
          </div>

          <div>
            <strong>
              Gender
            </strong>

            <p>
              {patient.gender ||
                "N/A"}
            </p>
          </div>

          <div>
            <strong>
              Contact
            </strong>

            <p>
              {patient.contact_number ||
                "N/A"}
            </p>
          </div>

          <div>
            <strong>
              Email
            </strong>

            <p>
              {patient.email ||
                "N/A"}
            </p>
          </div>
        </div>
      </section>

      {/* ======================================
          EMR
      ====================================== */}

      <section
        style={{
          marginBottom: "30px",
          padding: "25px",
          background: "rgba(15,23,42,0.6)",
          border:
            "1px solid #ddd",
          borderRadius: "12px",
        }}
      >
        <h2>
          Electronic Medical Record
        </h2>

        <p>
          View and manage this
          patient&apos;s EMR.
        </p>

        <button
          onClick={() =>
            router.push(
              `/patient-records/${id}/emr`
            )
          }
          style={{
            padding:
              "12px 20px",
            border: "none",
            borderRadius: "6px",
            background:
              "#2563eb",
            color: "white",
            cursor: "pointer",
          }}
        >
          Open EMR
        </button>
      </section>

      {/* ======================================
          PRESCRIPTIONS
      ====================================== */}

      <section
        style={{
          marginBottom: "30px",
          padding: "25px",
          background: "rgba(15,23,42,0.6)",
          border:
            "1px solid #ddd",
          borderRadius: "12px",
        }}
      >
        <h2>
          Prescription Management
        </h2>

        <p>
          Create and view
          prescriptions for this
          patient.
        </p>

        <button
          onClick={() =>
            router.push(
              `/patient-records/${id}/prescriptions`
            )
          }
          style={{
            padding:
              "12px 20px",
            border: "none",
            borderRadius: "6px",
            background:
              "#16a34a",
            color: "white",
            cursor: "pointer",
          }}
        >
          Open Prescriptions
        </button>
      </section>

      {/* ======================================
          MEDICAL FILES
      ====================================== */}

      <section
        style={{
          marginBottom: "30px",
          padding: "25px",
          background: "rgba(15,23,42,0.6)",
          border:
            "1px solid #ddd",
          borderRadius: "12px",
        }}
      >
        <h2>
          Medical Files
        </h2>

        <p>
          Upload and view
          medical files for this
          patient.
        </p>

        {/* UPLOAD FILE */}

        <div
          style={{
            marginBottom: "20px",
          }}
        >
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            Upload Medical Record
          </label>

          <input
            type="file"
            onChange={
              handleFileUpload
            }
            disabled={uploading}
            style={{
              display: "block",
              padding: "8px",
              border:
                "1px solid #ccc",
              borderRadius: "6px",
              background: "rgba(15,23,42,0.6)",
              cursor: uploading
                ? "not-allowed"
                : "pointer",
            }}
          />

          <p
            style={{
              marginTop: "8px",
              fontSize: "13px",
              color: "#94a3b8",
            }}
          >
            Maximum file size: 10 MB
          </p>

          {uploading && (
            <p
              style={{
                color: "#60a5fa",
                fontWeight: "bold",
              }}
            >
              Uploading file...
            </p>
          )}
        </div>

        {/* MEDICAL FILE LIST */}

        {medicalFiles.length ===
        0 ? (
          <p>
            No medical files
            uploaded.
          </p>
        ) : (
          <div>
            {medicalFiles.map(
              (medicalFile) => (
                <div
                  key={
                    medicalFile.id
                  }
                  style={{
                    marginBottom:
                      "15px",
                    padding:
                      "15px",
                    border:
                      "1px solid #ddd",
                    borderRadius:
                      "8px",
                  }}
                >
                  <strong>
                    {
                      medicalFile.file_name
                    }
                  </strong>

                  <div
                    style={{
                      marginTop:
                        "8px",
                      color:
                        "#6b7c93",
                    }}
                  >
                    File Type:{" "}
                    {medicalFile.file_type ||
                      "Unknown file type"}
                  </div>

                  <div
                    style={{
                      marginTop:
                        "5px",
                      color:
                        "#6b7c93",
                      fontSize:
                        "13px",
                    }}
                  >
                    File ID:{" "}
                    {medicalFile.id}
                  </div>

                  <button
                    onClick={() =>
                      handleViewFile(
                        medicalFile
                      )
                    }
                    style={{
                      marginTop:
                        "12px",
                      padding:
                        "8px 14px",
                      border:
                        "none",
                      borderRadius:
                        "6px",
                      background:
                        "#2563eb",
                      color:
                        "white",
                      cursor:
                        "pointer",
                    }}
                  >
                    View File
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* ======================================
          ADD MEDICAL HISTORY
      ====================================== */}

      <section
        style={{
          marginBottom: "30px",
          padding: "25px",
          background: "rgba(15,23,42,0.6)",
          border:
            "1px solid #ddd",
          borderRadius: "12px",
        }}
      >
        <h2>
          Add Medical History
        </h2>

        <form
          onSubmit={
            handleAddMedicalHistory
          }
        >
          {/* DIAGNOSIS */}

          <div
            style={{
              marginBottom:
                "15px",
            }}
          >
            <label>
              <strong>
                Diagnosis
              </strong>
            </label>

            <input
              type="text"
              value={diagnosis}
              onChange={(e) =>
                setDiagnosis(
                  e.target.value
                )
              }
              placeholder="Enter diagnosis"
              style={{
                width: "100%",
                padding:
                  "12px",
                marginTop:
                  "6px",
                border:
                  "1px solid #ccc",
                borderRadius:
                  "6px",
              }}
            />
          </div>

          {/* SYMPTOMS */}

          <div
            style={{
              marginBottom:
                "15px",
            }}
          >
            <label>
              <strong>
                Symptoms
              </strong>
            </label>

            <textarea
              value={symptoms}
              onChange={(e) =>
                setSymptoms(
                  e.target.value
                )
              }
              placeholder="Enter symptoms"
              rows={3}
              style={{
                width: "100%",
                padding:
                  "12px",
                marginTop:
                  "6px",
                border:
                  "1px solid #ccc",
                borderRadius:
                  "6px",
                resize:
                  "vertical",
              }}
            />
          </div>

          {/* TREATMENT */}

          <div
            style={{
              marginBottom:
                "15px",
            }}
          >
            <label>
              <strong>
                Treatment
              </strong>
            </label>

            <textarea
              value={treatment}
              onChange={(e) =>
                setTreatment(
                  e.target.value
                )
              }
              placeholder="Enter treatment"
              rows={3}
              style={{
                width: "100%",
                padding:
                  "12px",
                marginTop:
                  "6px",
                border:
                  "1px solid #ccc",
                borderRadius:
                  "6px",
                resize:
                  "vertical",
              }}
            />
          </div>

          {/* MEDICATIONS */}

          <div
            style={{
              marginBottom:
                "15px",
            }}
          >
            <label>
              <strong>
                Medications
              </strong>
            </label>

            <textarea
              value={medications}
              onChange={(e) =>
                setMedications(
                  e.target.value
                )
              }
              placeholder="Enter medications"
              rows={3}
              style={{
                width: "100%",
                padding:
                  "12px",
                marginTop:
                  "6px",
                border:
                  "1px solid #ccc",
                borderRadius:
                  "6px",
                resize:
                  "vertical",
              }}
            />
          </div>

          {/* ALLERGIES */}

          <div
            style={{
              marginBottom:
                "15px",
            }}
          >
            <label>
              <strong>
                Allergies
              </strong>
            </label>

            <textarea
              value={allergies}
              onChange={(e) =>
                setAllergies(
                  e.target.value
                )
              }
              placeholder="Enter allergies"
              rows={3}
              style={{
                width: "100%",
                padding:
                  "12px",
                marginTop:
                  "6px",
                border:
                  "1px solid #ccc",
                borderRadius:
                  "6px",
                resize:
                  "vertical",
              }}
            />
          </div>

          {/* NOTES */}

          <div
            style={{
              marginBottom:
                "20px",
            }}
          >
            <label>
              <strong>
                Notes
              </strong>
            </label>

            <textarea
              value={notes}
              onChange={(e) =>
                setNotes(
                  e.target.value
                )
              }
              placeholder="Enter notes"
              rows={4}
              style={{
                width: "100%",
                padding:
                  "12px",
                marginTop:
                  "6px",
                border:
                  "1px solid #ccc",
                borderRadius:
                  "6px",
                resize:
                  "vertical",
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              padding:
                "12px 20px",
              border: "none",
              borderRadius:
                "6px",
              background:
                "#2563eb",
              color: "white",
              cursor:
                "pointer",
            }}
          >
            Add Medical History
          </button>
        </form>
      </section>

      {/* ======================================
          MEDICAL HISTORY
      ====================================== */}

      <section
        style={{
          marginBottom: "30px",
          padding: "25px",
          background: "rgba(15,23,42,0.6)",
          border:
            "1px solid #ddd",
          borderRadius: "12px",
        }}
      >
        <h2>
          Medical History
        </h2>

        {medicalHistory.length ===
        0 ? (
          <p>
            No medical history
            found.
          </p>
        ) : (
          <div>
            {medicalHistory.map(
              (record) => (
                <div
                  key={record.id}
                  style={{
                    marginBottom:
                      "20px",
                    padding:
                      "20px",
                    border:
                      "1px solid #ddd",
                    borderRadius:
                      "10px",
                  }}
                >
                  <p>
                    <strong>
                      Diagnosis:
                    </strong>{" "}
                    {record.diagnosis ||
                      "None"}
                  </p>

                  <p>
                    <strong>
                      Symptoms:
                    </strong>{" "}
                    {record.symptoms ||
                      "None"}
                  </p>

                  <p>
                    <strong>
                      Treatment:
                    </strong>{" "}
                    {record.treatment ||
                      "None"}
                  </p>

                  <p>
                    <strong>
                      Medications:
                    </strong>{" "}
                    {record.medications ||
                      "None"}
                  </p>

                  <p>
                    <strong>
                      Allergies:
                    </strong>{" "}
                    {record.allergies ||
                      "None"}
                  </p>

                  <p>
                    <strong>
                      Notes:
                    </strong>{" "}
                    {record.notes ||
                      "None"}
                  </p>
                </div>
              )
            )}
          </div>
        )}
      </section>
      </div>
    </AppLayout>
  );
}