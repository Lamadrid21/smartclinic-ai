"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";

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
        updated_at,
        doctor_id,
        waiting_time,
        check_in_at,
        consultation_fee,
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
      const isExpired =
        appointment.appointment_date < currentDate ||
        (appointment.appointment_date === currentDate &&
          appointment.end_time <= currentTime);

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
          updateError.message
        );
      }
    }
  }

  async function confirmAppointment(id) {
    if (actionLoading) return;

    const confirmed = window.confirm(
      "Are you sure you want to confirm this appointment?"
    );

    if (!confirmed) return;

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
        status: "Confirmed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("patient_id", user.id)
      .eq("status", "Pending");

    if (error) {
      alert("Failed to confirm appointment: " + error.message);
      setActionLoading(false);
      return;
    }

    await loadAppointments();
    setActionLoading(false);
  }

  async function checkInAppointment(appointment) {
    if (actionLoading) return;

    const confirmed = window.confirm(
      "Are you sure you want to check in for this appointment?"
    );

    if (!confirmed) return;

    setActionLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const checkInTime = new Date();

    const scheduledTime = new Date(
      `${appointment.appointment_date}T${appointment.start_time}`
    );

    let waitingTime = Math.round(
      (checkInTime.getTime() - scheduledTime.getTime()) / 60000
    );

    if (waitingTime < 0) {
      waitingTime = 0;
    }

    if (waitingTime > 30) {
      waitingTime = 30;
    }

    const { error } = await supabase
      .from("appointments")
      .update({
        status: "Checked In",
        check_in_at: checkInTime.toISOString(),
        waiting_time: waitingTime,
        updated_at: checkInTime.toISOString(),
      })
      .eq("id", appointment.id)
      .eq("patient_id", user.id)
      .eq("status", "Confirmed");

    if (error) {
      alert("Failed to check in: " + error.message);
      setActionLoading(false);
      return;
    }

    await loadAppointments();
    setActionLoading(false);
  }

  async function completeAppointment(id) {
    if (actionLoading) return;

    const confirmed = window.confirm(
      "Are you sure you want to mark this appointment as completed?"
    );

    if (!confirmed) return;

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
        status: "Completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("patient_id", user.id)
      .eq("status", "Checked In");

    if (error) {
      alert("Failed to complete appointment: " + error.message);
      setActionLoading(false);
      return;
    }

    await loadAppointments();
    setActionLoading(false);
  }

  async function cancelAppointment(id) {
    if (actionLoading) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this appointment?"
    );

    if (!confirmed) return;

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
      .eq("patient_id", user.id)
      .in("status", ["Pending", "Confirmed"]);

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

    const confirmed = window.confirm(
      "Remove this appointment so you can choose another doctor?"
    );

    if (!confirmed) return;

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
      alert("Failed to remove appointment: " + error.message);
      setActionLoading(false);
      return;
    }

    router.push("/appointments");
  }

  function editAppointment(id) {
    router.push("/appointments?reschedule=" + id);
  }

  function getStatusStyle(status) {
    switch (status) {
      case "Pending":
        return {
          backgroundColor: "#fff7ed",
          color: "#c2410c",
          border: "1px solid #fed7aa",
        };

      case "Confirmed":
        return {
          backgroundColor: "#ecfdf5",
          color: "#047857",
          border: "1px solid #a7f3d0",
        };

      case "Checked In":
        return {
          backgroundColor: "rgba(168,85,247,0.12)",
          color: "#c084fc",
          border: "1px solid rgba(168,85,247,0.25)",
        };

      case "Completed":
        return {
          backgroundColor: "rgba(59,130,246,0.12)",
          color: "#93c5fd",
          border: "1px solid rgba(59,130,246,0.25)",
        };

      case "Cancelled":
        return {
          backgroundColor: "rgba(244,63,94,0.12)",
          color: "#fda4af",
          border: "1px solid #fecaca",
        };

      case "Expired":
        return {
          backgroundColor: "rgba(15,23,42,0.55)",
          color: "#94a3b8",
          border: "1px solid rgba(255,255,255,0.12)",
        };

      default:
        return {
          backgroundColor: "rgba(15,23,42,0.55)",
          color: "#e2e8f0",
          border: "1px solid rgba(255,255,255,0.12)",
        };
    }
  }

  function formatDate(date) {
    if (!date) return "N/A";

    return new Date(
      date + "T00:00:00"
    ).toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTime(time) {
    if (!time) return "N/A";

    return new Date(
      `1970-01-01T${time}`
    ).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatFee(fee) {
    if (fee === null || fee === undefined) {
      return "₱0.00";
    }

    return (
      "₱" +
      Number(fee).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function formatCheckIn(checkIn) {
    if (!checkIn) return "Not checked in";

    return new Date(checkIn).toLocaleString("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
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

  const pendingCount = appointments.filter(
    (appointment) => appointment.status === "Pending"
  ).length;

  const confirmedCount = appointments.filter(
    (appointment) => appointment.status === "Confirmed"
  ).length;

  const checkedInCount = appointments.filter(
    (appointment) => appointment.status === "Checked In"
  ).length;

  return (
    <AppLayout
      title="My Appointments"
      subtitle="View and manage your appointments"
      activeNav="appointments-manage"
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            border: "none",
            backgroundColor: "rgba(15,23,42,0.6)",
            color: "#e2e8f0",
            padding: "10px 16px",
            borderRadius: "9px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            marginBottom: "24px",
          }}
        >
          ← Back to Dashboard
        </button>

        <div
          style={{
            marginBottom: "28px",
          }}
        >
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "800",
              margin: 0,
              color: "#f1f5f9",
            }}
          >
            My Appointments
          </h1>

          <p
            style={{
              marginTop: "8px",
              marginBottom: 0,
              color: "#94a3b8",
              fontSize: "15px",
            }}
          >
            View, edit, and manage your clinic appointments.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(15,23,42,0.6)",
              borderRadius: "14px",
              padding: "20px",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#94a3b8",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              Total Appointments
            </p>

            <h2
              style={{
                margin: "8px 0 0",
                fontSize: "28px",
                color: "#f1f5f9",
              }}
            >
              {appointments.length}
            </h2>
          </div>

          <div
            style={{
              backgroundColor: "rgba(15,23,42,0.6)",
              borderRadius: "14px",
              padding: "20px",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#94a3b8",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              Pending
            </p>

            <h2
              style={{
                margin: "8px 0 0",
                fontSize: "28px",
                color: "#c2410c",
              }}
            >
              {pendingCount}
            </h2>
          </div>

          <div
            style={{
              backgroundColor: "rgba(15,23,42,0.6)",
              borderRadius: "14px",
              padding: "20px",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#94a3b8",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              Confirmed
            </p>

            <h2
              style={{
                margin: "8px 0 0",
                fontSize: "28px",
                color: "#047857",
              }}
            >
              {confirmedCount}
            </h2>
          </div>

          <div
            style={{
              backgroundColor: "rgba(15,23,42,0.6)",
              borderRadius: "14px",
              padding: "20px",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#94a3b8",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              Checked In
            </p>

            <h2
              style={{
                margin: "8px 0 0",
                fontSize: "28px",
                color: "#c084fc",
              }}
            >
              {checkedInCount}
            </h2>
          </div>

          <div
            style={{
              backgroundColor: "rgba(15,23,42,0.6)",
              borderRadius: "14px",
              padding: "20px",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#94a3b8",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              History
            </p>

            <h2
              style={{
                margin: "8px 0 0",
                fontSize: "28px",
                color: "#e2e8f0",
              }}
            >
              {historyAppointments.length}
            </h2>
          </div>
        </div>

        <section
          style={{
            backgroundColor: "rgba(15,23,42,0.6)",
            borderRadius: "16px",
            padding: "28px",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "15px",
              flexWrap: "wrap",
              marginBottom: "24px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "22px",
                  fontWeight: "750",
                  color: "#f1f5f9",
                }}
              >
                Active Appointments
              </h2>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#94a3b8",
                  fontSize: "14px",
                }}
              >
                Your upcoming appointments.
              </p>
            </div>

            <button
              onClick={() => router.push("/appointments")}
              style={{
                border: "none",
                borderRadius: "9px",
                padding: "11px 17px",
                backgroundColor: "#2563eb",
                color: "white",
                fontSize: "14px",
                fontWeight: "650",
                cursor: "pointer",
              }}
            >
              + Book Appointment
            </button>
          </div>

          {loading ? (
            <div
              style={{
                padding: "50px 20px",
                textAlign: "center",
                color: "#94a3b8",
              }}
            >
              Loading appointments...
            </div>
          ) : activeAppointments.length === 0 ? (
            <div
              style={{
                padding: "50px 20px",
                textAlign: "center",
                backgroundColor: "rgba(15,23,42,0.55)",
                borderRadius: "12px",
                border: "1px dashed rgba(255,255,255,0.2)",
              }}
            >
              <div
                style={{
                  fontSize: "40px",
                  marginBottom: "12px",
                }}
              >
                📅
              </div>

              <h3
                style={{
                  margin: 0,
                  color: "#f1f5f9",
                  fontSize: "18px",
                }}
              >
                No active appointments
              </h3>

              <p
                style={{
                  color: "#94a3b8",
                  margin: "8px 0 18px",
                }}
              >
                You currently have no upcoming appointments.
              </p>

              <button
                onClick={() => router.push("/appointments")}
                style={{
                  border: "none",
                  borderRadius: "9px",
                  padding: "11px 18px",
                  backgroundColor: "#2563eb",
                  color: "white",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Book an Appointment
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "18px",
              }}
            >
              {activeAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "14px",
                    padding: "22px",
                    backgroundColor: "rgba(15,23,42,0.6)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "15px",
                      flexWrap: "wrap",
                      marginBottom: "18px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "20px",
                          fontWeight: "750",
                          color: "#f1f5f9",
                        }}
                      >
                        {appointment.doctors?.name || "Doctor"}
                      </h3>

                      <p
                        style={{
                          margin: "5px 0 0",
                          color: "#94a3b8",
                          fontSize: "14px",
                        }}
                      >
                        {appointment.doctors?.specialization ||
                          "General Practice"}
                      </p>
                    </div>

                    <span
                      style={{
                        padding: "7px 13px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: "700",
                        ...getStatusStyle(appointment.status),
                      }}
                    >
                      {appointment.status}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "14px",
                      padding: "18px",
                      backgroundColor: "rgba(15,23,42,0.55)",
                      borderRadius: "11px",
                      marginBottom: "18px",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          color: "#94a3b8",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        DATE
                      </p>

                      <p
                        style={{
                          margin: "5px 0 0",
                          color: "#f1f5f9",
                          fontWeight: "650",
                        }}
                      >
                        {formatDate(appointment.appointment_date)}
                      </p>
                    </div>

                    <div>
                      <p
                        style={{
                          margin: 0,
                          color: "#94a3b8",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        TIME
                      </p>

                      <p
                        style={{
                          margin: "5px 0 0",
                          color: "#f1f5f9",
                          fontWeight: "650",
                        }}
                      >
                        {formatTime(appointment.start_time)} -{" "}
                        {formatTime(appointment.end_time)}
                      </p>
                    </div>

                    <div>
                      <p
                        style={{
                          margin: 0,
                          color: "#94a3b8",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        WAITING TIME
                      </p>

                      <p
                        style={{
                          margin: "5px 0 0",
                          color: "#f1f5f9",
                          fontWeight: "650",
                        }}
                      >
                        {appointment.waiting_time ?? 0} minutes
                      </p>
                    </div>

                    <div>
                      <p
                        style={{
                          margin: 0,
                          color: "#94a3b8",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        CHECK-IN
                      </p>

                      <p
                        style={{
                          margin: "5px 0 0",
                          color: "#f1f5f9",
                          fontWeight: "650",
                        }}
                      >
                        {formatCheckIn(appointment.check_in_at)}
                      </p>
                    </div>

                    <div>
                      <p
                        style={{
                          margin: 0,
                          color: "#94a3b8",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        CONSULTATION FEE
                      </p>

                      <p
                        style={{
                          margin: "5px 0 0",
                          color: "#f1f5f9",
                          fontWeight: "650",
                        }}
                      >
                        {formatFee(appointment.consultation_fee)}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      marginBottom: "18px",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "#94a3b8",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      REASON FOR APPOINTMENT
                    </p>

                    <p
                      style={{
                        margin: "6px 0 0",
                        color: "#e2e8f0",
                        lineHeight: "1.5",
                      }}
                    >
                      {appointment.reason || "No reason provided"}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "9px",
                    }}
                  >
                    {appointment.status === "Pending" && (
                      <>
                        <button
                          onClick={() =>
                            confirmAppointment(appointment.id)
                          }
                          disabled={actionLoading}
                          style={{
                            padding: "10px 15px",
                            border: "none",
                            borderRadius: "8px",
                            backgroundColor: "#16a34a",
                            color: "white",
                            fontWeight: "650",
                            cursor: actionLoading
                              ? "not-allowed"
                              : "pointer",
                          }}
                        >
                          Confirm
                        </button>

                        <button
                          onClick={() =>
                            editAppointment(appointment.id)
                          }
                          disabled={actionLoading}
                          style={{
                            padding: "10px 15px",
                            border: "none",
                            borderRadius: "8px",
                            backgroundColor: "#2563eb",
                            color: "white",
                            fontWeight: "650",
                            cursor: actionLoading
                              ? "not-allowed"
                              : "pointer",
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
                            padding: "10px 15px",
                            border: "none",
                            borderRadius: "8px",
                            backgroundColor: "rgba(15,23,42,0.55)",
                            color: "#dc2626",
                            border: "1px solid #fecaca",
                            fontWeight: "650",
                            cursor: actionLoading
                              ? "not-allowed"
                              : "pointer",
                          }}
                        >
                          Remove Doctor
                        </button>
                      </>
                    )}

                    {appointment.status === "Confirmed" && (
                      <>
                        <button
                          onClick={() =>
                            checkInAppointment(appointment)
                          }
                          disabled={actionLoading}
                          style={{
                            padding: "10px 15px",
                            border: "none",
                            borderRadius: "8px",
                            backgroundColor: "#9333ea",
                            color: "white",
                            fontWeight: "650",
                            cursor: actionLoading
                              ? "not-allowed"
                              : "pointer",
                          }}
                        >
                          Check In
                        </button>

                        <button
                          onClick={() =>
                            cancelAppointment(appointment.id)
                          }
                          disabled={actionLoading}
                          style={{
                            padding: "10px 15px",
                            border: "none",
                            borderRadius: "8px",
                            backgroundColor: "rgba(244,63,94,0.12)",
                            color: "#dc2626",
                            border: "1px solid #fecaca",
                            fontWeight: "650",
                            cursor: actionLoading
                              ? "not-allowed"
                              : "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {appointment.status === "Checked In" && (
                      <button
                        onClick={() =>
                          completeAppointment(appointment.id)
                        }
                        disabled={actionLoading}
                        style={{
                          padding: "10px 15px",
                          border: "none",
                          borderRadius: "8px",
                          backgroundColor: "#2563eb",
                          color: "white",
                          fontWeight: "650",
                          cursor: actionLoading
                            ? "not-allowed"
                            : "pointer",
                        }}
                      >
                        Mark Completed
                      </button>
                    )}

                    {appointment.status === "Pending" && (
                      <button
                        onClick={() =>
                          cancelAppointment(appointment.id)
                        }
                        disabled={actionLoading}
                        style={{
                          padding: "10px 15px",
                          border: "none",
                          borderRadius: "8px",
                          backgroundColor: "rgba(244,63,94,0.12)",
                          color: "#dc2626",
                          border: "1px solid #fecaca",
                          fontWeight: "650",
                          cursor: actionLoading
                            ? "not-allowed"
                            : "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          style={{
            backgroundColor: "rgba(15,23,42,0.6)",
            borderRadius: "16px",
            padding: "28px",
            border: "1px solid rgba(255,255,255,0.12)",
            marginTop: "24px",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <h2
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: "750",
                color: "#f1f5f9",
              }}
            >
              Appointment History
            </h2>

            <p
              style={{
                margin: "6px 0 0",
                color: "#94a3b8",
                fontSize: "14px",
              }}
            >
              Your completed, cancelled, and expired appointments.
            </p>
          </div>

          {historyAppointments.length === 0 ? (
            <div
              style={{
                padding: "30px",
                textAlign: "center",
                backgroundColor: "rgba(15,23,42,0.55)",
                borderRadius: "11px",
                color: "#94a3b8",
              }}
            >
              No appointment history yet.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              {historyAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  style={{
                    padding: "17px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "11px",
                    backgroundColor: "rgba(15,23,42,0.55)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "15px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <strong
                        style={{
                          color: "#f1f5f9",
                          fontSize: "15px",
                        }}
                      >
                        {appointment.doctors?.name || "Doctor"}
                      </strong>

                      <p
                        style={{
                          margin: "5px 0 0",
                          color: "#94a3b8",
                          fontSize: "13px",
                        }}
                      >
                        {appointment.doctors?.specialization ||
                          "N/A"}
                      </p>

                      <p
                        style={{
                          margin: "5px 0 0",
                          color: "#e2e8f0",
                          fontSize: "13px",
                        }}
                      >
                        {formatDate(appointment.appointment_date)}{" "}
                        • {formatTime(appointment.start_time)}
                      </p>

                      <p
                        style={{
                          margin: "5px 0 0",
                          color: "#94a3b8",
                          fontSize: "13px",
                        }}
                      >
                        Waiting Time:{" "}
                        {appointment.waiting_time ?? 0} minutes
                      </p>

                      {appointment.check_in_at && (
                        <p
                          style={{
                            margin: "5px 0 0",
                            color: "#94a3b8",
                            fontSize: "13px",
                          }}
                        >
                          Check-in:{" "}
                          {formatCheckIn(appointment.check_in_at)}
                        </p>
                      )}
                    </div>

                    <span
                      style={{
                        padding: "6px 11px",
                        borderRadius: "999px",
                        fontSize: "11px",
                        fontWeight: "700",
                        ...getStatusStyle(appointment.status),
                      }}
                    >
                      {appointment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}