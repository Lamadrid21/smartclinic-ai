"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { ROLES, getUserRole } from "@/lib/auth-role";

export default function ManageAppointmentsPage() {
  const router = useRouter();

  const [appointments, setAppointments] = useState([]);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(ROLES.PATIENT);
  const [patientNames, setPatientNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadAppointments();

    const interval = setInterval(() => {
      loadAppointments();
    }, 60000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAppointments() {
    setLoading(true);

    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      router.push("/login");
      return;
    }

    setUser(currentUser);
    const role = getUserRole(currentUser);
    setUserRole(role);

    if (role === ROLES.PATIENT) {
      await updateExpiredAppointments(currentUser.id);
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", currentUser.id)
      .single();

    const { data: profilesData } = await supabase.from("profiles").select("id, full_name");
    const { data: patientsData } = await supabase.from("patients").select("id, first_name, last_name, patient_number");
    
    const namesMap = {};
    if (profilesData) {
      profilesData.forEach(p => {
        if (p.id && p.full_name) namesMap[p.id] = p.full_name;
      });
    }
    if (patientsData) {
      patientsData.forEach(p => {
        if (p.id) {
          const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
          if (name) namesMap[p.id] = name;
        }
      });
    }
    setPatientNames(namesMap);

    let query = supabase
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
        patient_id,
        waiting_time,
        consultation_fee,
        doctors (
          name,
          specialization
        )
      `)
      .order("appointment_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (role === ROLES.PATIENT) {
      query = query.eq("patient_id", currentUser.id);
    } else if (role === ROLES.DOCTOR) {
      const docName = currentUser?.email === "1-240349@asiatech.edu.ph"
        ? "Dr. Renzo Lamadrid"
        : (profileData?.full_name || currentUser?.user_metadata?.full_name || currentUser?.email || "");
      const { data: docList } = await supabase.from("doctors").select("id, name");
      const matchedDoc = docList?.find(d => 
        d.name.toLowerCase().includes("renzo") ||
        (docName && (
          d.name.toLowerCase().includes(docName.toLowerCase().replace(/dr\.?|md|phd|,/g, "").trim()) ||
          docName.toLowerCase().includes(d.name.toLowerCase().replace(/dr\.?|md|phd|,/g, "").trim())
        ))
      ) || docList?.[0];

      if (matchedDoc?.id) {
        query = query.eq("doctor_id", matchedDoc.id);
      }
    }

    const { data, error } = await query;

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

    if (userRole !== ROLES.ADMIN) {
      alert("Only administrators can confirm appointment requests.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to confirm this appointment request?"
    );

    if (!confirmed) return;

    setActionLoading(true);

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
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
      .eq("status", "Pending");

    if (error) {
      alert("Failed to confirm appointment: " + error.message);
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
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
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
      .eq("status", "Confirmed");

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

    if (userRole === ROLES.DOCTOR) {
      alert("Doctors do not have permission to cancel appointments. Please contact an administrator.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to cancel this appointment?"
    );

    if (!confirmed) return;

    setActionLoading(true);

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      router.push("/login");
      return;
    }

    let query = supabase
      .from("appointments")
      .update({
        status: "Cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .in("status", ["Pending", "Confirmed"]);

    if (userRole === ROLES.PATIENT) {
      query = query.eq("patient_id", currentUser.id);
    }

    const { error } = await query;

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

    if (userRole !== ROLES.ADMIN) {
      alert("Only administrators can manage doctor assignments or remove appointments.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to remove this appointment?"
    );

    if (!confirmed) return;

    setActionLoading(true);

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      router.push("/login");
      return;
    }

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id)
      .eq("status", "Pending");

    if (error) {
      alert(
        "Failed to remove appointment: " + error.message
      );
      setActionLoading(false);
      return;
    }

    setActionLoading(false);
    await loadAppointments();
  }

  function getPatientDisplayName(patientId) {
    if (!patientId) return "Valued Patient";
    if (patientNames[patientId]) return patientNames[patientId];
    return "Patient";
  }

  function editAppointment(id) {
    if (userRole === ROLES.DOCTOR) {
      alert("Doctors do not have permission to edit or reschedule appointments.");
      return;
    }
    router.push("/appointments?reschedule=" + id);
  }

  function getStatusStyle(status) {
    switch (status) {
      case "Pending":
        return {
          backgroundColor: "var(--warning-bg)",
          color: "var(--warning-text)",
          border: "1px solid var(--card-border)",
        };

      case "Confirmed":
        return {
          backgroundColor: "var(--success-bg)",
          color: "var(--success-text)",
          border: "1px solid var(--card-border)",
        };

      case "Completed":
        return {
          backgroundColor: "var(--surface-2)",
          color: "var(--text-link)",
          border: "1px solid var(--card-border)",
        };

      case "Cancelled":
        return {
          backgroundColor: "var(--danger-bg)",
          color: "var(--danger-text)",
          border: "1px solid var(--danger-border)",
        };

      case "Expired":
        return {
          backgroundColor: "var(--surface-2)",
          color: "var(--text-muted)",
          border: "1px solid var(--card-border)",
        };

      default:
        return {
          backgroundColor: "var(--surface-2)",
          color: "var(--text-body)",
          border: "1px solid var(--card-border)",
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

  const activeAppointments = appointments.filter(
    (appointment) =>
      appointment.status !== "Cancelled" &&
      appointment.status !== "Completed" &&
      appointment.status !== "Expired"
  );

  const pendingCount = appointments.filter(
    (appointment) => appointment.status === "Pending"
  ).length;

  const confirmedCount = appointments.filter(
    (appointment) => appointment.status === "Confirmed"
  ).length;

  const pageTitle =
    userRole === ROLES.DOCTOR
      ? "Patient Queue"
      : userRole === ROLES.ADMIN
      ? "Clinic Appointments"
      : "My Appointments";

  const pageSubtitle =
    userRole === ROLES.DOCTOR
      ? "Review upcoming consultations and patient queue"
      : userRole === ROLES.ADMIN
      ? "Manage and review all clinic appointment requests"
      : "View, edit, and manage your clinic appointments";

  return (
    <AppLayout title={pageTitle} subtitle={pageSubtitle} activeNav="appointments-manage">
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
            backgroundColor: "var(--card-bg)",
            color: "var(--text-body)",
            padding: "10px 16px",
            borderRadius: "9px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "var(--shadow-card)",
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
              color: "var(--text-heading)",
            }}
          >
            {pageTitle}
          </h1>

          <p
            style={{
              marginTop: "8px",
              marginBottom: 0,
              color: "var(--text-muted)",
              fontSize: "15px",
            }}
          >
            {pageSubtitle}
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
          className="m-stack"
        >
          <div
            style={{
              backgroundColor: "var(--card-bg)",
              borderRadius: "14px",
              padding: "20px",
              boxShadow: "var(--shadow-card)",
              border: "1px solid var(--card-border)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
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
                color: "var(--text-heading)",
              }}
            >
              {activeAppointments.length}
            </h2>
          </div>

          <div
            style={{
              backgroundColor: "var(--card-bg)",
              borderRadius: "14px",
              padding: "20px",
              boxShadow: "var(--shadow-card)",
              border: "1px solid var(--card-border)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              Pending Requests
            </p>

            <h2
              style={{
                margin: "8px 0 0",
                fontSize: "28px",
                color: "var(--warning-text)",
              }}
            >
              {pendingCount}
            </h2>
          </div>

          <div
            style={{
              backgroundColor: "var(--card-bg)",
              borderRadius: "14px",
              padding: "20px",
              boxShadow: "var(--shadow-card)",
              border: "1px solid var(--card-border)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
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
                color: "var(--success-text)",
              }}
            >
              {confirmedCount}
            </h2>
          </div>
        </div>

        <section
          style={{
            backgroundColor: "var(--card-bg)",
            borderRadius: "16px",
            padding: "28px",
            boxShadow: "var(--shadow-card)",
            border: "1px solid var(--card-border)",
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
                  color: "var(--text-heading)",
                }}
              >
                Active Appointments
              </h2>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "var(--text-muted)",
                  fontSize: "14px",
                }}
              >
                {userRole === ROLES.DOCTOR
                  ? "Today's patient consultation queue and active visits."
                  : userRole === ROLES.ADMIN
                  ? "Clinic-wide appointment requests and schedule management."
                  : "Your upcoming appointments."}
              </p>
            </div>

            {userRole === ROLES.PATIENT ? (
              <button
                onClick={() => router.push("/appointments")}
                style={{
                  border: "none",
                  borderRadius: "9px",
                  padding: "11px 17px",
                  backgroundColor: "var(--primary)",
                  color: "var(--on-primary)",
                  fontSize: "14px",
                  fontWeight: "650",
                  cursor: "pointer",
                }}
              >
                + Book Appointment
              </button>
            ) : userRole === ROLES.DOCTOR ? (
              <button
                onClick={() => router.push("/ai-assistant")}
                style={{
                  border: "none",
                  borderRadius: "9px",
                  padding: "11px 17px",
                  backgroundColor: "var(--surface-2)",
                  color: "var(--text-heading)",
                  border: "1px solid var(--card-border)",
                  fontSize: "14px",
                  fontWeight: "650",
                  cursor: "pointer",
                }}
              >
                🤖 Clinical AI Co-Pilot
              </button>
            ) : (
              <button
                onClick={() => router.push("/reports")}
                style={{
                  border: "none",
                  borderRadius: "9px",
                  padding: "11px 17px",
                  backgroundColor: "var(--surface-2)",
                  color: "var(--text-heading)",
                  border: "1px solid var(--card-border)",
                  fontSize: "14px",
                  fontWeight: "650",
                  cursor: "pointer",
                }}
              >
                📊 View Analytics
              </button>
            )}
          </div>

          {loading ? (
            <div
              style={{
                padding: "50px 20px",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              Loading appointments...
            </div>
          ) : activeAppointments.length === 0 ? (
            <div
              style={{
                padding: "50px 20px",
                textAlign: "center",
                backgroundColor: "var(--surface-2)",
                borderRadius: "12px",
                border: "1px dashed var(--card-border)",
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
                  color: "var(--text-heading)",
                  fontSize: "18px",
                }}
              >
                {userRole === ROLES.PATIENT
                  ? "No active appointments"
                  : userRole === ROLES.DOCTOR
                  ? "No patients in your queue"
                  : "No clinic appointments found"}
              </h3>

              <p
                style={{
                  color: "var(--text-muted)",
                  margin: "8px 0 18px",
                }}
              >
                {userRole === ROLES.PATIENT
                  ? "You currently have no upcoming appointments."
                  : userRole === ROLES.DOCTOR
                  ? "You have no upcoming patient consultations assigned at this time."
                  : "There are currently no active appointments in the clinic system."}
              </p>

              {userRole === ROLES.PATIENT && (
                <button
                  onClick={() => router.push("/appointments")}
                  style={{
                    border: "none",
                    borderRadius: "9px",
                    padding: "11px 18px",
                    backgroundColor: "var(--primary)",
                    color: "var(--on-primary)",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Book an Appointment
                </button>
              )}
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
                    border: "1px solid var(--card-border)",
                    borderRadius: "14px",
                    padding: "22px",
                    backgroundColor: "var(--card-bg)",
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
                          color: "var(--text-heading)",
                        }}
                      >
                        {userRole === ROLES.PATIENT
                          ? (appointment.doctors?.name || "Doctor")
                          : (`Patient: ${getPatientDisplayName(appointment.patient_id)}`)}
                      </h3>

                      <p
                        style={{
                          margin: "5px 0 0",
                          color: "var(--text-muted)",
                          fontSize: "14px",
                        }}
                      >
                        {userRole === ROLES.PATIENT
                          ? (appointment.doctors?.specialization || "General Practice")
                          : (`Attending: ${appointment.doctors?.name || "Doctor"} (${appointment.doctors?.specialization || "General Medicine"})`)}
                      </p>
                    </div>

                    <span
                      style={{
                        padding: "7px 13px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: "700",
                        ...getStatusStyle(
                          appointment.status
                        ),
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
                      backgroundColor: "var(--surface-2)",
                      borderRadius: "11px",
                      marginBottom: "18px",
                    }}
                    className="m-stack"
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          color: "var(--text-muted)",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        DATE
                      </p>

                      <p
                        style={{
                          margin: "5px 0 0",
                          color: "var(--text-heading)",
                          fontWeight: "650",
                        }}
                      >
                        {formatDate(
                          appointment.appointment_date
                        )}
                      </p>
                    </div>

                    <div>
                      <p
                        style={{
                          margin: 0,
                          color: "var(--text-muted)",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        TIME
                      </p>

                      <p
                        style={{
                          margin: "5px 0 0",
                          color: "var(--text-heading)",
                          fontWeight: "650",
                        }}
                      >
                        {formatTime(
                          appointment.start_time
                        )}{" "}
                        -{" "}
                        {formatTime(
                          appointment.end_time
                        )}
                      </p>
                    </div>

                    <div>
                      <p
                        style={{
                          margin: 0,
                          color: "var(--text-muted)",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        WAITING TIME
                      </p>

                      <p
                        style={{
                          margin: "5px 0 0",
                          color: "var(--text-heading)",
                          fontWeight: "650",
                        }}
                      >
                        {appointment.waiting_time ||
                          10}{" "}
                        minutes
                      </p>
                    </div>

                    <div>
                      <p
                        style={{
                          margin: 0,
                          color: "var(--text-muted)",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        CONSULTATION FEE
                      </p>

                      <p
                        style={{
                          margin: "5px 0 0",
                          color: "var(--text-heading)",
                          fontWeight: "650",
                        }}
                      >
                        {formatFee(
                          appointment.consultation_fee
                        )}
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
                        color: "var(--text-muted)",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      REASON FOR APPOINTMENT
                    </p>

                    <p
                      style={{
                        margin: "6px 0 0",
                        color: "var(--text-body)",
                        lineHeight: "1.5",
                      }}
                    >
                      {appointment.reason ||
                        "No reason provided"}
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
                        {userRole === ROLES.ADMIN && (
                          <button
                            onClick={() =>
                              confirmAppointment(
                                appointment.id
                              )
                            }
                            disabled={actionLoading}
                            style={{
                              padding: "10px 15px",
                              border: "none",
                              borderRadius: "8px",
                              backgroundColor: "var(--success)",
                              color: "var(--on-primary)",
                              fontWeight: "650",
                              cursor: actionLoading
                                ? "not-allowed"
                                : "pointer",
                            }}
                          >
                            Confirm
                          </button>
                        )}

                        {userRole !== ROLES.DOCTOR && (
                          <button
                            onClick={() =>
                              editAppointment(
                                appointment.id
                              )
                            }
                            disabled={actionLoading}
                            style={{
                              padding: "10px 15px",
                              border: "none",
                              borderRadius: "8px",
                              backgroundColor: "var(--primary)",
                              color: "var(--on-primary)",
                              fontWeight: "650",
                              cursor: actionLoading
                                ? "not-allowed"
                                : "pointer",
                            }}
                          >
                            Edit
                          </button>
                        )}

                        {userRole === ROLES.ADMIN && (
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
                              backgroundColor: "var(--surface-2)",
                              color: "var(--danger-text)",
                              border:
                                "1px solid var(--danger-border)",
                              fontWeight: "650",
                              cursor: actionLoading
                                ? "not-allowed"
                                : "pointer",
                            }}
                          >
                            Remove Doctor
                          </button>
                        )}
                      </>
                    )}

                    {appointment.status === "Confirmed" && (
                      <button
                        onClick={() =>
                          completeAppointment(
                            appointment.id
                          )
                        }
                        disabled={actionLoading}
                        style={{
                          padding: "10px 15px",
                          border: "none",
                          borderRadius: "8px",
                          backgroundColor: "var(--primary)",
                          color: "var(--on-primary)",
                          fontWeight: "650",
                          cursor: actionLoading
                            ? "not-allowed"
                            : "pointer",
                        }}
                      >
                        Mark Completed
                      </button>
                    )}

                    {appointment.status !== "Confirmed" &&
                      userRole !== ROLES.DOCTOR && (
                      <button
                        onClick={() =>
                          editAppointment(
                            appointment.id
                          )
                        }
                        disabled={actionLoading}
                        style={{
                          padding: "10px 15px",
                          border: "none",
                          borderRadius: "8px",
                          backgroundColor: "var(--surface-2)",
                          color: "var(--text-body)",
                          border:
                            "1px solid var(--card-border)",
                          fontWeight: "650",
                          cursor: actionLoading
                            ? "not-allowed"
                            : "pointer",
                        }}
                      >
                        Reschedule
                      </button>
                    )}

                    {(appointment.status === "Pending" ||
                      appointment.status === "Confirmed") &&
                      userRole !== ROLES.DOCTOR && (
                      <button
                        onClick={() =>
                          cancelAppointment(
                            appointment.id
                          )
                        }
                        disabled={actionLoading}
                        style={{
                          padding: "10px 15px",
                          border: "none",
                          borderRadius: "8px",
                          backgroundColor: "var(--danger-bg)",
                          color: "var(--danger-text)",
                          border:
                            "1px solid var(--danger-border)",
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
      </div>
    </AppLayout>
  );
}