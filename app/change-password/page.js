"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ChangePassword() {
  const [password, setPassword] = useState("");

  async function updatePassword() {
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Password updated successfully.");
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-[450px]">
        <h1 className="text-3xl font-bold text-blue-600 text-center">
          Change Password
        </h1>

        <p className="text-gray-500 text-center mt-2">
          Enter your new password below.
        </p>

        <input
          type="password"
          placeholder="New Password"
          className="w-full border p-3 rounded-xl mt-6"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={updatePassword}
          className="w-full bg-blue-600 text-white p-3 rounded-xl mt-6 hover:bg-blue-700"
        >
          Update Password
        </button>

        <a
          href="/profile"
          className="block text-center mt-4 text-blue-600"
        >
          Back to Profile
        </a>
      </div>
    </main>
  );
}