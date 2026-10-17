"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import AppLayout from "@/components/AppLayout";
import { ROLES, getUserRole } from "@/lib/auth-role";

export default function ReportsPage() {
const router = useRouter();

const [appointments, setAppointments] = useState([]);
const [patients, setPatients] = useState([]);
const [doctors, setDoctors] = useState([]);

const [loading, setLoading] = useState(true);
const [reportType, setReportType] = useState("daily");

const today = new Date();
const todayString = today.toISOString().split("T")[0];
const monthString = todayString.substring(0, 7);

const [selectedDate, setSelectedDate] = useState(todayString);
const [selectedMonth, setSelectedMonth] = useState(monthString);

useEffect(() => {
// eslint-disable-next-line react-hooks/immutability
loadReports();
}, []);

async function loadReports() {
try {
setLoading(true);

const { data: { user: currentUser } } = await supabase.auth.getUser();
if (!currentUser) {
  router.push("/login");
  return;
}

const role = getUserRole(currentUser);
if (role === ROLES.PATIENT) {
  router.push("/dashboard");
  return;
}


  const [
    appointmentsResult,
    patientsResult,
    doctorsResult,
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("*")
      .order("appointment_date", {
        ascending: false,
      }),

    supabase
      .from("patients")
      .select(
        "id, patient_number, first_name, middle_name, last_name"
      ),

    supabase
      .from("doctors")
      .select("id, name, specialization"),
  ]);

  if (appointmentsResult.error) {
    console.error(
      "Appointments error:",
      appointmentsResult.error
    );
    alert(
      "Failed to load appointments: " +
        appointmentsResult.error.message
    );
    return;
  }

  if (patientsResult.error) {
    console.error(
      "Patients error:",
      patientsResult.error
    );
  }

  if (doctorsResult.error) {
    console.error(
      "Doctors error:",
      doctorsResult.error
    );
  }

  setAppointments(
    appointmentsResult.data || []
  );

  setPatients(patientsResult.data || []);
  setDoctors(doctorsResult.data || []);
} catch (error) {
  console.error(error);
  alert(
    "Something went wrong while loading reports."
  );
} finally {
  setLoading(false);
}


}

function getPatient(patientId) {
return patients.find(
(patient) => patient.id === patientId
);
}

function getDoctor(doctorId) {
return doctors.find(
(doctor) => doctor.id === doctorId
);
}

function getPatientName(patientId) {
const patient = getPatient(patientId);


if (!patient) {
  return "Unknown Patient";
}

return [
  patient.first_name,
  patient.middle_name,
  patient.last_name,
]
  .filter(Boolean)
  .join(" ");


}

function getDoctorName(doctorId) {
const doctor = getDoctor(doctorId);


if (!doctor) {
  return "Unknown Doctor";
}

return doctor.name || "Unknown Doctor";


}

function getReportAppointments() {
if (reportType === "daily") {
return appointments.filter(
(appointment) =>
appointment.appointment_date ===
selectedDate
);
}


return appointments.filter((appointment) => {
  if (!appointment.appointment_date) {
    return false;
  }

  return appointment.appointment_date.startsWith(
    selectedMonth
  );
});


}

const reportAppointments =
getReportAppointments();

const totalAppointments =
reportAppointments.length;

const completedAppointments =
reportAppointments.filter(
(appointment) =>
String(appointment.status || "")
.toLowerCase() === "completed"
).length;

const pendingAppointments =
reportAppointments.filter(
(appointment) =>
String(appointment.status || "")
.toLowerCase() === "pending"
).length;

const cancelledAppointments =
reportAppointments.filter(
(appointment) =>
String(appointment.status || "")
.toLowerCase() === "cancelled"
).length;

function formatCurrency(value) {
return "PHP " + Number(value || 0).toFixed(2);
}

function formatDate(date) {
if (!date) {
return "N/A";
}


const dateObject = new Date(
  date + "T00:00:00"
);

return dateObject.toLocaleDateString(
  "en-PH",
  {
    year: "numeric",
    month: "long",
    day: "numeric",
  }
);


}

function exportPDF() {
if (reportAppointments.length === 0) {
alert(
"There are no records to export."
);
return;
}


const doc = new jsPDF();

const reportTitle =
  reportType === "daily"
    ? "Daily Appointment Report"
    : "Monthly Appointment Report";

const reportPeriod =
  reportType === "daily"
    ? formatDate(selectedDate)
    : selectedMonth;

doc.setFontSize(18);
doc.text(
  "SmartClinic AI",
  14,
  18
);

doc.setFontSize(14);
doc.text(
  reportTitle,
  14,
  28
);

doc.setFontSize(10);
doc.text(
  "Report Period: " + reportPeriod,
  14,
  36
);

doc.text(
  "Generated: " +
    new Date().toLocaleString(),
  14,
  43
);

autoTable(doc, {
  startY: 50,
  head: [
    [
      "Date",
      "Patient",
      "Doctor",
      "Status",
      "Waiting",
    ],
  ],
  body: reportAppointments.map(
    (appointment) => [
      formatDate(
        appointment.appointment_date
      ),
      getPatientName(
        appointment.patient_id
      ),
      getDoctorName(
        appointment.doctor_id
      ),
      appointment.status || "N/A",
      appointment.waiting_time
        ? appointment.waiting_time +
          " min"
        : "N/A",
    ]
  ),
  styles: {
    fontSize: 8,
  },
  headStyles: {
    fillColor: [37, 99, 235],
  },
});

const finalY =
  doc.lastAutoTable &&
  doc.lastAutoTable.finalY
    ? doc.lastAutoTable.finalY + 15
    : 70;

doc.setFontSize(10);

doc.text(
  "Total Appointments: " +
    totalAppointments,
  14,
  finalY
);

doc.text(
  "Completed: " +
    completedAppointments,
  14,
  finalY + 7
);

doc.text(
  "Pending: " +
    pendingAppointments,
  14,
  finalY + 14
);

doc.text(
  "Cancelled: " +
    cancelledAppointments,
  14,
  finalY + 21
);

const fileName =
  reportType === "daily"
    ? "daily-report-" +
      selectedDate +
      ".pdf"
    : "monthly-report-" +
      selectedMonth +
      ".pdf";

doc.save(fileName);


}

function exportExcel() {
if (reportAppointments.length === 0) {
alert(
"There are no records to export."
);
return;
}


const excelData =
  reportAppointments.map(
    (appointment) => ({
      Date: appointment.appointment_date,
      StartTime:
        appointment.start_time || "",
      EndTime:
        appointment.end_time || "",
      PatientID:
        appointment.patient_id || "",
      PatientName:
        getPatientName(
          appointment.patient_id
        ),
      DoctorID:
        appointment.doctor_id || "",
      DoctorName:
        getDoctorName(
          appointment.doctor_id
        ),
      Status:
        appointment.status || "",
      WaitingTime:
        appointment.waiting_time || "",
      CreatedAt:
        appointment.created_at || "",
    })
  );

excelData.push({
  Date: "",
  StartTime: "",
  EndTime: "",
  PatientID: "",
  PatientName: "",
  DoctorID: "",
  DoctorName: "TOTAL",
  Status: "",
  WaitingTime: "",
  CreatedAt: "",
});

const worksheet =
  XLSX.utils.json_to_sheet(
    excelData
  );

worksheet["!cols"] = [
  { wch: 15 },
  { wch: 12 },
  { wch: 12 },
  { wch: 25 },
  { wch: 28 },
  { wch: 15 },
  { wch: 28 },
  { wch: 15 },
  { wch: 15 },
  { wch: 25 },
];

const workbook =
  XLSX.utils.book_new();

XLSX.utils.book_append_sheet(
  workbook,
  worksheet,
  "Report"
);

const fileName =
  reportType === "daily"
    ? "daily-report-" +
      selectedDate +
      ".xlsx"
    : "monthly-report-" +
      selectedMonth +
      ".xlsx";

XLSX.writeFile(
  workbook,
  fileName
);


}

return (
<AppLayout title="Reports & Analytics" subtitle="Daily, monthly, and annual clinic reports" activeNav="reports">
<div
style={{
maxWidth: "1250px",
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
backgroundColor: "var(--surface-2)",
color: "var(--text-heading)",
cursor: "pointer",
fontWeight: "600",
}}
>
← Back to Dashboard </button>


    <div
      style={{
        backgroundColor: "var(--card-bg)",
        padding: "30px",
        borderRadius: "14px",
        boxShadow:
          "var(--shadow-card)",
      }}
    >
      <h1
        style={{
          fontSize: "30px",
          fontWeight: "700",
          color: "var(--text-heading)",
          marginBottom: "8px",
        }}
      >
        Reports
      </h1>

      <p
        style={{
          color: "var(--text-muted)",
          marginBottom: "30px",
        }}
      >
        View daily and monthly appointment
        reports and export your records.
      </p>

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "25px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() =>
            setReportType("daily")
          }
          style={{
            padding: "11px 20px",
            border: "none",
            borderRadius: "8px",
            backgroundColor:
              reportType === "daily"
                ? "var(--primary)"
                : "var(--card-border)",
            color:
              reportType === "daily"
                ? "white"
                : "var(--text-heading)",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          Daily Reports
        </button>

        <button
          onClick={() =>
            setReportType("monthly")
          }
          style={{
            padding: "11px 20px",
            border: "none",
            borderRadius: "8px",
            backgroundColor:
              reportType === "monthly"
                ? "var(--primary)"
                : "var(--card-border)",
            color:
              reportType === "monthly"
                ? "white"
                : "var(--text-heading)",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          Monthly Reports
        </button>
      </div>

      <div
        style={{
          padding: "20px",
          backgroundColor: "var(--surface-2)",
          borderRadius: "10px",
          marginBottom: "25px",
        }}
      >
        {reportType === "daily" ? (
          <div>
            <label
              style={{
                display: "block",
                fontWeight: "600",
                marginBottom: "8px",
                color: "var(--text-body)",
              }}
            >
              Select Date
            </label>

            <input
              type="date"
              value={selectedDate}
              onChange={(event) =>
                setSelectedDate(
                  event.target.value
                )
              }
              style={{
                padding: "11px",
                border:
                  "1px solid var(--card-border)",
                borderRadius: "8px",
                color: "var(--text-body)",
                backgroundColor:
                  "var(--surface-2)",
              }}
            />
          </div>
        ) : (
          <div>
            <label
              style={{
                display: "block",
                fontWeight: "600",
                marginBottom: "8px",
                color: "var(--text-body)",
              }}
            >
              Select Month
            </label>

            <input
              type="month"
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(
                  event.target.value
                )
              }
              style={{
                padding: "11px",
                border:
                  "1px solid var(--card-border)",
                borderRadius: "8px",
                color: "var(--text-body)",
                backgroundColor:
                  "var(--surface-2)",
              }}
            />
          </div>
        )}
      </div>

      {loading ? (
        <p>Loading reports...</p>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "15px",
              marginBottom: "30px",
            }}
          >
            <SummaryCard
              title="Total Appointments"
              value={totalAppointments}
            />

            <SummaryCard
              title="Completed"
              value={
                completedAppointments
              }
            />

            <SummaryCard
              title="Pending"
              value={
                pendingAppointments
              }
            />

            <SummaryCard
              title="Cancelled"
              value={
                cancelledAppointments
              }
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "25px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={exportPDF}
              style={{
                padding: "11px 20px",
                border: "none",
                borderRadius: "8px",
                backgroundColor:
                  "var(--danger)",
                color: "var(--on-primary)",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Export PDF
            </button>

            <button
              onClick={exportExcel}
              style={{
                padding: "11px 20px",
                border: "none",
                borderRadius: "8px",
                backgroundColor:
                  "var(--success)",
                color: "var(--on-primary)",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Export Excel
            </button>
          </div>

          {reportAppointments.length ===
          0 ? (
            <div
              style={{
                padding: "35px",
                textAlign: "center",
                backgroundColor:
                  "var(--surface-2)",
                border: "1px solid var(--card-border)",
                borderRadius: "10px",
              }}
            >
              <p
                style={{
                  color: "var(--text-muted)",
                }}
              >
                No appointments found
                for the selected
                period.
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
                        "var(--surface-2)",
                    }}
                  >
                    <th
                      style={headerStyle}
                    >
                      Date
                    </th>

                    <th
                      style={headerStyle}
                    >
                      Patient
                    </th>

                    <th
                      style={headerStyle}
                    >
                      Doctor
                    </th>

                    <th
                      style={headerStyle}
                    >
                      Time
                    </th>

                    <th
                      style={headerStyle}
                    >
                      Status
                    </th>

                    <th
                      style={headerStyle}
                    >
                      Waiting
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {reportAppointments.map(
                    (appointment) => (
                      <tr
                        key={
                          appointment.id
                        }
                      >
                        <td
                          style={
                            cellStyle
                          }
                        >
                          {formatDate(
                            appointment.appointment_date
                          )}
                        </td>

                        <td
                          style={
                            cellStyle
                          }
                        >
                          {getPatientName(
                            appointment.patient_id
                          )}
                        </td>

                        <td
                          style={
                            cellStyle
                          }
                        >
                          {getDoctorName(
                            appointment.doctor_id
                          )}
                        </td>

                        <td
                          style={
                            cellStyle
                          }
                        >
                          {appointment.start_time ||
                            "N/A"}
                          {" - "}
                          {appointment.end_time ||
                            "N/A"}
                        </td>

                        <td
                          style={
                            cellStyle
                          }
                        >
                          {appointment.status ||
                            "N/A"}
                        </td>

                        <td
                          style={
                            cellStyle
                          }
                        >
                          {appointment.waiting_time
                            ? appointment.waiting_time +
                              " min"
                            : "N/A"}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  </div>
</AppLayout>


);
}

function SummaryCard({
title,
value,
}) {
return (
<div
style={{
padding: "20px",
backgroundColor: "var(--surface-2)",
border: "1px solid var(--card-border)",
borderRadius: "10px",
}}
>
<p
style={{
margin: 0,
marginBottom: "8px",
color: "var(--text-muted)",
fontSize: "14px",
}}
>
{title} </p>


  <h2
    style={{
      margin: 0,
      color: "var(--text-heading)",
      fontSize: "24px",
    }}
  >
    {value}
  </h2>
</div>


);
}

const headerStyle = {
textAlign: "left",
padding: "13px",
borderBottom: "1px solid var(--card-border)",
color: "var(--text-muted)",
fontSize: "12px",
fontWeight: "600",
whiteSpace: "nowrap",
};

const cellStyle = {
padding: "13px",
borderBottom: "1px solid var(--card-border)",
color: "var(--text-heading)",
whiteSpace: "nowrap",
};
