"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function AppointmentsPage() {
  const router = useRouter();

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);

  const [availableTimes, setAvailableTimes] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [loadingTimes, setLoadingTimes] = useState(false);

  const [reason, setReason] = useState("");
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchAvailableTimes();
    } else {
      setAvailableTimes([]);
      setSelectedTime("");
    }
  }, [selectedDoctor, selectedDate]);

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

    const { data: scheduleData, error: scheduleError } =
      await supabase
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

    const { data: bookedData, error: bookedError } =
      await supabase
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
        const time = `${String(hour).padStart(2, "0")}:${String(
          minute
        ).padStart(2, "0")}`;

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
    const endHour = hour + 1;

    return `${String(endHour).padStart(2, "0")}:${String(
      minute
    ).padStart(2, "0")}:00`;
  }

  async function confirmAppointment() {
    if (!selectedDoctor || !selectedDate || !selectedTime) {
      alert("Please select a doctor, date, and time.");
      return;
    }

    setBooking(true);

    // GET LOGGED-IN USER
    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    const user = userData?.user;

    if (userError || !user) {
      alert("Please login first.");
      setBooking(false);
      router.push("/login");
      return;
    }

    // GET PATIENT PROFILE
    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
      alert("Patient profile not found.");
      setBooking(false);
      return;
    }

    const endTime = getEndTime(selectedTime);

    // CHECK DOUBLE BOOKING
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

    if (
      existingAppointment &&
      existingAppointment.length > 0
    ) {
      alert(
        "This time slot is already booked. Please select another time."
      );

      setBooking(false);

      await fetchAvailableTimes();

      return;
    }

    // GET DOCTOR NAME
    const selectedDoctorData = doctors.find(
      (doctor) =>
        String(doctor.id) === String(selectedDoctor)
    );

    const doctorName =
      selectedDoctorData?.name || "Doctor";

    // GET PATIENT NAME
    const patientName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.user_metadata?.display_name ||
      user.email?.split("@")[0] ||
      "Patient";

    // SAVE APPOINTMENT
    const {
      data: appointmentData,
      error,
    } = await supabase
      .from("appointments")
      .insert({
        patient_id: profile.id,
        doctor_id: Number(selectedDoctor),
        appointment_date: selectedDate,
        start_time: selectedTime + ":00",
        end_time: endTime,
        reason: reason || null,
        status: "Pending",
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

    // SEND EMAIL CONFIRMATION
    try {
      const emailResponse = await fetch(
        "/api/send-confirmation",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: user.email,
            patientName: patientName,
            doctorName: doctorName,
            appointmentDate: selectedDate,
            startTime: selectedTime,
            reason: reason || "None",
          }),
        }
      );

      const emailResult =
        await emailResponse.json();

      if (!emailResponse.ok) {
        console.error(
          "Email sending failed:",
          emailResult
        );

        alert(
          "Appointment successfully booked, but the email confirmation could not be sent.\n\n" +
            "Reason: " +
            (emailResult.error ||
              "Unknown error")
        );

        setBooking(false);

        router.push("/dashboard");

        return;
      }

      console.log(
        "Email sent successfully:",
        emailResult
      );

    } catch (emailError) {
      console.error(
        "Email API error:",
        emailError
      );

      alert(
        "Appointment successfully booked, but there was a problem sending the email."
      );

      setBooking(false);

      router.push("/dashboard");

      return;
    }

    // SUCCESS
    alert(
      "Appointment successfully booked!\n\n" +
        "Confirmation email sent to:\n" +
        user.email
    );

    setBooking(false);

    router.push("/dashboard");
  }

  const selectedDoctorName =
    doctors.find(
      (doctor) =>
        String(doctor.id) ===
        String(selectedDoctor)
    )?.name || "";

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
          maxWidth: "700px",
          margin: "0 auto",
          backgroundColor: "white",
          padding: "30px",
          borderRadius: "12px",
          boxShadow:
            "0 4px 15px rgba(0,0,0,0.08)",
        }}
      >

        <button
          onClick={() =>
            router.push("/dashboard")
          }
          style={{
            marginBottom: "20px",
            padding: "8px 14px",
            border: "none",
            borderRadius: "8px",
            backgroundColor: "#e5e7eb",
            cursor: "pointer",
          }}
        >
          ← Back to Dashboard
        </button>

        <h1 style={{ marginBottom: "10px" }}>
          Appointment Booking
        </h1>

        <p
          style={{
            color: "#666",
            marginBottom: "30px",
          }}
        >
          Select your doctor, preferred
          appointment date and time.
        </p>

        {/* SELECT DOCTOR */}
        <div style={{ marginBottom: "25px" }}>

          <label
            style={{
              display: "block",
              fontWeight: "600",
              marginBottom: "8px",
            }}
          >
            Select Doctor
          </label>

          {loading ? (
            <p>Loading doctors...</p>
          ) : (
            <select
              value={selectedDoctor}
              onChange={(e) =>
                setSelectedDoctor(
                  e.target.value
                )
              }
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                fontSize: "16px",
              }}
            >
              <option value="">
                -- Select Doctor --
              </option>

              {doctors.map((doctor) => (
                <option
                  key={doctor.id}
                  value={doctor.id}
                >
                  {doctor.name} -{" "}
                  {doctor.specialization}
                </option>
              ))}
            </select>
          )}

        </div>

        {/* SELECT DATE */}
        <div style={{ marginBottom: "25px" }}>

          <label
            style={{
              display: "block",
              fontWeight: "600",
              marginBottom: "8px",
            }}
          >
            Select Date
          </label>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) =>
              setSelectedDate(
                e.target.value
              )
            }
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              fontSize: "16px",
            }}
          />

        </div>

        {/* SELECT TIME */}
        {selectedDoctor &&
          selectedDate && (
            <div
              style={{
                marginBottom: "25px",
              }}
            >

              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  marginBottom: "8px",
                }}
              >
                Select Time
              </label>

              {loadingTimes ? (
                <p>
                  Loading available
                  times...
                </p>
              ) : availableTimes.length ===
                0 ? (
                <p>
                  No available time for
                  this doctor on the
                  selected day.
                </p>
              ) : (
                <select
                  value={selectedTime}
                  onChange={(e) =>
                    setSelectedTime(
                      e.target.value
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "12px",
                    border:
                      "1px solid #ccc",
                    borderRadius: "8px",
                    fontSize: "16px",
                  }}
                >
                  <option value="">
                    -- Select Time --
                  </option>

                  {availableTimes.map(
                    (time) => (
                      <option
                        key={time}
                        value={time}
                      >
                        {time}
                      </option>
                    )
                  )}
                </select>
              )}

            </div>
          )}

        {/* REASON */}
        <div style={{ marginBottom: "25px" }}>

          <label
            style={{
              display: "block",
              fontWeight: "600",
              marginBottom: "8px",
            }}
          >
            Reason
          </label>

          <textarea
            value={reason}
            onChange={(e) =>
              setReason(e.target.value)
            }
            placeholder="Optional reason for appointment"
            rows="3"
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              fontSize: "16px",
              resize: "vertical",
            }}
          />

        </div>

        {/* APPOINTMENT DETAILS */}
        {selectedDoctor &&
          selectedDate &&
          selectedTime && (
            <div
              style={{
                padding: "15px",
                backgroundColor: "#f0f7ff",
                borderRadius: "8px",
                marginTop: "20px",
                marginBottom: "20px",
              }}
            >

              <strong>
                Appointment Details
              </strong>

              <p
                style={{
                  marginTop: "10px",
                }}
              >
                Doctor:{" "}
                <strong>
                  {selectedDoctorName}
                </strong>
              </p>

              <p>
                Date:{" "}
                <strong>
                  {selectedDate}
                </strong>
              </p>

              <p>
                Time:{" "}
                <strong>
                  {selectedTime}
                </strong>
              </p>

              <p>
                Reason:{" "}
                <strong>
                  {reason || "None"}
                </strong>
              </p>

            </div>
          )}

        {/* CONFIRM BUTTON */}
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
            padding: "14px",
            border: "none",
            borderRadius: "8px",

            backgroundColor:
              booking ||
              !selectedDoctor ||
              !selectedDate ||
              !selectedTime
                ? "#9ca3af"
                : "#2563eb",

            color: "white",
            fontSize: "16px",
            fontWeight: "600",

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
            ? "Booking..."
            : "Confirm Appointment"}
        </button>

      </div>
    </main>
  );
}