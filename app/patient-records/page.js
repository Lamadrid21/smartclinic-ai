"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function PatientRecordsPage() {
  const router = useRouter();

  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    setLoading(true);

    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .order("last_name", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Error loading patients:",
        error
      );

      setLoading(false);
      return;
    }

    setPatients(data || []);
    setLoading(false);
  }

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

  const filteredPatients = patients.filter(
    (patient) => {
      const firstName =
        patient.first_name || "";

      const middleName =
        patient.middle_name || "";

      const lastName =
        patient.last_name || "";

      const patientNumber =
        patient.patient_number || "";

      const contactNumber =
        patient.contact_number || "";

      const searchTerm =
        search.toLowerCase();

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
          .includes(searchTerm)
      );
    }
  );

  return (
    <main
      style={{
        padding: "40px",
        maxWidth: "1200px",
        margin: "0 auto",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <h1>Patient Records</h1>

      <p>
        View and manage patient records.
      </p>

      <input
        type="text"
        placeholder="Search patient..."
        value={search}
        onChange={(e) =>
          setSearch(e.target.value)
        }
        style={{
          width: "100%",
          maxWidth: "500px",
          padding: "12px",
          marginTop: "20px",
          marginBottom: "25px",
          border: "1px solid #ccc",
          borderRadius: "6px",
        }}
      />

      {loading ? (
        <p>Loading patients...</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse:
              "collapse",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px",
                  borderBottom:
                    "1px solid #ddd",
                }}
              >
                Patient ID
              </th>

              <th
                style={{
                  textAlign: "left",
                  padding: "12px",
                  borderBottom:
                    "1px solid #ddd",
                }}
              >
                Name
              </th>

              <th
                style={{
                  textAlign: "left",
                  padding: "12px",
                  borderBottom:
                    "1px solid #ddd",
                }}
              >
                Age
              </th>

              <th
                style={{
                  textAlign: "left",
                  padding: "12px",
                  borderBottom:
                    "1px solid #ddd",
                }}
              >
                Gender
              </th>

              <th
                style={{
                  textAlign: "left",
                  padding: "12px",
                  borderBottom:
                    "1px solid #ddd",
                }}
              >
                Contact
              </th>

              <th
                style={{
                  textAlign: "left",
                  padding: "12px",
                  borderBottom:
                    "1px solid #ddd",
                }}
              >
                View
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredPatients.map(
              (patient) => (
                <tr key={patient.id}>
                  <td
                    style={{
                      padding: "12px",
                      borderBottom:
                        "1px solid #eee",
                    }}
                  >
                    {patient.patient_number}
                  </td>

                  <td
                    style={{
                      padding: "12px",
                      borderBottom:
                        "1px solid #eee",
                    }}
                  >
                    {patient.first_name}{" "}
                    {patient.middle_name || ""}{" "}
                    {patient.last_name}
                  </td>

                  <td
                    style={{
                      padding: "12px",
                      borderBottom:
                        "1px solid #eee",
                    }}
                  >
                    {calculateAge(
                      patient.date_of_birth
                    )}
                  </td>

                  <td
                    style={{
                      padding: "12px",
                      borderBottom:
                        "1px solid #eee",
                    }}
                  >
                    {patient.gender}
                  </td>

                  <td
                    style={{
                      padding: "12px",
                      borderBottom:
                        "1px solid #eee",
                    }}
                  >
                    {patient.contact_number}
                  </td>

                  <td
                    style={{
                      padding: "12px",
                      borderBottom:
                        "1px solid #eee",
                    }}
                  >
                    <button
                      onClick={() =>
                        router.push(
                          `/patient-records/${patient.id}`
                        )
                      }
                      style={{
                        padding:
                          "8px 14px",
                        background:
                          "#2563eb",
                        color: "white",
                        border: "none",
                        borderRadius:
                          "6px",
                        cursor:
                          "pointer",
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
    </main>
  );
}
