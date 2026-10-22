"use client";

import { ROLES } from "@/lib/auth-role";

export default function AppointmentCard({
  appointment,
  userRole,
  actionLoading,
  getPatientDisplayName,
  getStatusStyle,
  formatDate,
  formatTime,
  formatFee,
  confirmAppointment,
  completeAppointment,
  editAppointment,
  cancelAppointment,
  removeDoctorFromAppointment,
}) {
  return (
    <div
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
            ...getStatusStyle(appointment.status),
          }}
        >
          {appointment.status}
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          padding: "18px",
          backgroundColor: "var(--surface-2)",
          borderRadius: "11px",
          marginBottom: "18px",
        }}
        className="m-stack"
      >
        <div>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "12px", fontWeight: "600" }}>DATE</p>
          <p style={{ margin: "5px 0 0", color: "var(--text-heading)", fontWeight: "650" }}>{formatDate(appointment.appointment_date)}</p>
        </div>
        <div>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "12px", fontWeight: "600" }}>TIME</p>
          <p style={{ margin: "5px 0 0", color: "var(--text-heading)", fontWeight: "650" }}>{formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}</p>
        </div>
        <div>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "12px", fontWeight: "600" }}>WAITING TIME</p>
          <p style={{ margin: "5px 0 0", color: "var(--text-heading)", fontWeight: "650" }}>{appointment.waiting_time || 10} minutes</p>
        </div>
        <div>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "12px", fontWeight: "600" }}>CONSULTATION FEE</p>
          <p style={{ margin: "5px 0 0", color: "var(--text-heading)", fontWeight: "650" }}>{formatFee(appointment.consultation_fee)}</p>
        </div>
      </div>

      {appointment.reason && (
        <div style={{ marginBottom: "18px", padding: "14px", backgroundColor: "var(--surface-2)", borderRadius: "10px", fontSize: "14px", color: "var(--text-body)" }}>
          <strong>Reason for Visit:</strong> {appointment.reason}
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        {userRole === ROLES.ADMIN && appointment.status === "Pending" && (
          <button disabled={actionLoading} onClick={() => confirmAppointment(appointment.id)} style={{ border: "none", borderRadius: "8px", padding: "9px 16px", backgroundColor: "var(--success-bg)", color: "var(--success-text)", fontWeight: "650", cursor: "pointer", fontSize: "13px" }}>
            Confirm Request
          </button>
        )}
        {appointment.status === "Confirmed" && (
          <button disabled={actionLoading} onClick={() => completeAppointment(appointment.id)} style={{ border: "none", borderRadius: "8px", padding: "9px 16px", backgroundColor: "var(--primary)", color: "var(--on-primary)", fontWeight: "650", cursor: "pointer", fontSize: "13px" }}>
            Mark Completed
          </button>
        )}
        {userRole === ROLES.PATIENT && appointment.status === "Pending" && (
          <button disabled={actionLoading} onClick={() => editAppointment(appointment.id)} style={{ border: "1px solid var(--card-border)", borderRadius: "8px", padding: "9px 16px", backgroundColor: "var(--surface-2)", color: "var(--text-heading)", fontWeight: "650", cursor: "pointer", fontSize: "13px" }}>
            Reschedule
          </button>
        )}
        {userRole !== ROLES.DOCTOR && (
          <button disabled={actionLoading} onClick={() => cancelAppointment(appointment.id)} style={{ border: "1px solid var(--danger-border)", borderRadius: "8px", padding: "9px 16px", backgroundColor: "var(--danger-bg)", color: "var(--danger-text)", fontWeight: "650", cursor: "pointer", fontSize: "13px" }}>
            Cancel
          </button>
        )}
        {userRole === ROLES.ADMIN && appointment.status === "Pending" && (
          <button disabled={actionLoading} onClick={() => removeDoctorFromAppointment(appointment.id)} style={{ border: "1px solid var(--danger-border)", borderRadius: "8px", padding: "9px 16px", backgroundColor: "var(--danger-bg)", color: "var(--danger-text)", fontWeight: "650", cursor: "pointer", fontSize: "13px" }}>
            Remove Request
          </button>
        )}
      </div>
    </div>
  );
}

