"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function loginUser() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/dashboard";
  }

  async function loginWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      alert(error.message);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-[450px]">
        <h1 className="text-3xl font-bold text-black text-center mb-6">
          SmartClinic AI
        </h1>

        <h2 className="text-xl text-center mb-6 text-black">
          Login to your account
        </h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-3 rounded-xl mb-4 text-black placeholder:text-black"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-3 rounded-xl mb-4 text-black placeholder:text-black"
        />

        <button
          onClick={loginUser}
          className="w-full bg-blue-600 text-black p-3 rounded-xl mb-3 font-semibold"
        >
          Login
        </button>

        <button
          onClick={loginWithGoogle}
          className="w-full border border-gray-300 p-3 rounded-xl mb-4 text-black font-semibold"
        >
          Sign in with Google
        </button>

        <a
          href="/forgot-password"
          className="block text-center text-black"
        >
          Forgot Password?
        </a>

        <a
          href="/register"
          className="block text-center text-black mt-4"
        >
          Don't have an account? Register
        </a>
      </div>
    </main>
  );
}