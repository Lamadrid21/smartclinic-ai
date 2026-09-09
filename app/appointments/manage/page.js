"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";

export default function ManageAppointmentsPage() {
  const router = useRouter();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadAppointments();

    const interval = setInterval(() => {
      loadAppointments();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  async function loadAppointments() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");
      return;
    }

    await updateExpiredAppointments(user.id);

    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        start_time,
        end_time,
        reason,
        status,
        created_at,
        doctor_id,
        doctors (
          name,
          specialization
        )
      `)
      .eq("patient_id", user.id)
      .order("appointment_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (error) {
      alert("Failed to load appointments: " + error.message);
      setLoading(false);
      return;
    }

    setAppointments(data || []);
    setLoading(false);
  }

  async function updateExpiredAppointments(userId) {
    const { data, error } = await supabase
      .from("appointments")
      .select("id, appointment_date, end_time, status")
      .eq("patient_id", userId)
      .in("status", ["Pending", "Confirmed"]);

    if (error || !data) {
      console.error("Expired appointment check error:", error);
      return;
    }

    const now = new Date();

    const currentDate =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0");

    const currentTime =
      String(now.getHours()).padStart(2, "0") +
      ":" +
      String(now.getMinutes()).padStart(2, "0") +
      ":" +
      String(now.getSeconds()).padStart(2, "0");

    for (const appointment of data) {
      const appointmentDate = appointment.appointment_date;
      const appointmentTime = appointment.end_time;

      const isExpired =
        appointmentDate < currentDate ||
        (appointmentDate === currentDate &&
          appointmentTime <= currentTime);

      if (!isExpired) continue;

      const newStatus =
        appointment.status === "Pending"
          ? "Expired"
          : "Completed";

      const { error: updateError } = await supabase
        .from("appointments")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", appointment.id)
        .eq("patient_id", userId);

      if (updateError) {
        console.error(
          "Failed to update appointment:",
          appointment.id,
          updateError.message
        );
      }
    }
  }

  async function updateStatus(id, newStatus) {
    if (actionLoading) return;

    const message =
      newStatus === "Confirmed"
        ? "Are you sure you want to confirm this appointment?"
        : "Are you sure you want to mark this appointment as completed?";

    if (!window.confirm(message)) return;

    setActionLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase
      .from("appointments")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("patient_id", user.id);

    if (error) {
      alert("Failed to update appointment: " + error.message);
      setActionLoading(false);
      return;
    }

    await loadAppointments();
    setActionLoading(false);
  }

  async function cancelAppointment(id) {
    if (actionLoading) return;

    if (
      !window.confirm(
        "Are you sure you want to cancel this appointment?"
      )
    ) {
      return;
    }

    setActionLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase
      .from("appointments")
      .update({
        status: "Cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("patient_id", user.id);

    if (error) {
      alert("Failed to cancel appointment: " + error.message);
      setActionLoading(false);
      return;
    }

    await loadAppointments();
    setActionLoading(false);
  }

  async function removeDoctorFromAppointment(id) {
    if (actionLoading) return;

    if (
      !window.confirm(
        "Remove this doctor from your pending appointment and choose another doctor?"
      )
    ) {
      return;
    }

    setActionLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id)
      .eq("patient_id", user.id)
      .eq("status", "Pending");

    if (error) {
      alert(
        "Failed to remove doctor from appointment: " +
          error.message
      );
      setActionLoading(false);
      return;
    }

    setActionLoading(false);

    router.push("/appointments");
  }

  function editAppointment(id) {
    router.push("/appointments?reschedule=" + id);
  }

  function getStatusStyle(status) {
    if (status === "Pending") {
      return {
        backgroundColor: "#fef3c7",
        color: "#92400e",
      };
    }

    if (status === "Confirmed") {
      return {
        backgroundColor: "#dcfce7",
        color: "#166534",
      };
    }

    if (status === "Completed") {
      return {
        backgroundColor: "#dbeafe",
        color: "#1e40af",
      };
    }

    if (status === "Cancelled") {
      return {
        backgroundColor: "#fee2e2",
        color: "#991b1b",
      };
    }

    if (status === "Expired") {
      return {
        backgroundColor: "#f3f4f6",
        color: "#4b5563",
      };
    }

    return {
      backgroundColor: "#e5e7eb",
      color: "#374151",
    };
  }

  function formatDate(date) {
    return new Date(
      date + "T00:00:00"
    ).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTime(time) {
    return new Date(
      `1970-01-01T${time}`
    ).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const activeAppointments = appointments.filter(
    (appointment) =>
      appointment.status !== "Cancelled" &&
      appointment.status !== "Completed" &&
      appointment.status !== "Expired"
  );

  const historyAppointments = appointments.filter(
    (appointment) =>
      appointment.status === "Cancelled" ||
      appointment.status === "Completed" ||
      appointment.status === "Expired"
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px",
        backgroundColor: "#f5f7fb",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            marginBottom: "25px",
            padding: "10px 16px",
            border: "none",
            borderRadius: "8px",
            backgroundColor: "#e5e7eb",
            cursor: "pointer",
          }}
        >
          ← Back to Dashboard
        </button>

        <div
          style={{
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "12px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
          }}
        >
          <h1
            style={{
              fontSize: "30px",
              fontWeight: "700",
              marginBottom: "8px",
            }}
          >
            My Appointments
          </h1>

          <p
            style={{
              color: "#666",
              marginBottom: "30px",
            }}
          >
            View and manage your appointments.
          </p>

          {loading ? (
            <p>Loading appointments...</p>
          ) : activeAppointments.length === 0 ? (
            <div
              style={{
                padding: "30px",
                textAlign: "center",
                backgroundColor: "#f9fafb",
                borderRadius: "10px",
              }}
            >
              <p style={{ color: "#666" }}>
                You have no active appointments.
              </p>

              <button
                onClick={() => router.push("/appointments")}
                style={{
                  marginTop: "15px",
                  padding: "10px 18px",
                  border: "none",
                  borderRadius: "8px",
                  backgroundColor: "#2563eb",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Book Appointment
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "20px",
              }}
            >
              {activeAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "10px",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "15px",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "20px",
                        fontWeight: "700",
                      }}
                    >
                      {appointment.doctors?.name || "Doctor"}
                    </h2>

                    <span
                      style={{
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontSize: "13px",
                        fontWeight: "600",
                        ...getStatusStyle(
                          appointment.status
                        ),
                      }}
                    >
                      {appointment.status}
                    </span>
                  </div>

                  <p style={{ color: "#555" }}>
                    Specialization:{" "}
                    {appointment.doctors?.specialization ||
                      "N/A"}
                  </p>

                  <p style={{ marginTop: "8px" }}>
                    Date:{" "}
                    <strong>
                      {formatDate(
                        appointment.appointment_date
                      )}
                    </strong>
                  </p>

                  <p style={{ marginTop: "8px" }}>
                    Time:{" "}
                    <strong>
                      {formatTime(
                        appointment.start_time
                      )}
                    </strong>
                  </p>

                  <p style={{ marginTop: "8px" }}>
                    Reason:{" "}
                    <strong>
                      {appointment.reason || "None"}
                    </strong>
                  </p>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                      marginTop: "20px",
                    }}
                  >
                    {appointment.status === "Pending" && (
                      <>
                        <button
                          onClick={() =>
                            updateStatus(
                              appointment.id,
                              "Confirmed"
                            )
                          }
                          disabled={actionLoading}
                          style={{
                            padding: "10px 16px",
                            border: "none",
                            borderRadius: "8px",
                            backgroundColor: "#16a34a",
                            color: "white",
                            cursor: actionLoading
                              ? "not-allowed"
                              : "pointer",
                            fontWeight: "600",
                          }}
                        >
                          Confirm
                        </button>

                        <button
                          onClick={() =>
                            editAppointment(
                              appointment.id
                            )
                          }
                          disabled={actionLoading}
                          style={{
                            padding: "10px 16px",
                            border: "none",
                            borderRadius: "8px",
                            backgroundColor: "#2563eb",
                            color: "white",
                            cursor: actionLoading
                              ? "not-allowed"
                              : "pointer",
                            fontWeight: "600",
                          }}
                        >
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            removeDoctorFromAppointment(
                              appointment.id
                            )
                          }
                          disabled={actionLoading}
                          style={{
                            padding: "10px 16px",
                            border: "none",
                            borderRadius: "8px",
                            backgroundColor: "#dc2626",
                            color: "white",
                            cursor: actionLoading
                              ? "not-allowed"
                              : "pointer",
                            fontWeight: "600",
                          }}
                        >
                          Remove Doctor
                        </button>
                      </>
                    )}

                    {appointment.status === "Confirmed" && (
                      <button
                        onClick={() =>
                          updateStatus(
                            appointment.id,
                            "Completed"
                          )
                        }
                        disabled={actionLoading}
                        style={{
                          padding: "10px 16px",
                          border: "none",
                          borderRadius: "8px",
                          backgroundColor: "#2563eb",
                          color: "white",
                          cursor: actionLoading
                            ? "not-allowed"
                            : "pointer",
                          fontWeight: "600",
                        }}
                      >
                        Complete
                      </button>
                    )}

                    {appointment.status !== "Confirmed" && (
                      <button
                        onClick={() =>
                          editAppointment(
                            appointment.id
                          )
                        }
                        disabled={actionLoading}
                        style={{
                          padding: "10px 16px",
                          border: "none",
                          borderRadius: "8px",
                          backgroundColor: "#6b7280",
                          color: "white",
                          cursor: actionLoading
                            ? "not-allowed"
                            : "pointer",
                        }}
                      >
                        Reschedule
                      </button>
                    )}

                    {appointment.status === "Pending" ||
                    appointment.status === "Confirmed" ? (
                      <button
                        onClick={() =>
                          cancelAppointment(
                            appointment.id
                          )
                        }
                        disabled={actionLoading}
                        style={{
                          padding: "10px 16px",
                          border: "none",
                          borderRadius: "8px",
                          backgroundColor: "#ef4444",
                          color: "white",
                          cursor: actionLoading
                            ? "not-allowed"
                            : "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: "40px" }}>
            <h2
              style={{
                fontSize: "24px",
                fontWeight: "700",
                marginBottom: "15px",
              }}
            >
              Appointment History
            </h2>

            {historyAppointments.length === 0 ? (
              <p style={{ color: "#666" }}>
                No appointment history yet.
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "15px",
                }}
              >
                {historyAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    style={{
                      padding: "18px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "10px",
                      backgroundColor: "#fafafa",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <strong>
                        {appointment.doctors?.name ||
                          "Doctor"}
                      </strong>

                      <span
                        style={{
                          padding: "5px 10px",
                          borderRadius: "15px",
                          fontSize: "12px",
                          fontWeight: "600",
                          ...getStatusStyle(
                            appointment.status
                          ),
                        }}
                      >
                        {appointment.status}
                      </span>
                    </div>

                    <p style={{ marginTop: "8px" }}>
                      {formatDate(
                        appointment.appointment_date
                      )}
                    </p>

                    <p style={{ marginTop: "5px" }}>
                      {formatTime(
                        appointment.start_time
                      )}
                    </p>

                    <p
                      style={{
                        marginTop: "5px",
                        color: "#666",
                      }}
                    >
                      {appointment.reason ||
                        "No reason provided"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}