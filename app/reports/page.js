"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import AppLayout from "@/components/AppLayout";

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
    loadReports();
  }, []);

  async function loadReports() {
    try {
      setLoading(true);

      const [
        appointmentsResult,
        patientsResult,
        doctorsResult
      ] = await Promise.all([
        supabase
          .from("appointments")
          .select("*")
          .order("appointment_date", { ascending: false }),

        supabase
          .from("patients")
          .select("*"),

        supabase
          .from("doctors")
          .select("*")
      ]);

      if (appointmentsResult.error) {
        console.error(appointmentsResult.error);
        alert(
          "Failed to load appointments: " +
            appointmentsResult.error.message
        );
        return;
      }

      if (patientsResult.error) {
        console.error(patientsResult.error);
      }

      if (doctorsResult.error) {
        console.error(doctorsResult.error);
      }

      setAppointments(appointmentsResult.data || []);
      setPatients(patientsResult.data || []);
      setDoctors(doctorsResult.data || []);
    } catch (error) {
      console.error(error);
      alert("Something went wrong while loading reports.");
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
      patient.last_name
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
          appointment.appointment_date === selectedDate
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

  const reportAppointments = getReportAppointments();

  const totalAppointments = reportAppointments.length;

  const completedAppointments =
    reportAppointments.filter(
      (appointment) =>
        String(appointment.status || "").toLowerCase() ===
        "completed"
    ).length;

  const pendingAppointments =
    reportAppointments.filter(
      (appointment) =>
        String(appointment.status || "").toLowerCase() ===
        "pending"
    ).length;

  const confirmedAppointments =
    reportAppointments.filter(
      (appointment) =>
        String(appointment.status || "").toLowerCase() ===
        "confirmed"
    ).length;

  const cancelledAppointments =
    reportAppointments.filter(
      (appointment) =>
        String(appointment.status || "").toLowerCase() ===
        "cancelled"
    ).length;

  const expiredAppointments =
    reportAppointments.filter(
      (appointment) =>
        String(appointment.status || "").toLowerCase() ===
        "expired"
    ).length;

  const totalFees = reportAppointments.reduce(
    (total, appointment) =>
      total +
      Number(appointment.consultation_fee || 0),
    0
  );

  const waitingTimes = reportAppointments
    .map((appointment) =>
      Number(appointment.waiting_time || 0)
    )
    .filter((time) => time > 0);

  const averageWaitingTime =
    waitingTimes.length > 0
      ? Math.round(
          waitingTimes.reduce(
            (total, time) => total + time,
            0
          ) / waitingTimes.length
        )
      : 0;

  const shortestWaitingTime =
    waitingTimes.length > 0
      ? Math.min(...waitingTimes)
      : 0;

  const longestWaitingTime =
    waitingTimes.length > 0
      ? Math.max(...waitingTimes)
      : 0;

  const patientStatistics = {
    totalPatients: patients.length,
    activePatients: patients.filter(
      (patient) => !patient.is_archived
    ).length,
    archivedPatients: patients.filter(
      (patient) => patient.is_archived
    ).length,
    reportPatients: new Set(
      reportAppointments.map(
        (appointment) => appointment.patient_id
      )
    ).size
  };

  const appointmentTrends = {};

  reportAppointments.forEach((appointment) => {
    const date = appointment.appointment_date;

    if (!date) {
      return;
    }

    if (!appointmentTrends[date]) {
      appointmentTrends[date] = {
        total: 0,
        completed: 0,
        cancelled: 0,
        pending: 0
      };
    }

    appointmentTrends[date].total++;

    const status = String(
      appointment.status || ""
    ).toLowerCase();

    if (status === "completed") {
      appointmentTrends[date].completed++;
    }

    if (status === "cancelled") {
      appointmentTrends[date].cancelled++;
    }

    if (status === "pending") {
      appointmentTrends[date].pending++;
    }
  });

  const trendData = Object.entries(
    appointmentTrends
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-10);

  const doctorPerformance = doctors.map((doctor) => {
    const doctorAppointments =
      reportAppointments.filter(
        (appointment) =>
          appointment.doctor_id === doctor.id
      );

    const completed =
      doctorAppointments.filter(
        (appointment) =>
          String(
            appointment.status || ""
          ).toLowerCase() === "completed"
      ).length;

    const cancelled =
      doctorAppointments.filter(
        (appointment) =>
          String(
            appointment.status || ""
          ).toLowerCase() === "cancelled"
      ).length;

    const total =
      doctorAppointments.length;

    const completionRate =
      total > 0
        ? Math.round((completed / total) * 100)
        : 0;

    const doctorWaitingTimes =
      doctorAppointments
        .map((appointment) =>
          Number(
            appointment.waiting_time || 0
          )
        )
        .filter((time) => time > 0);

    const averageWaiting =
      doctorWaitingTimes.length > 0
        ? Math.round(
            doctorWaitingTimes.reduce(
              (sum, time) => sum + time,
              0
            ) /
              doctorWaitingTimes.length
          )
        : 0;

    return {
      id: doctor.id,
      name: doctor.name || "Unknown Doctor",
      specialization:
        doctor.specialization || "General",
      total,
      completed,
      cancelled,
      completionRate,
      averageWaiting
    };
  })
  .filter((doctor) => doctor.total > 0)
  .sort((a, b) => b.total - a.total);

  const maxTrendValue = Math.max(
    ...trendData.map(
      ([, value]) => value.total
    ),
    1
  );

  const maxDoctorValue = Math.max(
    ...doctorPerformance.map(
      (doctor) => doctor.total
    ),
    1
  );

  function formatCurrency(value) {
    return (
      "PHP " +
      Number(value || 0).toLocaleString(
        "en-PH",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      )
    );
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
        day: "numeric"
      }
    );
  }

  function exportPDF() {
    if (reportAppointments.length === 0) {
      alert("There are no records to export.");
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
    doc.text("SmartClinic AI", 14, 18);

    doc.setFontSize(14);
    doc.text(reportTitle, 14, 28);

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
          "Fee",
          "Waiting"
        ]
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
          formatCurrency(
            appointment.consultation_fee
          ),
          appointment.waiting_time
            ? appointment.waiting_time + " min"
            : "N/A"
        ]
      ),
      styles: {
        fontSize: 8
      },
      headStyles: {
        fillColor: [37, 99, 235]
      }
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
      "Confirmed: " +
        confirmedAppointments,
      14,
      finalY + 21
    );

    doc.text(
      "Cancelled: " +
        cancelledAppointments,
      14,
      finalY + 28
    );

    doc.text(
      "Total Consultation Fees: " +
        formatCurrency(totalFees),
      14,
      finalY + 35
    );

    doc.save(
      reportType === "daily"
        ? "daily-report-" +
            selectedDate +
            ".pdf"
        : "monthly-report-" +
            selectedMonth +
            ".pdf"
    );
  }

  function exportExcel() {
    if (reportAppointments.length === 0) {
      alert("There are no records to export.");
      return;
    }

    const excelData =
      reportAppointments.map(
        (appointment) => ({
          Date:
            appointment.appointment_date || "",
          StartTime:
            appointment.start_time || "",
          EndTime:
            appointment.end_time || "",
          PatientName:
            getPatientName(
              appointment.patient_id
            ),
          DoctorName:
            getDoctorName(
              appointment.doctor_id
            ),
          Status:
            appointment.status || "",
          ConsultationFee:
            Number(
              appointment.consultation_fee || 0
            ),
          WaitingTime:
            appointment.waiting_time || "",
          CreatedAt:
            appointment.created_at || ""
        })
      );

    excelData.push({
      Date: "",
      StartTime: "",
      EndTime: "",
      PatientName: "",
      DoctorName: "TOTAL",
      Status: "",
      ConsultationFee: totalFees,
      WaitingTime: "",
      CreatedAt: ""
    });

    const worksheet =
      XLSX.utils.json_to_sheet(
        excelData
      );

    worksheet["!cols"] = [
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 28 },
      { wch: 28 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 25 }
    ];

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Report"
    );

    XLSX.writeFile(
      workbook,
      reportType === "daily"
        ? "daily-report-" +
            selectedDate +
            ".xlsx"
        : "monthly-report-" +
            selectedMonth +
            ".xlsx"
    );
  }

  return (
    <AppLayout
      title="Reports & Analytics"
      subtitle="Patient, appointment, doctor, and waiting time reports"
      activeNav="reports"
    >
      <div
        style={{
          maxWidth: "1250px",
          margin: "0 auto"
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
            backgroundColor:
              "rgba(226,232,240,0.15)",
            color: "#f1f5f9",
            cursor: "pointer",
            fontWeight: "600"
          }}
        >
          ← Back to Dashboard
        </button>

        <div
          style={{
            backgroundColor:
              "rgba(15,23,42,0.6)",
            padding: "30px",
            borderRadius: "14px",
            boxShadow:
              "0 4px 15px rgba(0,0,0,0.08)"
          }}
        >
          <h1
            style={{
              fontSize: "30px",
              fontWeight: "700",
              color: "#f1f5f9",
              marginBottom: "8px"
            }}
          >
            Reports
          </h1>

          <p
            style={{
              color: "#94a3b8",
              marginBottom: "30px"
            }}
          >
            Patient statistics, appointment trends,
            doctor performance, waiting time analysis,
            and clinic charts.
          </p>

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "25px",
              flexWrap: "wrap"
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
                    ? "#2563eb"
                    : "#e5e7eb",
                color:
                  reportType === "daily"
                    ? "white"
                    : "#111827",
                cursor: "pointer",
                fontWeight: "600"
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
                    ? "#2563eb"
                    : "#e5e7eb",
                color:
                  reportType === "monthly"
                    ? "white"
                    : "#111827",
                cursor: "pointer",
                fontWeight: "600"
              }}
            >
              Monthly Reports
            </button>
          </div>

          <div
            style={{
              padding: "20px",
              backgroundColor:
                "rgba(15,23,42,0.55)",
              borderRadius: "10px",
              marginBottom: "25px"
            }}
          >
            {reportType === "daily" ? (
              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: "600",
                    marginBottom: "8px",
                    color: "#e2e8f0"
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
                      "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    color: "#e2e8f0",
                    backgroundColor:
                      "rgba(255,255,255,0.06)"
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
                    color: "#e2e8f0"
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
                      "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    color: "#e2e8f0",
                    backgroundColor:
                      "rgba(255,255,255,0.06)"
                  }}
                />
              </div>
            )}
          </div>

          {loading ? (
            <p
              style={{
                color: "#f1f5f9"
              }}
            >
              Loading reports...
            </p>
          ) : (
            <>
              <section
                style={{
                  marginBottom: "35px"
                }}
              >
                <h2
                  style={sectionTitle}
                >
                  Patient Statistics
                </h2>

                <div
                  style={cardGrid}
                >
                  <ReportCard
                    title="Total Patients"
                    value={
                      patientStatistics.totalPatients
                    }
                  />

                  <ReportCard
                    title="Active Patients"
                    value={
                      patientStatistics.activePatients
                    }
                  />

                  <ReportCard
                    title="Archived Patients"
                    value={
                      patientStatistics.archivedPatients
                    }
                  />

                  <ReportCard
                    title="Patients in Report"
                    value={
                      patientStatistics.reportPatients
                    }
                  />
                </div>
              </section>

              <section
                style={{
                  marginBottom: "35px"
                }}
              >
                <h2
                  style={sectionTitle}
                >
                  Appointment Statistics
                </h2>

                <div
                  style={cardGrid}
                >
                  <ReportCard
                    title="Total Appointments"
                    value={totalAppointments}
                  />

                  <ReportCard
                    title="Completed"
                    value={
                      completedAppointments
                    }
                  />

                  <ReportCard
                    title="Confirmed"
                    value={
                      confirmedAppointments
                    }
                  />

                  <ReportCard
                    title="Pending"
                    value={
                      pendingAppointments
                    }
                  />

                  <ReportCard
                    title="Cancelled"
                    value={
                      cancelledAppointments
                    }
                  />

                  <ReportCard
                    title="Expired"
                    value={
                      expiredAppointments
                    }
                  />
                </div>
              </section>

              <section
                style={{
                  marginBottom: "35px"
                }}
              >
                <h2
                  style={sectionTitle}
                >
                  Appointment Trends
                </h2>

                <div
                  style={{
                    backgroundColor:
                      "rgba(15,23,42,0.55)",
                    padding: "25px",
                    borderRadius: "12px"
                  }}
                >
                  {trendData.length === 0 ? (
                    <p
                      style={{
                        color: "#94a3b8"
                      }}
                    >
                      No appointment trend data
                      available.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: "15px",
                        minHeight: "260px",
                        overflowX: "auto",
                        paddingTop: "20px"
                      }}
                    >
                      {trendData.map(
                        ([date, data]) => (
                          <div
                            key={date}
                            style={{
                              minWidth: "70px",
                              textAlign: "center"
                            }}
                          >
                            <div
                              style={{
                                height:
                                  Math.max(
                                    20,
                                    (data.total /
                                      maxTrendValue) *
                                      180
                                  ),
                                backgroundColor:
                                  "#2563eb",
                                borderRadius:
                                  "7px 7px 0 0",
                                display: "flex",
                                alignItems:
                                  "flex-start",
                                justifyContent:
                                  "center",
                                paddingTop:
                                  "8px",
                                color: "white",
                                fontWeight:
                                  "700"
                              }}
                            >
                              {data.total}
                            </div>

                            <p
                              style={{
                                color:
                                  "#94a3b8",
                                fontSize:
                                  "11px",
                                marginTop:
                                  "8px"
                              }}
                            >
                              {date.substring(
                                5
                              )}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: "20px",
                      display: "flex",
                      gap: "20px",
                      flexWrap: "wrap",
                      color: "#cbd5e1",
                      fontSize: "13px"
                    }}
                  >
                    <span>
                      Total:{" "}
                      {totalAppointments}
                    </span>

                    <span>
                      Completed:{" "}
                      {completedAppointments}
                    </span>

                    <span>
                      Cancelled:{" "}
                      {cancelledAppointments}
                    </span>

                    <span>
                      Pending:{" "}
                      {pendingAppointments}
                    </span>
                  </div>
                </div>
              </section>

              <section
                style={{
                  marginBottom: "35px"
                }}
              >
                <h2
                  style={sectionTitle}
                >
                  Doctor Performance
                </h2>

                {doctorPerformance.length ===
                0 ? (
                  <div
                    style={emptyBox}
                  >
                    No doctor appointment data
                    available for this period.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: "15px"
                    }}
                  >
                    {doctorPerformance.map(
                      (doctor) => (
                        <div
                          key={doctor.id}
                          style={{
                            backgroundColor:
                              "rgba(15,23,42,0.55)",
                            padding: "20px",
                            borderRadius: "12px"
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              justifyContent:
                                "space-between",
                              gap: "15px",
                              flexWrap:
                                "wrap",
                              marginBottom:
                                "12px"
                            }}
                          >
                            <div>
                              <h3
                                style={{
                                  color:
                                    "#f1f5f9",
                                  margin:
                                    "0 0 5px",
                                  fontSize:
                                    "18px"
                                }}
                              >
                                {doctor.name}
                              </h3>

                              <p
                                style={{
                                  color:
                                    "#94a3b8",
                                  margin: 0,
                                  fontSize:
                                    "13px"
                                }}
                              >
                                {
                                  doctor.specialization
                                }
                              </p>
                            </div>

                            <strong
                              style={{
                                color:
                                  "#60a5fa",
                                fontSize:
                                  "18px"
                              }}
                            >
                              {doctor.total}{" "}
                              appointments
                            </strong>
                          </div>

                          <div
                            style={{
                              height:
                                "10px",
                              backgroundColor:
                                "#334155",
                              borderRadius:
                                "10px",
                              overflow:
                                "hidden",
                              marginBottom:
                                "15px"
                            }}
                          >
                            <div
                              style={{
                                width:
                                  Math.max(
                                    5,
                                    (doctor.total /
                                      maxDoctorValue) *
                                      100
                                  ) +
                                  "%",
                                height:
                                  "100%",
                                backgroundColor:
                                  "#2563eb",
                                borderRadius:
                                  "10px"
                              }}
                            />
                          </div>

                          <div
                            style={{
                              display:
                                "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(120px, 1fr))",
                              gap: "10px"
                            }}
                          >
                            <MiniStat
                              label="Completed"
                              value={
                                doctor.completed
                              }
                            />

                            <MiniStat
                              label="Cancelled"
                              value={
                                doctor.cancelled
                              }
                            />

                            <MiniStat
                              label="Completion Rate"
                              value={
                                doctor.completionRate +
                                "%"
                              }
                            />

                            <MiniStat
                              label="Avg Waiting"
                              value={
                                doctor.averageWaiting +
                                " min"
                              }
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </section>

              <section
                style={{
                  marginBottom: "35px"
                }}
              >
                <h2
                  style={sectionTitle}
                >
                  Waiting Time Analysis
                </h2>

                <div
                  style={cardGrid}
                >
                  <ReportCard
                    title="Average Waiting Time"
                    value={
                      averageWaitingTime +
                      " min"
                    }
                  />

                  <ReportCard
                    title="Shortest Waiting Time"
                    value={
                      shortestWaitingTime +
                      " min"
                    }
                  />

                  <ReportCard
                    title="Longest Waiting Time"
                    value={
                      longestWaitingTime +
                      " min"
                    }
                  />

                  <ReportCard
                    title="Recorded Waiting Times"
                    value={
                      waitingTimes.length
                    }
                  />
                </div>

                <div
                  style={{
                    marginTop: "15px",
                    backgroundColor:
                      "rgba(15,23,42,0.55)",
                    padding: "25px",
                    borderRadius: "12px"
                  }}
                >
                  {waitingTimes.length ===
                  0 ? (
                    <p
                      style={{
                        color:
                          "#94a3b8"
                      }}
                    >
                      No waiting time data
                      available.
                    </p>
                  ) : (
                    <div>
                      <div
                        style={{
                          height:
                            "25px",
                          backgroundColor:
                            "#334155",
                          borderRadius:
                            "20px",
                          overflow:
                            "hidden"
                        }}
                      >
                        <div
                          style={{
                            width:
                              Math.min(
                                100,
                                (averageWaitingTime /
                                  Math.max(
                                    longestWaitingTime,
                                    1
                                  )) *
                                  100
                              ) +
                              "%",
                            height:
                              "100%",
                            backgroundColor:
                              "#f59e0b",
                            borderRadius:
                              "20px"
                          }}
                        />
                      </div>

                      <p
                        style={{
                          color:
                            "#cbd5e1",
                          marginTop:
                            "12px",
                          fontSize:
                            "13px"
                        }}
                      >
                        Average waiting time:
                        {" "}
                        {averageWaitingTime}
                        {" "}
                        minutes
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section
                style={{
                  marginBottom: "35px"
                }}
              >
                <h2
                  style={sectionTitle}
                >
                  Charts Summary
                </h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "15px"
                  }}
                >
                  <ChartBox
                    title="Completed"
                    value={
                      completedAppointments
                    }
                    total={
                      totalAppointments
                    }
                  />

                  <ChartBox
                    title="Pending"
                    value={
                      pendingAppointments
                    }
                    total={
                      totalAppointments
                    }
                  />

                  <ChartBox
                    title="Confirmed"
                    value={
                      confirmedAppointments
                    }
                    total={
                      totalAppointments
                    }
                  />

                  <ChartBox
                    title="Cancelled"
                    value={
                      cancelledAppointments
                    }
                    total={
                      totalAppointments
                    }
                  />
                </div>
              </section>

              <section
                style={{
                  marginBottom: "30px"
                }}
              >
                <h2
                  style={sectionTitle}
                >
                  Report Records
                </h2>

                <div
                  style={{
                    overflowX:
                      "auto",
                    backgroundColor:
                      "rgba(15,23,42,0.55)",
                    borderRadius:
                      "12px"
                  }}
                >
                  {reportAppointments.length ===
                  0 ? (
                    <div
                      style={
                        emptyBox
                      }
                    >
                      No appointments found
                      for the selected period.
                    </div>
                  ) : (
                    <table
                      style={{
                        width: "100%",
                        borderCollapse:
                          "collapse"
                      }}
                    >
                      <thead>
                        <tr>
                          <th
                            style={
                              headerStyle
                            }
                          >
                            Date
                          </th>

                          <th
                            style={
                              headerStyle
                            }
                          >
                            Patient
                          </th>

                          <th
                            style={
                              headerStyle
                            }
                          >
                            Doctor
                          </th>

                          <th
                            style={
                              headerStyle
                            }
                          >
                            Time
                          </th>

                          <th
                            style={
                              headerStyle
                            }
                          >
                            Status
                          </th>

                          <th
                            style={
                              headerStyle
                            }
                          >
                            Fee
                          </th>

                          <th
                            style={
                              headerStyle
                            }
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
                                  "N/A"}{" "}
                                -{" "}
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
                                {formatCurrency(
                                  appointment.consultation_fee
                                )}
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
                  )}
                </div>
              </section>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap"
                }}
              >
                <button
                  onClick={exportPDF}
                  style={{
                    padding:
                      "12px 22px",
                    border: "none",
                    borderRadius:
                      "8px",
                    backgroundColor:
                      "#dc2626",
                    color: "white",
                    cursor:
                      "pointer",
                    fontWeight:
                      "600"
                  }}
                >
                  Export PDF
                </button>

                <button
                  onClick={
                    exportExcel
                  }
                  style={{
                    padding:
                      "12px 22px",
                    border: "none",
                    borderRadius:
                      "8px",
                    backgroundColor:
                      "#16a34a",
                    color: "white",
                    cursor:
                      "pointer",
                    fontWeight:
                      "600"
                  }}
                >
                  Export Excel
                </button>

                <button
                  onClick={
                    loadReports
                  }
                  style={{
                    padding:
                      "12px 22px",
                    border: "none",
                    borderRadius:
                      "8px",
                    backgroundColor:
                      "#2563eb",
                    color: "white",
                    cursor:
                      "pointer",
                    fontWeight:
                      "600"
                  }}
                >
                  Refresh Reports
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function ReportCard({ title, value }) {
  return (
    <div
      style={{
        padding: "20px",
        backgroundColor:
          "rgba(15,23,42,0.55)",
        border:
          "1px solid rgba(255,255,255,0.12)",
        borderRadius: "10px"
      }}
    >
      <p
        style={{
          margin: "0 0 8px",
          color: "#94a3b8",
          fontSize: "14px"
        }}
      >
        {title}
      </p>

      <h3
        style={{
          margin: 0,
          color: "#f1f5f9",
          fontSize: "25px"
        }}
      >
        {value}
      </h3>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div
      style={{
        backgroundColor:
          "rgba(255,255,255,0.04)",
        padding: "12px",
        borderRadius: "8px"
      }}
    >
      <p
        style={{
          margin: "0 0 5px",
          color: "#94a3b8",
          fontSize: "12px"
        }}
      >
        {label}
      </p>

      <strong
        style={{
          color: "#f1f5f9",
          fontSize: "16px"
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function ChartBox({ title, value, total }) {
  const percentage =
    total > 0
      ? Math.round((value / total) * 100)
      : 0;

  return (
    <div
      style={{
        backgroundColor:
          "rgba(15,23,42,0.55)",
        padding: "20px",
        borderRadius: "12px"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          marginBottom: "12px"
        }}
      >
        <span
          style={{
            color: "#cbd5e1"
          }}
        >
          {title}
        </span>

        <strong
          style={{
            color: "#f1f5f9"
          }}
        >
          {percentage}%
        </strong>
      </div>

      <div
        style={{
          height: "15px",
          backgroundColor:
            "#334155",
          borderRadius: "20px",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            width:
              percentage + "%",
            height: "100%",
            backgroundColor:
              "#2563eb",
            borderRadius: "20px"
          }}
        />
      </div>

      <p
        style={{
          color: "#94a3b8",
          fontSize: "12px",
          marginTop: "10px"
        }}
      >
        {value} out of {total} appointments
      </p>
    </div>
  );
}

const sectionTitle = {
  color: "#f1f5f9",
  fontSize: "22px",
  fontWeight: "700",
  marginBottom: "18px"
};

const cardGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "15px"
};

const emptyBox = {
  padding: "30px",
  textAlign: "center",
  color: "#94a3b8",
  backgroundColor:
    "rgba(255,255,255,0.03)",
  borderRadius: "10px"
};

const headerStyle = {
  textAlign: "left",
  padding: "13px",
  borderBottom:
    "1px solid rgba(255,255,255,0.08)",
  color: "#94a3b8",
  fontSize: "12px",
  fontWeight: "600",
  whiteSpace: "nowrap"
};

const cellStyle = {
  padding: "13px",
  borderBottom:
    "1px solid rgba(255,255,255,0.08)",
  color: "#f1f5f9",
  whiteSpace: "nowrap"
};