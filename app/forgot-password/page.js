"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  async function resetPassword() {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: "http://localhost:3000/change-password",
      }
    );

    if (error) {
      alert(error.message);
      return;
    }

    alert("Password reset email sent.");
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-[450px]">
        <h1 className="text-3xl font-bold text-black text-center">
          Forgot Password
        </h1>

        <p className="text-black text-center mt-2">
          Enter your email to receive a reset link.
        </p>

        <input
          type="email"
          placeholder="Email Address"
          className="w-full border p-3 rounded-xl mt-6 text-black placeholder:text-black"
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={resetPassword}
          className="w-full bg-blue-600 text-white p-3 rounded-xl mt-6 hover:bg-blue-700"
        >
          Send Reset Link
        </button>

        <a
          href="/login"
          className="block text-center mt-4 text-black"
        >
          Back to Login
        </a>
      </div>
    </main>
  );
}