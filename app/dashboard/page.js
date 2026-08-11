"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

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
        <h1 className="text-3xl font-bold mb-8">
          Dashboard
        </h1>

        <div className="grid grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-gray-500">Patients</h2>
            <p className="text-4xl font-bold">120</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-gray-500">Doctors</h2>
            <p className="text-4xl font-bold">10</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-gray-500">Appointments</h2>
            <p className="text-4xl font-bold">35</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-gray-500">AI Consultations</h2>
            <p className="text-4xl font-bold">89</p>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <a
            href="/profile"
            className="bg-blue-600 text-white px-6 py-3 rounded-xl"
          >
            Profile
          </a>

          <button
            onClick={logoutUser}
            className="bg-red-500 text-white px-6 py-3 rounded-xl"
          >
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}