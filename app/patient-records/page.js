"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function PatientRecordsPage() {
  const router = useRouter();

  const [patients, setPatients] = useState([]);
  const [archivedPatients, setArchivedPatients] = useState([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingArchived, setLoadingArchived] = useState(true);

  const [editingPatient, setEditingPatient] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPatients();
    loadArchivedPatients();
  }, []);

  // =========================
  // LOAD ACTIVE PATIENTS
  // =========================
  async function loadPatients() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("is_archived", false)
        .order("last_name", { ascending: true });

      if (error) {
        console.error("Error loading patients:", error);
        alert("Failed to load patients: " + error.message);
        return;
      }

      setPatients(data || []);
    } catch (error) {
      console.error(error);
      alert("Something went wrong while loading patients.");
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // LOAD ARCHIVED PATIENTS
  // =========================
  async function loadArchivedPatients() {
    try {
      setLoadingArchived(true);

      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("is_archived", true)
        .order("last_name", { ascending: true });

      if (error) {
        console.error(
          "Error loading archived patients:",
          error
        );

        alert(
          "Failed to load archived patients: " +
            error.message
        );

        return;
      }

      setArchivedPatients(data || []);
    } catch (error) {
      console.error(error);

      alert(
        "Something went wrong while loading archived patients."
      );
    } finally {
      setLoadingArchived(false);
    }
  }

  // =========================
  // CALCULATE AGE
  // =========================
  function calculateAge(dateOfBirth) {
    if (!dateOfBirth) {
      return "N/A";
    }

    const today = new Date();
    const birthDate = new Date(dateOfBirth);

    let age =
      today.getFullYear() -
      birthDate.getFullYear();

    const month =
      today.getMonth() -
      birthDate.getMonth();

    if (
      month < 0 ||
      (month === 0 &&
        today.getDate() <
          birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }

  // =========================
  // SEARCH ACTIVE PATIENTS
  // =========================
  const filteredPatients = patients.filter(
    (patient) => {
      const searchTerm = search.toLowerCase();

      const firstName = String(
        patient.first_name || ""
      );

      const middleName = String(
        patient.middle_name || ""
      );

      const lastName = String(
        patient.last_name || ""
      );

      const patientNumber = String(
        patient.patient_number || ""
      );

      const contactNumber = String(
        patient.contact_number || ""
      );

      const email = String(
        patient.email || ""
      );

      return (
        firstName
          .toLowerCase()
          .includes(searchTerm) ||
        middleName
          .toLowerCase()
          .includes(searchTerm) ||
        lastName
          .toLowerCase()
          .includes(searchTerm) ||
        patientNumber
          .toLowerCase()
          .includes(searchTerm) ||
        contactNumber
          .toLowerCase()
          .includes(searchTerm) ||
        email
          .toLowerCase()
          .includes(searchTerm)
      );
    }
  );

  // =========================
  // SEARCH ARCHIVED PATIENTS
  // =========================
  const filteredArchivedPatients =
    archivedPatients.filter(
      (patient) => {
        const searchTerm = search.toLowerCase();

        const firstName = String(
          patient.first_name || ""
        );

        const middleName = String(
          patient.middle_name || ""
        );

        const lastName = String(
          patient.last_name || ""
        );

        const patientNumber = String(
          patient.patient_number || ""
        );

        const contactNumber = String(
          patient.contact_number || ""
        );

        const email = String(
          patient.email || ""
        );

        return (
          firstName
            .toLowerCase()
            .includes(searchTerm) ||
          middleName
            .toLowerCase()
            .includes(searchTerm) ||
          lastName
            .toLowerCase()
            .includes(searchTerm) ||
          patientNumber
            .toLowerCase()
            .includes(searchTerm) ||
          contactNumber
            .toLowerCase()
            .includes(searchTerm) ||
          email
            .toLowerCase()
            .includes(searchTerm)
        );
      }
    );

  // =========================
  // START EDIT
  // =========================
  function startEdit(patient) {
    setEditingPatient({
      id: patient.id,

      patient_number:
        patient.patient_number || "",

      first_name:
        patient.first_name || "",

      middle_name:
        patient.middle_name || "",

      last_name:
        patient.last_name || "",

      date_of_birth:
        patient.date_of_birth || "",

      gender:
        patient.gender || "",

      contact_number:
        patient.contact_number || "",

      email:
        patient.email || "",
    });
  }


  function handleEditChange(event) {
    const {
      name,
      value,
    } = event.target;

    setEditingPatient(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  }

  
  async function saveEdit() {
    if (!editingPatient) {
      return;
    }

    try {
      setSaving(true);

      const { data, error } =
        await supabase
          .from("patients")
          .update({
            patient_number:
              editingPatient.patient_number,

            first_name:
              editingPatient.first_name,

            middle_name:
              editingPatient.middle_name ||
              null,

            last_name:
              editingPatient.last_name,

            date_of_birth:
              editingPatient.date_of_birth ||
              null,

            gender:
              editingPatient.gender ||
              null,

            contact_number:
              editingPatient.contact_number ||
              null,

            email:
              editingPatient.email ||
              null,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            editingPatient.id
          )
          .select()
          .single();

      if (error) {
        console.error(
          "Update patient error:",
          error
        );

        alert(
          "Failed to update patient: " +
            error.message
        );

        return;
      }

      if (!data) {
        alert(
          "Patient was not updated. Please check your Supabase RLS policies."
        );

        return;
      }

      alert(
        "Patient updated successfully."
      );

      setEditingPatient(null);

      await loadPatients();
      await loadArchivedPatients();
    } catch (error) {
      console.error(error);

      alert(
        "Something went wrong while updating the patient."
      );
    } finally {
      setSaving(false);
    }
  }

  
  async function archivePatient(id) {
  const confirmed = window.confirm(
    "Are you sure you want to archive this patient?"
  );

  if (!confirmed) {
    return;
  }

  const { data, error } = await supabase
    .from("patients")
    .update({
      is_archived: true
    })
    .eq("id", id)
    .select();

  console.log("ARCHIVE RESULT:", data);
  console.log("ARCHIVE ERROR:", error);

  if (error) {
    alert("Failed to archive patient: " + error.message);
    return;
  }

  if (!data || data.length === 0) {
    alert(
      "No patient was updated. Check your Supabase RLS UPDATE policy."
    );
    return;
  }

  alert("Patient archived successfully.");

  await loadPatients();
  await loadArchivedPatients();
}

 
  async function restorePatient(id) {
    const confirmed =
      window.confirm(
        "Are you sure you want to restore this patient?"
      );

    if (!confirmed) {
      return;
    }

    try {
      const { data, error } =
        await supabase
          .from("patients")
          .update({
            is_archived: false,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", id)
          .select(
            "id, patient_number, first_name, last_name, is_archived"
          )
          .single();

      if (error) {
        console.error(
          "Restore patient error:",
          error
        );

        alert(
          "Failed to restore patient: " +
            error.message
        );

        return;
      }

      if (!data) {
        alert(
          "The patient was not restored. Please check your Supabase RLS policies."
        );

        return;
      }

      if (data.is_archived !== false) {
        alert(
          "The patient was found, but is_archived did not become FALSE."
        );

        return;
      }

      alert(
        "Patient restored successfully."
      );

      await loadPatients();
      await loadArchivedPatients();
    } catch (error) {
      console.error(error);

      alert(
        "Something went wrong while restoring the patient."
      );
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px",
        backgroundColor: "#f5f7fb",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <button
          onClick={() =>
            router.push("/dashboard")
          }
          style={{
            marginBottom: "25px",
            padding: "10px 16px",
            border: "none",
            borderRadius: "8px",
            backgroundColor: "#e5e7eb",
            cursor: "pointer",
            fontWeight: "600",
            color: "#111827",
          }}
        >
          ← Back to Dashboard
        </button>

        <div
          style={{
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "14px",
            boxShadow:
              "0 4px 15px rgba(0,0,0,0.08)",
          }}
        >
          <h1
            style={{
              fontSize: "30px",
              fontWeight: "700",
              marginBottom: "8px",
              color: "#111827",
            }}
          >
            Patient Records
          </h1>

          <p
            style={{
              color: "#666",
              marginBottom: "25px",
            }}
          >
            Search, view, edit, archive,
            and restore patient records.
          </p>

          <input
            type="text"
            placeholder="Search patient by name, ID, contact, or email..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            style={{
              width: "100%",
              padding: "13px",
              marginBottom: "25px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              color: "#111827",
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          <h2
            style={{
              fontSize: "22px",
              marginBottom: "15px",
              color: "#111827",
            }}
          >
            Active Patients
          </h2>

          {loading ? (
            <p>Loading patients...</p>
          ) : filteredPatients.length ===
            0 ? (
            <div
              style={{
                padding: "30px",
                textAlign: "center",
                backgroundColor:
                  "#f9fafb",
                borderRadius: "10px",
              }}
            >
              <p
                style={{
                  color: "#666",
                }}
              >
                No active patient
                records found.
              </p>
            </div>
          ) : (
            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse:
                    "collapse",
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor:
                        "#f3f4f6",
                    }}
                  >
                    <th
                      style={headerStyle}
                    >
                      Patient ID
                    </th>

                    <th
                      style={headerStyle}
                    >
                      Name
                    </th>

                    <th
                      style={headerStyle}
                    >
                      Age
                    </th>

                    <th
                      style={headerStyle}
                    >
                      Gender
                    </th>

                    <th
                      style={headerStyle}
                    >
                      Contact
                    </th>

                    <th
                      style={headerStyle}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPatients.map(
                    (patient) => (
                      <tr
                        key={patient.id}
                      >
                        <td
                          style={cellStyle}
                        >
                          {patient.patient_number ||
                            "N/A"}
                        </td>

                        <td
                          style={cellStyle}
                        >
                          {patient.first_name ||
                            ""}{" "}
                          {patient.middle_name ||
                            ""}{" "}
                          {patient.last_name ||
                            ""}
                        </td>

                        <td
                          style={cellStyle}
                        >
                          {calculateAge(
                            patient.date_of_birth
                          )}
                        </td>

                        <td
                          style={cellStyle}
                        >
                          {patient.gender ||
                            "N/A"}
                        </td>

                        <td
                          style={cellStyle}
                        >
                          {patient.contact_number ||
                            "N/A"}
                        </td>

                        <td
                          style={cellStyle}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              flexWrap:
                                "wrap",
                              gap: "8px",
                            }}
                          >
                            <button
                              onClick={() =>
                                router.push(
                                  `/patient-records/${patient.id}`
                                )
                              }
                              style={{
                                ...buttonStyle,
                                backgroundColor:
                                  "#2563eb",
                              }}
                            >
                              View
                            </button>

                            <button
                              onClick={() =>
                                startEdit(
                                  patient
                                )
                              }
                              style={{
                                ...buttonStyle,
                                backgroundColor:
                                  "#16a34a",
                              }}
                            >
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                archivePatient(
                                  patient.id
                                )
                              }
                              style={{
                                ...buttonStyle,
                                backgroundColor:
                                  "#dc2626",
                              }}
                            >
                              Archive
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div
            style={{
              marginTop: "45px",
              paddingTop: "30px",
              borderTop:
                "1px solid #e5e7eb",
            }}
          >
            <h2
              style={{
                fontSize: "22px",
                marginBottom: "8px",
                color: "#111827",
              }}
            >
              Archived Patients
            </h2>

            <p
              style={{
                color: "#666",
                marginBottom: "20px",
              }}
            >
              Patients with is_archived =
              true appear here.
            </p>

            {loadingArchived ? (
              <p>
                Loading archived
                patients...
              </p>
            ) : filteredArchivedPatients.length ===
              0 ? (
              <div
                style={{
                  padding: "25px",
                  textAlign:
                    "center",
                  backgroundColor:
                    "#f9fafb",
                  borderRadius: "10px",
                }}
              >
                <p
                  style={{
                    color: "#666",
                  }}
                >
                  No archived
                  patients.
                </p>
              </div>
            ) : (
              <div
                style={{
                  overflowX: "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse:
                      "collapse",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor:
                          "#f3f4f6",
                      }}
                    >
                      <th
                        style={
                          headerStyle
                        }
                      >
                        Patient ID
                      </th>

                      <th
                        style={
                          headerStyle
                        }
                      >
                        Name
                      </th>

                      <th
                        style={
                          headerStyle
                        }
                      >
                        Age
                      </th>

                      <th
                        style={
                          headerStyle
                        }
                      >
                        Gender
                      </th>

                      <th
                        style={
                          headerStyle
                        }
                      >
                        Contact
                      </th>

                      <th
                        style={
                          headerStyle
                        }
                      >
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredArchivedPatients.map(
                      (patient) => (
                        <tr
                          key={
                            patient.id
                          }
                        >
                          <td
                            style={
                              cellStyle
                            }
                          >
                            {patient.patient_number ||
                              "N/A"}
                          </td>

                          <td
                            style={
                              cellStyle
                            }
                          >
                            {patient.first_name ||
                              ""}{" "}
                            {patient.middle_name ||
                              ""}{" "}
                            {patient.last_name ||
                              ""}
                          </td>

                          <td
                            style={
                              cellStyle
                            }
                          >
                            {calculateAge(
                              patient.date_of_birth
                            )}
                          </td>

                          <td
                            style={
                              cellStyle
                            }
                          >
                            {patient.gender ||
                              "N/A"}
                          </td>

                          <td
                            style={
                              cellStyle
                            }
                          >
                            {patient.contact_number ||
                              "N/A"}
                          </td>

                          <td
                            style={
                              cellStyle
                            }
                          >
                            <button
                              onClick={() =>
                                restorePatient(
                                  patient.id
                                )
                              }
                              style={{
                                ...buttonStyle,
                                backgroundColor:
                                  "#16a34a",
                              }}
                            >
                              Restore
                            </button>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {editingPatient && (
          <div
            style={{
              marginTop: "25px",
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "14px",
              boxShadow:
                "0 4px 15px rgba(0,0,0,0.08)",
            }}
          >
            <h2
              style={{
                fontSize: "24px",
                fontWeight: "700",
                marginBottom:
                  "25px",
                color: "#111827",
              }}
            >
              Edit Patient
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "18px",
              }}
            >
              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Patient Number
                </label>

                <input
                  name="patient_number"
                  value={
                    editingPatient.patient_number
                  }
                  onChange={
                    handleEditChange
                  }
                  style={
                    inputStyle
                  }
                />
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  First Name
                </label>

                <input
                  name="first_name"
                  value={
                    editingPatient.first_name
                  }
                  onChange={
                    handleEditChange
                  }
                  style={
                    inputStyle
                  }
                />
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Middle Name
                </label>

                <input
                  name="middle_name"
                  value={
                    editingPatient.middle_name
                  }
                  onChange={
                    handleEditChange
                  }
                  style={
                    inputStyle
                  }
                />
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Last Name
                </label>

                <input
                  name="last_name"
                  value={
                    editingPatient.last_name
                  }
                  onChange={
                    handleEditChange
                  }
                  style={
                    inputStyle
                  }
                />
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Date of Birth
                </label>

                <input
                  type="date"
                  name="date_of_birth"
                  value={
                    editingPatient.date_of_birth
                  }
                  onChange={
                    handleEditChange
                  }
                  style={
                    inputStyle
                  }
                />
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Gender
                </label>

                <select
                  name="gender"
                  value={
                    editingPatient.gender
                  }
                  onChange={
                    handleEditChange
                  }
                  style={
                    inputStyle
                  }
                >
                  <option value="">
                    Select Gender
                  </option>

                  <option value="Male">
                    Male
                  </option>

                  <option value="Female">
                    Female
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Contact Number
                </label>

                <input
                  name="contact_number"
                  value={
                    editingPatient.contact_number
                  }
                  onChange={
                    handleEditChange
                  }
                  style={
                    inputStyle
                  }
                />
              </div>

              <div>
                <label
                  style={
                    labelStyle
                  }
                >
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  value={
                    editingPatient.email
                  }
                  onChange={
                    handleEditChange
                  }
                  style={
                    inputStyle
                  }
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "25px",
              }}
            >
              <button
                onClick={
                  saveEdit
                }
                disabled={
                  saving
                }
                style={{
                  ...buttonStyle,
                  backgroundColor:
                    "#16a34a",
                  padding:
                    "11px 20px",
                  opacity:
                    saving
                      ? 0.6
                      : 1,
                }}
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>

              <button
                onClick={() =>
                  setEditingPatient(
                    null
                  )
                }
                disabled={
                  saving
                }
                style={{
                  ...buttonStyle,
                  backgroundColor:
                    "#6b7280",
                  padding:
                    "11px 20px",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

const headerStyle = {
  textAlign: "left",
  padding: "13px",
  borderBottom: "1px solid #ddd",
  color: "#374151",
};

const cellStyle = {
  padding: "13px",
  borderBottom: "1px solid #eee",
  color: "#111827",
};

const buttonStyle = {
  padding: "8px 13px",
  border: "none",
  borderRadius: "7px",
  color: "white",
  cursor: "pointer",
  fontWeight: "600",
};

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  fontWeight: "600",
  color: "#374151",
};

const inputStyle = {
  width: "100%",
  padding: "11px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  color: "#111827",
  backgroundColor: "white",
  boxSizing: "border-box",
};