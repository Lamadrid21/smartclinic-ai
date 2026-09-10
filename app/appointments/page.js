"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";

function AppointmentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [availableTimes, setAvailableTimes] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [booking, setBooking] = useState(false);
  const [user, setUser] = useState(null);

  const [activeTab, setActiveTab] = useState("book");

  const [rescheduleId, setRescheduleId] = useState(null);

  const SHORTEST_WAITING_TIME = 5;
  const AVERAGE_WAITING_TIME = 10;
  const LONGEST_WAITING_TIME = 30;

  useEffect(() => {
    getUser();
    fetchDoctors();

    const reschedule = searchParams.get("reschedule");

    if (reschedule) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRescheduleId(reschedule);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchAvailableTimes();
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvailableTimes([]);
      setSelectedTime("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDoctor, selectedDate]);

  async function getUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUser(user);
  }

  async function fetchDoctors() {
    setLoading(true);

    const { data, error } = await supabase
      .from("doctors")
      .select("id, name, specialization")
      .order("name");

    if (error) {
      alert("Supabase Error: " + error.message);
      setLoading(false);
      return;
    }

    setDoctors(data || []);
    setLoading(false);
  }

  async function fetchAvailableTimes() {
    setLoadingTimes(true);
    setAvailableTimes([]);
    setSelectedTime("");

    const date = new Date(selectedDate + "T00:00:00");

    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const dayOfWeek = days[date.getDay()];

    const {
      data: scheduleData,
      error: scheduleError,
    } = await supabase
      .from("doctor_schedules")
      .select("start_time, end_time")
      .eq("doctor_id", Number(selectedDoctor))
      .eq("day_of_week", dayOfWeek);

    if (scheduleError) {
      alert("Schedule Error: " + scheduleError.message);
      setLoadingTimes(false);
      return;
    }

    if (!scheduleData || scheduleData.length === 0) {
      setAvailableTimes([]);
      setLoadingTimes(false);
      return;
    }

    const {
      data: bookedData,
      error: bookedError,
    } = await supabase
      .from("appointments")
      .select("start_time, end_time, status")
      .eq("doctor_id", Number(selectedDoctor))
      .eq("appointment_date", selectedDate)
      .neq("status", "Cancelled");

    if (bookedError) {
      alert("Appointment Error: " + bookedError.message);
      setLoadingTimes(false);
      return;
    }

    const bookedTimes = new Set(
      (bookedData || []).map((appointment) =>
        appointment.start_time.slice(0, 5)
      )
    );

    if (rescheduleId) {
      const { data: currentAppointment } = await supabase
        .from("appointments")
        .select("start_time")
        .eq("id", rescheduleId)
        .single();

      if (currentAppointment) {
        bookedTimes.delete(
          currentAppointment.start_time.slice(0, 5)
        );
      }
    }

    const times = [];

    for (const schedule of scheduleData) {
      const start = schedule.start_time.slice(0, 5);
      const end = schedule.end_time.slice(0, 5);

      let [hour, minute] = start.split(":").map(Number);
      const [endHour, endMinute] = end.split(":").map(Number);

      while (
        hour < endHour ||
        (hour === endHour && minute < endMinute)
      ) {
        const time = `${String(hour).padStart(
          2,
          "0"
        )}:${String(minute).padStart(2, "0")}`;

        if (!bookedTimes.has(time)) {
          times.push(time);
        }

        hour += 1;
      }
    }

    setAvailableTimes([...new Set(times)]);
    setLoadingTimes(false);
  }

  function getEndTime(startTime) {
    const [hour, minute] = startTime.split(":").map(Number);

    const date = new Date();
    date.setHours(hour);
    date.setMinutes(minute);
    date.setSeconds(0);
    date.setMilliseconds(0);
    date.setHours(date.getHours() + 1);

    return `${String(date.getHours()).padStart(
      2,
      "0"
    )}:${String(date.getMinutes()).padStart(2, "0")}:00`;
  }

  function getConsultationFee(specialization) {
    const value = specialization?.toLowerCase().trim();

    if (value === "general medicine") {
      return 500;
    }

    if (value === "pediatrics") {
      return 800;
    }

    if (value === "dermatology") {
      return 1000;
    }

    if (value === "cardiology") {
      return 1500;
    }

    if (value === "neurology") {
      return 700;
    }

    return 0;
  }

  async function confirmAppointment() {
    if (!selectedDoctor || !selectedDate || !selectedTime) {
      alert("Please select a doctor, date, and time.");
      return;
    }

    setBooking(true);

    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      alert("Please login first.");
      setBooking(false);
      router.push("/login");
      return;
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", currentUser.id)
      .single();

    if (profileError || !profile) {
      alert("Patient profile not found.");
      setBooking(false);
      return;
    }

    const endTime = getEndTime(selectedTime);

    const {
      data: existingAppointment,
      error: existingError,
    } = await supabase
      .from("appointments")
      .select("id")
      .eq("doctor_id", Number(selectedDoctor))
      .eq("appointment_date", selectedDate)
      .eq("start_time", selectedTime + ":00")
      .neq("status", "Cancelled")
      .limit(1);

    if (existingError) {
      alert(
        "Could not check appointment availability: " +
          existingError.message
      );
      setBooking(false);
      return;
    }

    const isSameRescheduledAppointment =
      rescheduleId &&
      existingAppointment?.some(
        (appointment) =>
          String(appointment.id) === String(rescheduleId)
      );

    if (
      existingAppointment &&
      existingAppointment.length > 0 &&
      !isSameRescheduledAppointment
    ) {
      alert(
        "This time slot is already booked. Please select another time."
      );

      setBooking(false);
      await fetchAvailableTimes();
      return;
    }

    const selectedDoctorData = doctors.find(
      (doctor) =>
        String(doctor.id) === String(selectedDoctor)
    );

    const doctorName =
      selectedDoctorData?.name || "Doctor";

    const patientName =
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      currentUser.user_metadata?.display_name ||
      currentUser.email?.split("@")[0] ||
      "Patient";

    const consultationFee = getConsultationFee(
      selectedDoctorData?.specialization
    );

    let appointmentId = rescheduleId;

    if (rescheduleId) {
      const { error: updateError } = await supabase
        .from("appointments")
        .update({
          doctor_id: Number(selectedDoctor),
          appointment_date: selectedDate,
          start_time: selectedTime + ":00",
          end_time: endTime,
          reason: reason || null,
          consultation_fee: consultationFee,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rescheduleId)
        .eq("patient_id", profile.id);

      if (updateError) {
        alert(
          "Failed to reschedule appointment: " +
            updateError.message
        );
        setBooking(false);
        return;
      }
    } else {
      const { data: insertedAppointment, error } =
        await supabase
          .from("appointments")
          .insert({
            patient_id: profile.id,
            doctor_id: Number(selectedDoctor),
            appointment_date: selectedDate,
            start_time: selectedTime + ":00",
            end_time: endTime,
            reason: reason || null,
            status: "Pending",
            waiting_time: AVERAGE_WAITING_TIME,
            consultation_fee: consultationFee,
          })
          .select()
          .single();

      if (error) {
        alert(
          "Failed to save appointment: " +
            error.message
        );
        setBooking(false);
        return;
      }

      appointmentId = insertedAppointment?.id;
    }

    try {
      const emailResponse = await fetch(
        "/api/send-confirmation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: currentUser.email,
            patientName: patientName,
            doctorName: doctorName,
            appointmentDate: selectedDate,
            startTime: selectedTime,
            reason: reason || "None",
          }),
        }
      );

      const emailResult = await emailResponse.json();

      if (!emailResponse.ok) {
        console.error(
          "Email sending failed:",
          emailResult
        );

        alert(
          (rescheduleId
            ? "Appointment successfully rescheduled"
            : "Appointment successfully booked") +
            ", but the email confirmation could not be sent.\n\n" +
            "Reason: " +
            (emailResult.error || "Unknown error")
        );

        setBooking(false);
        router.push("/dashboard");
        return;
      }
    } catch (emailError) {
      console.error(
        "Email API error:",
        emailError
      );

      alert(
        (rescheduleId
          ? "Appointment successfully rescheduled"
          : "Appointment successfully booked") +
          ", but there was a problem sending the email."
      );

      setBooking(false);
      router.push("/dashboard");
      return;
    }

    alert(
      (rescheduleId
        ? "Appointment successfully rescheduled!"
        : "Appointment successfully booked!") +
        "\n\n" +
        "Expected Waiting Time: " +
        AVERAGE_WAITING_TIME +
        " minutes\n" +
        "Shortest Possible Waiting Time: " +
        SHORTEST_WAITING_TIME +
        " minutes\n" +
        "Longest Possible Waiting Time: " +
        LONGEST_WAITING_TIME +
        " minutes\n" +
        "Consultation Fee: ₱" +
        consultationFee.toLocaleString("en-PH") +
        "\n\n" +
        "Confirmation email sent to:\n" +
        currentUser.email
    );

    setBooking(false);

    if (appointmentId) {
      router.push("/appointments/manage");
    } else {
      router.push("/dashboard");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function goToTab(tab) {
    if (tab === "manage") {
      router.push("/appointments/manage");
      return;
    }

    setActiveTab("book");
  }

  const selectedDoctorData = doctors.find(
    (doctor) =>
      String(doctor.id) === String(selectedDoctor)
  );

  const selectedDoctorName =
    selectedDoctorData?.name || "";

  const selectedDoctorSpecialization =
    selectedDoctorData?.specialization || "";

  const selectedConsultationFee = getConsultationFee(
    selectedDoctorSpecialization
  );

  const today = new Date();

  const minDate =
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0");

  return (
    <AppLayout title="Book Appointment" subtitle="Schedule your next clinic visit" activeNav="appointments">

      <section
        style={{
          flex: 1,
          padding: "30px 38px 45px",
          overflow: "auto",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "25px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "32px",
                fontWeight: "700",
                color: "#e2e8f0",
              }}
            >
              Appointments
            </h1>

            <p
              style={{
                marginTop: "7px",
                marginBottom: 0,
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              Book and manage your clinic appointments.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "25px",
            }}
          >
            <div
              style={{
                textAlign: "right",
                fontSize: "11px",
                color: "#64748b",
                lineHeight: "1.5",
              }}
            >
              <strong
                style={{
                  color: "#e2e8f0",
                }}
              >
                📅{" "}
                {today.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </strong>

              <br />

              {today.toLocaleDateString("en-US", {
                weekday: "long",
              })}{" "}
              •{" "}
              {today.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                paddingLeft: "15px",
                borderLeft: "1px solid #dbe3ed",
              }}
            >
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  backgroundColor: "#dbeafe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
              >
                👤
              </div>

              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#1e293b",
                  }}
                >
                  {user?.user_metadata?.full_name ||
                    user?.user_metadata?.name ||
                    "Patient"}
                </div>

                <div
                  style={{
                    fontSize: "11px",
                    color: "#64748b",
                  }}
                >
                  Patient
                </div>
              </div>
            </div>
          </div>
        </header>

        <div
          style={{
            borderBottom: "1px solid #dbe3ed",
            marginBottom: "22px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "5px",
            }}
          >
            <button
              onClick={() => goToTab("book")}
              style={{
                border: "none",
                backgroundColor:
                  activeTab === "book"
                    ? "#2563eb"
                    : "transparent",
                color:
                  activeTab === "book"
                    ? "white"
                    : "#475569",
                padding: "11px 18px",
                borderRadius: "7px 7px 0 0",
                fontWeight: "600",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Book Appointment
            </button>

            <button
              onClick={() => goToTab("manage")}
              style={{
                border: "none",
                backgroundColor: "transparent",
                color: "#94a3b8",
                padding: "11px 18px",
                borderRadius: "7px 7px 0 0",
                fontWeight: "600",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              My Appointments
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 2fr) minmax(300px, 0.85fr)",
            gap: "22px",
            alignItems: "start",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(15,23,42,0.6)",
              border: "1px solid #dce5ef",
              borderRadius: "10px",
              padding: "25px",
              boxShadow:
                "0 2px 8px rgba(15, 23, 42, 0.04)",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: "700",
                color: "#e2e8f0",
              }}
            >
              {rescheduleId
                ? "Reschedule Appointment"
                : "Book an Appointment"}
            </h2>

            <p
              style={{
                marginTop: "7px",
                marginBottom: "25px",
                fontSize: "12px",
                color: "#64748b",
              }}
            >
              Select your preferred doctor, date, and appointment time.
            </p>

            <div
              style={{
                marginBottom: "19px",
              }}
            >
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#e2e8f0",
                  marginBottom: "7px",
                }}
              >
                Doctor
              </label>

              {loading ? (
                <div
                  style={{
                    border: "1px solid #d5dee9",
                    borderRadius: "7px",
                    padding: "11px",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  Loading doctors...
                </div>
              ) : (
                <select
                  value={selectedDoctor}
                  onChange={(e) =>
                    setSelectedDoctor(e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "7px",
                    fontSize: "13px",
                    color: "#e2e8f0",
                    backgroundColor: "rgba(15,23,42,0.6)",
                    outline: "none",
                  }}
                >
                  <option value="">
                    Select a doctor
                  </option>

                  {doctors.map((doctor) => (
                    <option
                      key={doctor.id}
                      value={doctor.id}
                    >
                      {doctor.name} - {doctor.specialization}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "15px",
                marginBottom: "19px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#e2e8f0",
                    marginBottom: "7px",
                  }}
                >
                  Appointment Date
                </label>

                <input
                  type="date"
                  min={minDate}
                  value={selectedDate}
                  onChange={(e) =>
                    setSelectedDate(e.target.value)
                  }
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "7px",
                    fontSize: "13px",
                    color: "#e2e8f0",
                    backgroundColor: "rgba(15,23,42,0.6)",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#e2e8f0",
                    marginBottom: "7px",
                  }}
                >
                  Appointment Time
                </label>

                <select
                  value={selectedTime}
                  onChange={(e) =>
                    setSelectedTime(e.target.value)
                  }
                  disabled={
                    !selectedDoctor ||
                    !selectedDate ||
                    loadingTimes
                  }
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    fontSize: "13px",
                    color: "#cbd5e1",
                    backgroundColor:
                      !selectedDoctor ||
                      !selectedDate
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(255,255,255,0.06)",
                  }}
                >
                  <option value="">
                    {loadingTimes
                      ? "Loading times..."
                      : "Select a time"}
                  </option>

                  {availableTimes.map((time) => (
                    <option
                      key={time}
                      value={time}
                    >
                      {new Date(
                        `1970-01-01T${time}`
                      ).toLocaleTimeString(
                        "en-US",
                        {
                          hour: "numeric",
                          minute: "2-digit",
                        }
                      )}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              style={{
                marginBottom: "20px",
              }}
            >
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#e2e8f0",
                  marginBottom: "7px",
                }}
              >
                Reason for Visit
              </label>

              <textarea
                value={reason}
                onChange={(e) =>
                  setReason(e.target.value)
                }
                placeholder="Describe the reason for your appointment..."
                rows={4}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "7px",
                  fontSize: "13px",
                  color: "#e2e8f0",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {selectedDoctor &&
              selectedDate &&
              selectedTime && (
                <div
                  style={{
                    padding: "14px",
                    borderRadius: "8px",
                    backgroundColor: "#f0f7ff",
                    border: "1px solid #dbeafe",
                    marginBottom: "18px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#1e40af",
                      marginBottom: "8px",
                    }}
                  >
                    Appointment Details
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "7px 20px",
                      fontSize: "12px",
                      color: "#94a3b8",
                    }}
                  >
                    <div>
                      Doctor:{" "}
                      <strong>
                        {selectedDoctorName}
                      </strong>
                    </div>

                    <div>
                      Specialization:{" "}
                      <strong>
                        {selectedDoctorSpecialization}
                      </strong>
                    </div>

                    <div>
                      Date:{" "}
                      <strong>
                        {selectedDate}
                      </strong>
                    </div>

                    <div>
                      Time:{" "}
                      <strong>
                        {new Date(
                          `1970-01-01T${selectedTime}`
                        ).toLocaleTimeString(
                          "en-US",
                          {
                            hour: "numeric",
                            minute: "2-digit",
                          }
                        )}
                      </strong>
                    </div>

                    <div>
                      Consultation Fee:{" "}
                      <strong>
                        ₱
                        {selectedConsultationFee.toLocaleString(
                          "en-PH",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

            <button
              onClick={confirmAppointment}
              disabled={
                booking ||
                !selectedDoctor ||
                !selectedDate ||
                !selectedTime
              }
              style={{
                width: "100%",
                border: "none",
                borderRadius: "7px",
                padding: "13px",
                backgroundColor:
                  booking ||
                  !selectedDoctor ||
                  !selectedDate ||
                  !selectedTime
                    ? "#9ca3af"
                    : "#2563eb",
                color: "white",
                fontSize: "13px",
                fontWeight: "700",
                cursor:
                  booking ||
                  !selectedDoctor ||
                  !selectedDate ||
                  !selectedTime
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {booking
                ? "Processing..."
                : rescheduleId
                ? "Reschedule Appointment"
                : "📅  Book Appointment"}
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <div
              style={{
                backgroundColor: "rgba(15,23,42,0.6)",
                border: "1px solid #dce5ef",
                borderRadius: "10px",
                padding: "22px",
                boxShadow:
                  "0 2px 8px rgba(15, 23, 42, 0.04)",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "17px",
                  fontWeight: "700",
                  color: "#e2e8f0",
                }}
              >
                Estimated Waiting Time
              </h2>

              <div
                style={{
                  marginTop: "18px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 0",
                    borderBottom:
                      "1px solid #edf2f7",
                    fontSize: "12px",
                  }}
                >
                  <span
                    style={{
                      color: "#64748b",
                    }}
                  >
                    Shortest
                  </span>

                  <strong
                    style={{
                      color: "#e2e8f0",
                    }}
                  >
                    {SHORTEST_WAITING_TIME} min
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 0",
                    borderBottom:
                      "1px solid #edf2f7",
                    fontSize: "12px",
                  }}
                >
                  <span
                    style={{
                      color: "#64748b",
                    }}
                  >
                    Expected
                  </span>

                  <strong
                    style={{
                      color: "#60a5fa",
                    }}
                  >
                    {AVERAGE_WAITING_TIME} min
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 0",
                    fontSize: "12px",
                  }}
                >
                  <span
                    style={{
                      color: "#64748b",
                    }}
                  >
                    Longest
                  </span>

                  <strong
                    style={{
                      color: "#e2e8f0",
                    }}
                  >
                    {LONGEST_WAITING_TIME} min
                  </strong>
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: "rgba(16,185,129,0.12)",
                border: "1px solid rgba(16,185,129,0.25)",
                borderRadius: "10px",
                padding: "18px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#34d399",
                  marginBottom: "7px",
                }}
              >
                💡 Appointment Tip
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  lineHeight: "1.6",
                  color: "#34d399",
                }}
              >
                Please arrive a few minutes before
                your scheduled appointment time.
              </p>
            </div>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
export default function AppointmentsPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#090d16",
            color: "#94a3b8",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          Loading appointments...
        </div>
      }
    >
      <AppointmentsContent />
    </Suspense>
  );
}