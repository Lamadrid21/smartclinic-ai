"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function PatientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [patient, setPatient] = useState(null);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [medicalFiles, setMedicalFiles] = useState([]);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Medical history form
  const [diagnosis, setDiagnosis] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [treatment, setTreatment] = useState("");
  const [medications, setMedications] = useState("");
  const [allergies, setAllergies] = useState("");
  const [notes, setNotes] = useState("");

  // Medical document upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  function getErrorMessage(error) {
    if (!error) return "Unknown error";

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

  useEffect(() => {
    if (!id) return;

    loadAll();
  }, [id]);

  async function loadAll() {
    setLoading(true);
    setErrorMessage("");

    try {
      await Promise.all([
        loadPatient(),
        loadMedicalHistory(),
        loadMedicalFiles(),
      ]);
    } catch (error) {
      console.error("LOAD ERROR:", error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function loadPatient() {
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("PATIENT ERROR:", error);
      throw error;
    }

    setPatient(data);
  }

  async function loadMedicalHistory() {
    const { data, error } = await supabase
      .from("medical_history")
      .select("*")
      .eq("patient_id", id)
      .order("id", { ascending: false });

    if (error) {
      console.error("MEDICAL HISTORY ERROR:", error);
      throw error;
    }

    setMedicalHistory(data || []);
  }

  async function loadMedicalFiles() {
    const { data, error } = await supabase
      .from("medical_files")
      .select("*")
      .eq("patient_id", id)
      .order("id", { ascending: false });

    if (error) {
      console.error("MEDICAL FILES ERROR:", error);
      throw error;
    }

    setMedicalFiles(data || []);
  }

  async function handleAddMedicalHistory(e) {
    e.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (
      !diagnosis &&
      !symptoms &&
      !treatment &&
      !medications &&
      !allergies &&
      !notes
    ) {
      setErrorMessage(
        "Please enter at least one medical history detail."
      );
      return;
    }

    try {
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
        .insert({
          patient_id: id,
          diagnosis: diagnosis || null,
          symptoms: symptoms || null,
          treatment: treatment || null,
          medications: medications || null,
          allergies: allergies || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error(
          "ADD MEDICAL HISTORY ERROR:",
          error
        );

        setErrorMessage(
          `Unable to add medical history: ${getErrorMessage(error)}`
        );

        return;
      }

      setMedicalHistory((current) => [data, ...current]);

      setDiagnosis("");
      setSymptoms("");
      setTreatment("");
      setMedications("");
      setAllergies("");
      setNotes("");

      setSuccessMessage(
        "Medical history added successfully."
      );
    } catch (error) {
      console.error("MEDICAL HISTORY ERROR:", error);

      setErrorMessage(
        `Medical history error: ${getErrorMessage(error)}`
      );
    }
  }

  async function handleFileUpload() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!selectedFile) {
      setErrorMessage("Please choose a file first.");
      return;
    }

    // 10 MB limit
    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMessage("File size must not exceed 10 MB.");
      return;
    }

    setUploading(true);

    try {
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

      const fileExtension =
        selectedFile.name
          .split(".")
          .pop()
          ?.toLowerCase() || "file";

      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 10)}.${fileExtension}`;

      const filePath = `${id}/${fileName}`;

      // Upload to private Supabase Storage bucket
      const { error: uploadError } = await supabase.storage
        .from("medical-files")
        .upload(filePath, selectedFile);

      if (uploadError) {
        console.error(
          "STORAGE UPLOAD ERROR:",
          uploadError
        );

        setErrorMessage(
          `Unable to upload file: ${getErrorMessage(uploadError)}`
        );

        return;
      }

      // Save file information in database
      const {
        data: insertedFile,
        error: databaseError,
      } = await supabase
        .from("medical_files")
        .insert({
          patient_id: id,
          file_name: selectedFile.name,
          file_path: filePath,
          file_type:
            selectedFile.type ||
            "application/octet-stream",
        })
        .select()
        .single();

      if (databaseError) {
        console.error(
          "MEDICAL FILE DATABASE ERROR:",
          databaseError
        );

        // Remove uploaded file if database insert fails
        await supabase.storage
          .from("medical-files")
          .remove([filePath]);

        setErrorMessage(
          `File upload failed: ${getErrorMessage(databaseError)}`
        );

        return;
      }

      setMedicalFiles((current) => [
        insertedFile,
        ...current,
      ]);

      // Clear selected file after successful upload
      setSelectedFile(null);

      const fileInput = document.getElementById(
        "medical-file-input"
      );

      if (fileInput) {
        fileInput.value = "";
      }

      setSuccessMessage(
        "Medical document uploaded successfully."
      );
    } catch (error) {
      console.error("UPLOAD ERROR:", error);

      setErrorMessage(
        `Upload error: ${getErrorMessage(error)}`
      );
    } finally {
      setUploading(false);
    }
  }

  function handleCancelUpload() {
    setSelectedFile(null);
    setErrorMessage("");
    setSuccessMessage("");

    const fileInput = document.getElementById(
      "medical-file-input"
    );

    if (fileInput) {
      fileInput.value = "";
    }
  }

  async function handleViewFile(file) {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data, error } = await supabase.storage
        .from("medical-files")
        .createSignedUrl(file.file_path, 300);

      if (error) {
        console.error(
          "VIEW FILE ERROR:",
          error
        );

        setErrorMessage(
          `Unable to view file: ${getErrorMessage(error)}`
        );

        return;
      }

      if (!data?.signedUrl) {
        setErrorMessage(
          "Unable to create file viewing link."
        );
        return;
      }

      window.open(data.signedUrl, "_blank");

      setSuccessMessage(
        "Medical document opened."
      );
    } catch (error) {
      console.error(
        "VIEW FILE ERROR:",
        error
      );

      setErrorMessage(
        `View error: ${getErrorMessage(error)}`
      );
    }
  }

  async function handleDownloadFile(file) {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data, error } = await supabase.storage
        .from("medical-files")
        .download(file.file_path);

      if (error) {
        console.error(
          "DOWNLOAD FILE ERROR:",
          error
        );

        setErrorMessage(
          `Unable to download file: ${getErrorMessage(error)}`
        );

        return;
      }

      if (!data) {
        setErrorMessage(
          "Unable to download file."
        );
        return;
      }

      const url =
        window.URL.createObjectURL(data);

      const link =
        document.createElement("a");

      link.href = url;
      link.download =
        file.file_name ||
        "medical-document";

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

      setSuccessMessage(
        "Medical document downloaded successfully."
      );
    } catch (error) {
      console.error(
        "DOWNLOAD FILE ERROR:",
        error
      );

      setErrorMessage(
        `Download error: ${getErrorMessage(error)}`
      );
    }
  }

  async function handleDeleteFile(file) {
    setErrorMessage("");
    setSuccessMessage("");

    const confirmed = window.confirm(
      `Are you sure you want to delete "${file.file_name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
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

      // Delete file from Supabase Storage
      const { error: storageError } =
        await supabase.storage
          .from("medical-files")
          .remove([file.file_path]);

      if (storageError) {
        console.error(
          "STORAGE DELETE ERROR:",
          storageError
        );

        setErrorMessage(
          `Unable to delete file: ${getErrorMessage(
            storageError
          )}`
        );

        return;
      }

      // Delete file record from database
      const { error: databaseError } =
        await supabase
          .from("medical_files")
          .delete()
          .eq("id", file.id)
          .eq("patient_id", id);

      if (databaseError) {
        console.error(
          "DATABASE DELETE ERROR:",
          databaseError
        );

        setErrorMessage(
          `File was removed from storage, but database deletion failed: ${getErrorMessage(
            databaseError
          )}`
        );

        return;
      }

      setMedicalFiles((current) =>
        current.filter(
          (currentFile) =>
            currentFile.id !== file.id
        )
      );

      setSuccessMessage(
        "Medical document deleted successfully."
      );
    } catch (error) {
      console.error(
        "DELETE FILE ERROR:",
        error
      );

      setErrorMessage(
        `Delete error: ${getErrorMessage(error)}`
      );
    }
  }

  if (loading) {
    return (
      <main
        style={{
          padding: "40px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <h1 style={{ color: "#111827" }}>
          Loading patient...
        </h1>
      </main>
    );
  }

  if (!patient) {
    return (
      <main
        style={{
          padding: "40px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <h1 style={{ color: "#111827" }}>
          Patient not found
        </h1>

        <button
          onClick={() =>
            router.push("/patient-records")
          }
          style={{
            marginTop: "20px",
            padding: "10px 16px",
            border: "none",
            borderRadius: "8px",
            backgroundColor: "#2563eb",
            color: "white",
            cursor: "pointer",
          }}
        >
          Back to Patient Records
        </button>
      </main>
    );
  }

  return (
    <main
      style={{
        padding: "40px",
        maxWidth: "1200px",
        margin: "0 auto",
        color: "#111827",
      }}
    >
      {/* BACK BUTTON */}
      <button
        onClick={() =>
          router.push("/patient-records")
        }
        style={{
          padding: "10px 16px",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          backgroundColor: "white",
          color: "#111827",
          cursor: "pointer",
          marginBottom: "20px",
          fontWeight: "600",
        }}
      >
        ← Back to Patient Records
      </button>

      <h1
        style={{
          fontSize: "32px",
          fontWeight: "700",
          marginBottom: "20px",
          color: "#111827",
        }}
      >
        Patient Details
      </h1>

      {/* ERROR MESSAGE */}
      {errorMessage && (
        <div
          style={{
            backgroundColor: "#fee2e2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            padding: "14px",
            borderRadius: "8px",
            marginBottom: "15px",
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* SUCCESS MESSAGE */}
      {successMessage && (
        <div
          style={{
            backgroundColor: "#dcfce7",
            border: "1px solid #bbf7d0",
            color: "#166534",
            padding: "14px",
            borderRadius: "8px",
            marginBottom: "15px",
          }}
        >
          {successMessage}
        </div>
      )}

      {/* PATIENT INFORMATION */}
      <section
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <h2
          style={{
            color: "#111827",
            fontSize: "24px",
            marginBottom: "18px",
          }}
        >
          Patient Information
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "15px",
          }}
        >
          <div>
            <strong>Patient ID:</strong>
            <div>
              {patient.patient_number || "N/A"}
            </div>
          </div>

          <div>
            <strong>Name:</strong>
            <div>
              {patient.first_name || ""}{" "}
              {patient.middle_name || ""}{" "}
              {patient.last_name || ""}
            </div>
          </div>

          <div>
            <strong>Date of Birth:</strong>
            <div>
              {patient.date_of_birth || "N/A"}
            </div>
          </div>

          <div>
            <strong>Gender:</strong>
            <div>
              {patient.gender || "N/A"}
            </div>
          </div>

          <div>
            <strong>Contact Number:</strong>
            <div>
              {patient.contact_number || "N/A"}
            </div>
          </div>

          <div>
            <strong>Email:</strong>
            <div>
              {patient.email || "N/A"}
            </div>
          </div>
        </div>

        {/* EMR AND PRESCRIPTIONS */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginTop: "24px",
          }}
        >
          <button
            onClick={() =>
              router.push(
                `/patient-records/${id}/emr`
              )
            }
            style={{
              padding: "12px 20px",
              border: "none",
              borderRadius: "8px",
              backgroundColor: "#2563eb",
              color: "white",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            EMR
          </button>

          <button
            onClick={() =>
              router.push(
                `/patient-records/${id}/prescriptions`
              )
            }
            style={{
              padding: "12px 20px",
              border: "none",
              borderRadius: "8px",
              backgroundColor: "#7c3aed",
              color: "white",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Prescription Management
          </button>
        </div>
      </section>

      {/* MEDICAL DOCUMENTS */}
      <section
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <h2
          style={{
            color: "#111827",
            fontSize: "24px",
            marginBottom: "8px",
          }}
        >
          Medical Documents
        </h2>

        <p
          style={{
            color: "#4b5563",
            marginBottom: "20px",
          }}
        >
          Upload, view, download, and delete
          medical documents for this patient.
        </p>

        {/* UPLOAD AREA */}
        <div
          style={{
            border: "1px solid #d1d5db",
            borderRadius: "10px",
            padding: "20px",
            marginBottom: "24px",
            backgroundColor: "#f9fafb",
          }}
        >
          <h3
            style={{
              color: "#111827",
              fontSize: "18px",
              marginBottom: "8px",
            }}
          >
            Upload File
          </h3>

          <p
            style={{
              color: "#6b7280",
              marginBottom: "14px",
            }}
          >
            Maximum file size: 10 MB
          </p>

          <input
            id="medical-file-input"
            type="file"
            onChange={(e) =>
              setSelectedFile(
                e.target.files?.[0] || null
              )
            }
            style={{
              display: "block",
              marginBottom: "14px",
              color: "#111827",
            }}
          />

          {selectedFile && (
            <p
              style={{
                color: "#111827",
                marginBottom: "14px",
              }}
            >
              Selected file:{" "}
              <strong>
                {selectedFile.name}
              </strong>
            </p>
          )}

          {/* UPLOAD + CANCEL BUTTONS */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={handleFileUpload}
              disabled={!selectedFile || uploading}
              style={{
                padding: "11px 20px",
                border: "none",
                borderRadius: "8px",
                backgroundColor:
                  !selectedFile || uploading
                    ? "#9ca3af"
                    : "#16a34a",
                color: "white",
                cursor:
                  !selectedFile || uploading
                    ? "not-allowed"
                    : "pointer",
                fontWeight: "600",
              }}
            >
              {uploading
                ? "Uploading..."
                : "Upload File"}
            </button>

            {selectedFile && !uploading && (
              <button
                type="button"
                onClick={handleCancelUpload}
                style={{
                  padding: "11px 20px",
                  border: "none",
                  borderRadius: "8px",
                  backgroundColor: "#6b7280",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Cancel Upload
              </button>
            )}
          </div>
        </div>

        {/* UPLOADED DOCUMENTS */}
        <h3
          style={{
            color: "#111827",
            fontSize: "20px",
            marginBottom: "15px",
          }}
        >
          Uploaded Documents
        </h3>

        {medicalFiles.length === 0 ? (
          <p
            style={{
              color: "#6b7280",
            }}
          >
            No medical documents uploaded yet.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {medicalFiles.map((file) => (
              <div
                key={file.id}
                style={{
                  border:
                    "1px solid #e5e7eb",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: "15px",
                  flexWrap: "wrap",
                  backgroundColor: "#ffffff",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: "600",
                      color: "#111827",
                      marginBottom: "4px",
                    }}
                  >
                    {file.file_name}
                  </div>

                  <div
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                    }}
                  >
                    {file.file_type ||
                      "Unknown file type"}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      handleViewFile(file)
                    }
                    style={{
                      padding: "9px 14px",
                      border: "none",
                      borderRadius: "7px",
                      backgroundColor:
                        "#2563eb",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: "600",
                    }}
                  >
                    View File
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadFile(file)
                    }
                    style={{
                      padding: "9px 14px",
                      border: "none",
                      borderRadius: "7px",
                      backgroundColor:
                        "#16a34a",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: "600",
                    }}
                  >
                    Download
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteFile(file)
                    }
                    style={{
                      padding: "9px 14px",
                      border: "none",
                      borderRadius: "7px",
                      backgroundColor:
                        "#dc2626",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: "600",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ADD MEDICAL HISTORY */}
      <section
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <h2
          style={{
            color: "#111827",
            fontSize: "24px",
            marginBottom: "18px",
          }}
        >
          Add Medical History
        </h2>

        <form onSubmit={handleAddMedicalHistory}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "15px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  color: "#111827",
                  marginBottom: "6px",
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
                style={{
                  width: "100%",
                  padding: "10px",
                  border:
                    "1px solid #d1d5db",
                  borderRadius: "7px",
                  color: "#111827",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  color: "#111827",
                  marginBottom: "6px",
                }}
              >
                Symptoms
              </label>

              <input
                type="text"
                value={symptoms}
                onChange={(e) =>
                  setSymptoms(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  border:
                    "1px solid #d1d5db",
                  borderRadius: "7px",
                  color: "#111827",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  color: "#111827",
                  marginBottom: "6px",
                }}
              >
                Treatment
              </label>

              <input
                type="text"
                value={treatment}
                onChange={(e) =>
                  setTreatment(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  border:
                    "1px solid #d1d5db",
                  borderRadius: "7px",
                  color: "#111827",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  color: "#111827",
                  marginBottom: "6px",
                }}
              >
                Medications
              </label>

              <input
                type="text"
                value={medications}
                onChange={(e) =>
                  setMedications(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  border:
                    "1px solid #d1d5db",
                  borderRadius: "7px",
                  color: "#111827",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  color: "#111827",
                  marginBottom: "6px",
                }}
              >
                Allergies
              </label>

              <input
                type="text"
                value={allergies}
                onChange={(e) =>
                  setAllergies(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  border:
                    "1px solid #d1d5db",
                  borderRadius: "7px",
                  color: "#111827",
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: "15px" }}>
            <label
              style={{
                display: "block",
                fontWeight: "600",
                color: "#111827",
                marginBottom: "6px",
              }}
            >
              Notes
            </label>

            <textarea
              value={notes}
              onChange={(e) =>
                setNotes(e.target.value)
              }
              rows={5}
              style={{
                width: "100%",
                padding: "10px",
                border:
                  "1px solid #d1d5db",
                borderRadius: "7px",
                color: "#111827",
                resize: "vertical",
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              marginTop: "18px",
              padding: "11px 20px",
              border: "none",
              borderRadius: "8px",
              backgroundColor: "#2563eb",
              color: "white",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Add Medical History
          </button>
        </form>
      </section>

      {/* MEDICAL HISTORY */}
      <section
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "40px",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <h2
          style={{
            color: "#111827",
            fontSize: "24px",
            marginBottom: "18px",
          }}
        >
          Medical History
        </h2>

        {medicalHistory.length === 0 ? (
          <p
            style={{
              color: "#6b7280",
            }}
          >
            No medical history records yet.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "15px",
            }}
          >
            {medicalHistory.map((history) => (
              <div
                key={history.id}
                style={{
                  border:
                    "1px solid #e5e7eb",
                  borderRadius: "10px",
                  padding: "18px",
                  backgroundColor: "#f9fafb",
                }}
              >
                <p style={{ color: "#111827" }}>
                  <strong>Diagnosis:</strong>{" "}
                  {history.diagnosis || "N/A"}
                </p>

                <p style={{ color: "#111827" }}>
                  <strong>Symptoms:</strong>{" "}
                  {history.symptoms || "N/A"}
                </p>

                <p style={{ color: "#111827" }}>
                  <strong>Treatment:</strong>{" "}
                  {history.treatment || "N/A"}
                </p>

                <p style={{ color: "#111827" }}>
                  <strong>Medications:</strong>{" "}
                  {history.medications || "N/A"}
                </p>

                <p style={{ color: "#111827" }}>
                  <strong>Allergies:</strong>{" "}
                  {history.allergies || "N/A"}
                </p>

                <p style={{ color: "#111827" }}>
                  <strong>Notes:</strong>{" "}
                  {history.notes || "N/A"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}