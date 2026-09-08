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
  const [loading, setLoading] = useState(true);

  // Add Patient form
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
      data: appointmentData,
      error: appointmentError,
    } = await supabase
      .from("appointments")
      .select("id, patient_id, status")
      .neq("status", "Cancelled");

    if (appointmentError) {
      console.error(
        "Appointment Error:",
        appointmentError.message
      );

      setAppointments(0);
      setPatients(0);
    } else {
      setAppointments(appointmentData?.length || 0);

      const uniquePatients = new Set(
        (appointmentData || []).map(
          (appointment) => appointment.patient_id
        )
      );

      setPatients(uniquePatients.size);
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
      alert("Your session has expired. Please log in again.");
      router.push("/login");
      return;
    }

    // Check required fields
    if (
      !patientForm.patient_number ||
      !patientForm.first_name ||
      !patientForm.last_name ||
      !patientForm.date_of_birth ||
      !patientForm.gender ||
      !patientForm.contact_number
    ) {
      alert("Please fill in all required fields.");
      setSavingPatient(false);
      return;
    }

    const { error } = await supabase
      .from("patients")
      .insert([
        {
          patient_number: patientForm.patient_number,
          first_name: patientForm.first_name,
          middle_name: patientForm.middle_name || null,
          last_name: patientForm.last_name,
          date_of_birth: patientForm.date_of_birth,
          gender: patientForm.gender,
          contact_number: patientForm.contact_number,
          email: patientForm.email || null,
        },
      ]);

    if (error) {
      console.error("Patient Save Error:", error);

      alert(
        "Unable to save patient.\n\n" +
        error.message
      );

      setSavingPatient(false);
      return;
    }

    alert("Patient record saved successfully!");

    // Clear form
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

    // Refresh dashboard numbers
    loadDashboardData();

    // Go to Patient Records
    router.push("/patient-records");
  }

  async function logoutUser() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-slate-100">

      {/* Header */}
      <div className="bg-blue-600 text-white p-5 text-2xl font-bold">
        SmartClinic AI
      </div>

      <div className="p-8">

        {/* Dashboard Title */}
        <h1 className="text-3xl font-bold mb-8 text-black">
          Dashboard
        </h1>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* Patients */}
          <div className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-gray-500">
              Patients
            </h2>

            <p className="text-4xl font-bold text-black mt-2">
              {loading ? "..." : patients}
            </p>
          </div>

          {/* Doctors */}
          <div className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-gray-500">
              Doctors
            </h2>

            <p className="text-4xl font-bold text-black mt-2">
              {loading ? "..." : doctors}
            </p>
          </div>

          {/* Appointments */}
          <div className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-gray-500">
              Appointments
            </h2>

            <p className="text-4xl font-bold text-black mt-2">
              {loading ? "..." : appointments}
            </p>
          </div>

          {/* AI Consultations */}
          <div className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-gray-500">
              AI Consultations
            </h2>

            <p className="text-4xl font-bold text-black mt-2">
              {loading ? "..." : aiConsultations}
            </p>
          </div>

        </div>

        {/* Dashboard Buttons */}
        <div className="mt-8 flex flex-wrap gap-4">

          {/* Add Patient Record */}
          <button
            onClick={() =>
              setShowPatientForm(!showPatientForm)
            }
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700"
          >
            {showPatientForm
              ? "Close Patient Form"
              : "➕ Add Patient Record"}
          </button>

          {/* Book Appointment */}
          <button
            onClick={() => router.push("/appointments")}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Book Appointment
          </button>

          {/* My Appointments */}
          <button
            onClick={() =>
              router.push("/appointments/manage")
            }
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold"
          >
            My Appointments
          </button>

          {/* Patient Records */}
          <button
            onClick={() =>
              router.push("/patient-records")
            }
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Patient Records
          </button>

          {/* Profile */}
          <button
            onClick={() =>
              router.push("/profile")
            }
            className="bg-gray-700 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Profile
          </button>

          {/* AI Assistant */}
          <a
            href="/ai-assistant"
            className="bg-purple-600 text-white text-center px-6 py-3 rounded-xl font-semibold hover:bg-purple-700"
          >
            🤖 Ask SmartClinic AI
          </a>

          {/* Logout */}
          <button
            onClick={logoutUser}
            className="bg-red-500 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Logout
          </button>

        </div>

        {/* Add Patient Form */}
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

              {/* Patient Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Patient Number *
                </label>

                <input
                  type="text"
                  name="patient_number"
                  value={patientForm.patient_number}
                  onChange={handlePatientChange}
                  placeholder="Example: P-0001"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-black"
                  required
                />
              </div>

              {/* First Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  First Name *
                </label>

                <input
                  type="text"
                  name="first_name"
                  value={patientForm.first_name}
                  onChange={handlePatientChange}
                  placeholder="First name"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-black"
                  required
                />
              </div>

              {/* Middle Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Middle Name
                </label>

                <input
                  type="text"
                  name="middle_name"
                  value={patientForm.middle_name}
                  onChange={handlePatientChange}
                  placeholder="Middle name"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-black"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Last Name *
                </label>

                <input
                  type="text"
                  name="last_name"
                  value={patientForm.last_name}
                  onChange={handlePatientChange}
                  placeholder="Last name"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-black"
                  required
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date of Birth *
                </label>

                <input
                  type="date"
                  name="date_of_birth"
                  value={patientForm.date_of_birth}
                  onChange={handlePatientChange}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-black"
                  required
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Gender *
                </label>

                <select
                  name="gender"
                  value={patientForm.gender}
                  onChange={handlePatientChange}
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

              {/* Contact Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contact Number *
                </label>

                <input
                  type="tel"
                  name="contact_number"
                  value={patientForm.contact_number}
                  onChange={handlePatientChange}
                  placeholder="09XXXXXXXXX"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-black"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  value={patientForm.email}
                  onChange={handlePatientChange}
                  placeholder="patient@email.com"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-black"
                />
              </div>

              {/* Buttons */}
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
                    setShowPatientForm(false)
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