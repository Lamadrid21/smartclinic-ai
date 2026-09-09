"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

  const [patients, setPatients] = useState(0);
  const [doctors, setDoctors] = useState(0);
  const [appointments, setAppointments] = useState(0);
  const [aiConsultations, setAiConsultations] = useState(0);

  const [appointmentStats, setAppointmentStats] = useState({
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    expired: 0,
  });

  const [revenueStats, setRevenueStats] = useState({
    totalRevenue: 0,
    todayRevenue: 0,
    completedRevenue: 0,
  });

  const [waitingStats] = useState({
    average: 15,
    shortest: 5,
    longest: 30,
  });

  const [peakHour, setPeakHour] = useState("");
  const [peakAppointments, setPeakAppointments] = useState(0);
  const [peakPredictions, setPeakPredictions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [savingPatient, setSavingPatient] = useState(false);

  const [patientForm, setPatientForm] = useState({
    patient_number: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "",
    contact_number: "",
    email: "",
  });

  useEffect(() => {
    loadDashboardData();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadDashboardData();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, []);

  async function loadDashboardData() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");
      return;
    }

    const {
      data: patientData,
      error: patientError,
    } = await supabase
      .from("patients")
      .select("id")
      .eq("is_archived", false);

    if (patientError) {
      console.error(
        "Patient Error:",
        patientError.message
      );
      setPatients(0);
    } else {
      setPatients(patientData?.length || 0);
    }

    const {
      data: appointmentData,
      error: appointmentError,
    } = await supabase
      .from("appointments")
      .select(
        "id, patient_id, status, appointment_date, consultation_fee"
      );

    if (appointmentError) {
      console.error(
        "Appointment Error:",
        appointmentError.message
      );

      setAppointments(0);

      setAppointmentStats({
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        expired: 0,
      });

      setRevenueStats({
        totalRevenue: 0,
        todayRevenue: 0,
        completedRevenue: 0,
      });
    } else {
      const allAppointments = appointmentData || [];

      const normalizedAppointments =
        allAppointments.map((appointment) => ({
          ...appointment,
          status:
            appointment.status?.toLowerCase() || "",
        }));

      setAppointments(
        normalizedAppointments.filter(
          (appointment) =>
            appointment.status !== "cancelled"
        ).length
      );

      const pending =
        normalizedAppointments.filter(
          (appointment) =>
            appointment.status === "pending"
        ).length;

      const confirmed =
        normalizedAppointments.filter(
          (appointment) =>
            appointment.status === "confirmed"
        ).length;

      const completed =
        normalizedAppointments.filter(
          (appointment) =>
            appointment.status === "completed"
        ).length;

      const cancelled =
        normalizedAppointments.filter(
          (appointment) =>
            appointment.status === "cancelled"
        ).length;

      const expired =
        normalizedAppointments.filter(
          (appointment) =>
            appointment.status === "expired"
        ).length;

      setAppointmentStats({
        pending,
        confirmed,
        completed,
        cancelled,
        expired,
      });

      const completedAppointments =
        normalizedAppointments.filter(
          (appointment) =>
            appointment.status === "completed"
        );

      const totalRevenue =
        completedAppointments.reduce(
          (total, appointment) =>
            total +
            Number(
              appointment.consultation_fee || 0
            ),
          0
        );

      const today = new Date()
        .toISOString()
        .split("T")[0];

      const todayRevenue =
        completedAppointments
          .filter(
            (appointment) =>
              appointment.appointment_date === today
          )
          .reduce(
            (total, appointment) =>
              total +
              Number(
                appointment.consultation_fee || 0
              ),
            0
          );

      setRevenueStats({
        totalRevenue,
        todayRevenue,
        completedRevenue: totalRevenue,
      });
    }

    const {
      data: doctorData,
      error: doctorError,
    } = await supabase
      .from("doctors")
      .select("id");

    if (doctorError) {
      console.error(
        "Doctor Error:",
        doctorError.message
      );
      setDoctors(0);
    } else {
      setDoctors(doctorData?.length || 0);
    }

    const {
      data: aiData,
      error: aiError,
    } = await supabase
      .from("ai_usage_logs")
      .select("id");

    if (aiError) {
      console.error(
        "AI Usage Error:",
        aiError.message
      );
      setAiConsultations(0);
    } else {
      setAiConsultations(aiData?.length || 0);
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        "/api/peak-hours",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${
              session?.access_token || ""
            }`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        const clinicHours = [
          "08:00",
          "09:00",
          "10:00",
          "11:00",
        ];

        const filteredPredictions =
          (data.predictions || []).filter(
            (item) =>
              clinicHours.includes(item.hour)
          );

        setPeakHour(data.peakHour || "");
        setPeakAppointments(
          data.peakAppointments || 0
        );
        setPeakPredictions(
          filteredPredictions
        );
      } else {
        console.error(
          "Peak Hour Prediction Error:",
          data
        );

        setPeakHour("");
        setPeakAppointments(0);
        setPeakPredictions([]);
      }
    } catch (error) {
      console.error(
        "Peak Hour Request Error:",
        error
      );

      setPeakHour("");
      setPeakAppointments(0);
      setPeakPredictions([]);
    }

    setLoading(false);
  }

  function handlePatientChange(e) {
    const { name, value } = e.target;

    setPatientForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function savePatient(e) {
    e.preventDefault();

    setSavingPatient(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert(
        "Your session has expired. Please log in again."
      );
      router.push("/login");
      return;
    }

    if (
      !patientForm.patient_number ||
      !patientForm.first_name ||
      !patientForm.last_name ||
      !patientForm.date_of_birth ||
      !patientForm.gender ||
      !patientForm.contact_number
    ) {
      alert(
        "Please fill in all required fields."
      );
      setSavingPatient(false);
      return;
    }

    const { error } = await supabase
      .from("patients")
      .insert([
        {
          patient_number:
            patientForm.patient_number,
          first_name:
            patientForm.first_name,
          middle_name:
            patientForm.middle_name || null,
          last_name:
            patientForm.last_name,
          date_of_birth:
            patientForm.date_of_birth,
          gender:
            patientForm.gender,
          contact_number:
            patientForm.contact_number,
          email:
            patientForm.email || null,
        },
      ]);

    if (error) {
      console.error(
        "Patient Save Error:",
        error
      );

      alert(
        "Unable to save patient.\n\n" +
          error.message
      );

      setSavingPatient(false);
      return;
    }

    alert(
      "Patient record saved successfully!"
    );

    setPatientForm({
      patient_number: "",
      first_name: "",
      middle_name: "",
      last_name: "",
      date_of_birth: "",
      gender: "",
      contact_number: "",
      email: "",
    });

    setShowPatientForm(false);
    setSavingPatient(false);

    await loadDashboardData();

    router.push("/patient-records");
  }

  async function logoutUser() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="bg-blue-600 text-white p-5 text-2xl font-bold">
        SmartClinic AI
      </div>

      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8 text-black">
          Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-gray-500">
              Patients
            </h2>

            <p className="text-4xl font-bold text-black mt-2">
              {loading ? "..." : patients}
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-gray-500">
              Doctors
            </h2>

            <p className="text-4xl font-bold text-black mt-2">
              {loading ? "..." : doctors}
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-gray-500">
              Appointments
            </h2>

            <p className="text-4xl font-bold text-black mt-2">
              {loading
                ? "..."
                : appointments}
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-gray-500">
              AI Consultations
            </h2>

            <p className="text-4xl font-bold text-black mt-2">
              {loading
                ? "..."
                : aiConsultations}
            </p>
          </div>
        </div>

        <div className="mt-8 bg-white p-6 rounded-2xl shadow">
          <h2 className="text-2xl font-bold text-black mb-6">
            Appointment Statistics
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-yellow-50 p-5 rounded-xl">
              <p className="text-gray-500">
                Pending
              </p>

              <p className="text-3xl font-bold text-black mt-2">
                {loading
                  ? "..."
                  : appointmentStats.pending}
              </p>
            </div>

            <div className="bg-blue-50 p-5 rounded-xl">
              <p className="text-gray-500">
                Confirmed
              </p>

              <p className="text-3xl font-bold text-black mt-2">
                {loading
                  ? "..."
                  : appointmentStats.confirmed}
              </p>
            </div>

            <div className="bg-green-50 p-5 rounded-xl">
              <p className="text-gray-500">
                Completed
              </p>

              <p className="text-3xl font-bold text-black mt-2">
                {loading
                  ? "..."
                  : appointmentStats.completed}
              </p>
            </div>

            <div className="bg-red-50 p-5 rounded-xl">
              <p className="text-gray-500">
                Cancelled
              </p>

              <p className="text-3xl font-bold text-black mt-2">
                {loading
                  ? "..."
                  : appointmentStats.cancelled}
              </p>
            </div>

            <div className="bg-gray-100 p-5 rounded-xl">
              <p className="text-gray-500">
                Expired
              </p>

              <p className="text-3xl font-bold text-black mt-2">
                {loading
                  ? "..."
                  : appointmentStats.expired}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white p-6 rounded-2xl shadow">
          <h2 className="text-2xl font-bold text-black mb-6">
            Revenue Overview
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-5 rounded-xl">
              <p className="text-gray-500">
                Total Revenue
              </p>

              <p className="text-3xl font-bold text-green-700 mt-2">
                ₱
                {loading
                  ? "..."
                  : revenueStats.totalRevenue.toLocaleString(
                      "en-PH",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
              </p>
            </div>

            <div className="bg-blue-50 p-5 rounded-xl">
              <p className="text-gray-500">
                Today's Revenue
              </p>

              <p className="text-3xl font-bold text-blue-700 mt-2">
                ₱
                {loading
                  ? "..."
                  : revenueStats.todayRevenue.toLocaleString(
                      "en-PH",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
              </p>
            </div>

            <div className="bg-purple-50 p-5 rounded-xl">
              <p className="text-gray-500">
                Completed Revenue
              </p>

              <p className="text-3xl font-bold text-purple-700 mt-2">
                ₱
                {loading
                  ? "..."
                  : revenueStats.completedRevenue.toLocaleString(
                      "en-PH",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-4">
            Revenue is based on completed appointments
            with a consultation fee.
          </p>
        </div>

        <div className="mt-8 bg-white p-6 rounded-2xl shadow">
          <h2 className="text-2xl font-bold text-black mb-6">
            Waiting Time Dashboard
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-yellow-50 p-5 rounded-xl">
              <p className="text-gray-500">
                Average Waiting Time
              </p>

              <p className="text-3xl font-bold text-black mt-2">
                {loading
                  ? "..."
                  : waitingStats.average}{" "}
                <span className="text-lg font-medium">
                  min
                </span>
              </p>
            </div>

            <div className="bg-green-50 p-5 rounded-xl">
              <p className="text-gray-500">
                Shortest Waiting Time
              </p>

              <p className="text-3xl font-bold text-green-700 mt-2">
                {loading
                  ? "..."
                  : waitingStats.shortest}{" "}
                <span className="text-lg font-medium">
                  min
                </span>
              </p>
            </div>

            <div className="bg-red-50 p-5 rounded-xl">
              <p className="text-gray-500">
                Longest Waiting Time
              </p>

              <p className="text-3xl font-bold text-red-700 mt-2">
                {loading
                  ? "..."
                  : waitingStats.longest}{" "}
                <span className="text-lg font-medium">
                  min
                </span>
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-4">
            The system uses a standard waiting-time
            range of 5 to 30 minutes for all appointment
            schedules.
          </p>
        </div>

        <div className="mt-8 bg-white p-6 rounded-2xl shadow">
          <h2 className="text-2xl font-bold text-black mb-2">
            Peak Clinic Hour Prediction
          </h2>

          <p className="text-gray-500 mb-6">
            AI prediction based on appointment history.
          </p>

          {loading ? (
            <p className="text-gray-500">
              Loading prediction...
            </p>
          ) : peakPredictions.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {peakPredictions.map(
                  (item, index) => {
                    const colors = [
                      "bg-purple-50 border-purple-200 text-purple-700",
                      "bg-blue-50 border-blue-200 text-blue-700",
                      "bg-green-50 border-green-200 text-green-700",
                      "bg-orange-50 border-orange-200 text-orange-700",
                    ];

                    const color =
                      colors[index % colors.length];

                    return (
                      <div
                        key={item.hour}
                        className={`p-5 rounded-xl border ${color}`}
                      >
                        <p className="text-gray-500 font-semibold">
                          Predicted Hour
                        </p>

                        <p className="text-3xl font-bold mt-2">
                          {item.hour}
                        </p>

                        <p className="text-gray-600 mt-2">
                          Expected appointments:{" "}
                          <span className="font-bold text-black">
                            {item.predictedAppointments}
                          </span>
                        </p>
                      </div>
                    );
                  }
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
                  <h3 className="text-xl font-bold text-blue-700 mb-4">
                    Historical Appointments
                  </h3>

                  <div className="space-y-3">
                    {peakPredictions.map(
                      (item) => (
                        <div
                          key={`historical-${item.hour}`}
                          className="flex justify-between items-center bg-white p-4 rounded-lg"
                        >
                          <span className="font-semibold text-black">
                            {item.hour}
                          </span>

                          <span className="font-bold text-blue-700">
                            {
                              item.historicalAppointments
                            }{" "}
                            appointments
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 p-6 rounded-xl">
                  <h3 className="text-xl font-bold text-purple-700 mb-4">
                    AI Predicted Appointments
                  </h3>

                  <div className="space-y-3">
                    {peakPredictions.map(
                      (item) => (
                        <div
                          key={`prediction-${item.hour}`}
                          className="flex justify-between items-center bg-white p-4 rounded-lg"
                        >
                          <span className="font-semibold text-black">
                            {item.hour}
                          </span>

                          <span className="font-bold text-purple-700">
                            {
                              item.predictedAppointments
                            }{" "}
                            appointments
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-gray-500">
              No appointment prediction data available.
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <button
            onClick={() =>
              setShowPatientForm(
                !showPatientForm
              )
            }
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700"
          >
            {showPatientForm
              ? "Close Patient Form"
              : "➕ Add Patient Record"}
          </button>

          <button
            onClick={() =>
              router.push("/appointments")
            }
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Book Appointment
          </button>

          <button
            onClick={() =>
              router.push(
                "/appointments/manage"
              )
            }
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold"
          >
            My Appointments
          </button>

          <button
            onClick={() =>
              router.push(
                "/patient-records"
              )
            }
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Patient Records
          </button>

          <button
            onClick={() =>
              router.push("/reports")
            }
            className="bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-700"
          >
            Reports
          </button>

          <button
            onClick={() =>
              router.push("/profile")
            }
            className="bg-gray-700 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Profile
          </button>

          <a
            href="/ai-assistant"
            className="bg-purple-600 text-white text-center px-6 py-3 rounded-xl font-semibold hover:bg-purple-700"
          >
            🤖 Ask SmartClinic AI
          </a>

          <button
            onClick={logoutUser}
            className="bg-red-500 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Logout
          </button>
        </div>

        {showPatientForm && (
          <div className="mt-8 bg-white p-8 rounded-2xl shadow">
            <h2 className="text-2xl font-bold text-black mb-6">
              Add Patient Record
            </h2>

            <p className="text-gray-500 mb-6">
              Enter the patient's information below.
              Fields marked with * are required.
            </p>

            <form
              onSubmit={savePatient}
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Patient Number *
                </label>

                <input
                  type="text"
                  name="patient_number"
                  value={
                    patientForm.patient_number
                  }
                  onChange={
                    handlePatientChange
                  }
                  placeholder="Example: P-0001"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-black"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  First Name *
                </label>

                <input
                  type="text"
                  name="first_name"
                  value={
                    patientForm.first_name
                  }
                  onChange={
                    handlePatientChange
                  }
                  placeholder="First name"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-black"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Middle Name
                </label>

                <input
                  type="text"
                  name="middle_name"
                  value={
                    patientForm.middle_name
                  }
                  onChange={
                    handlePatientChange
                  }
                  placeholder="Middle name"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Last Name *
                </label>

                <input
                  type="text"
                  name="last_name"
                  value={
                    patientForm.last_name
                  }
                  onChange={
                    handlePatientChange
                  }
                  placeholder="Last name"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-black"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date of Birth *
                </label>

                <input
                  type="date"
                  name="date_of_birth"
                  value={
                    patientForm.date_of_birth
                  }
                  onChange={
                    handlePatientChange
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-black"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Gender *
                </label>

                <select
                  name="gender"
                  value={patientForm.gender}
                  onChange={
                    handlePatientChange
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-black"
                  required
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contact Number *
                </label>

                <input
                  type="tel"
                  name="contact_number"
                  value={
                    patientForm.contact_number
                  }
                  onChange={
                    handlePatientChange
                  }
                  placeholder="09XXXXXXXXX"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-black"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  value={
                    patientForm.email
                  }
                  onChange={
                    handlePatientChange
                  }
                  placeholder="patient@email.com"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-black"
                />
              </div>

              <div className="md:col-span-2 flex gap-4 mt-4">
                <button
                  type="submit"
                  disabled={savingPatient}
                  className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {savingPatient
                    ? "Saving Patient..."
                    : "Save Patient"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowPatientForm(
                      false
                    )
                  }
                  className="bg-gray-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}