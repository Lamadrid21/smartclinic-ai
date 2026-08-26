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

    setAiConsultations(0);
    setLoading(false);
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
              {loading ? "..." : appointments}
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-gray-500">
              AI Consultations
            </h2>

            <p className="text-4xl font-bold text-black mt-2">
              {loading ? "..." : aiConsultations}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <button
            onClick={() => router.push("/appointments")}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Book Appointment
          </button>

          <button
            onClick={() =>
              router.push("/appointments/manage")
            }
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold"
          >
            My Appointments
          </button>

          <button
            onClick={() =>
              router.push("/profile")
            }
            className="bg-gray-700 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Profile
          </button>

          <button
            onClick={logoutUser}
            className="bg-red-500 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}