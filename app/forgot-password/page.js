"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function resetPassword(e) {
    if (e) e.preventDefault();
    setErrorMsg("");
    setMessage("");

    if (!email) {
      setErrorMsg("Please enter your email address.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/change-password`,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    setMessage("Password reset instructions have been sent to your email.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-12 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[450px] w-[750px] rounded-full bg-blue-600/15 blur-[140px]" />
      </div>

      <div className="w-full max-w-[440px]">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-[1px] shadow-lg shadow-blue-500/25">
              <div className="w-full h-full bg-slate-900 rounded-[15px] flex items-center justify-center text-blue-400 font-bold text-2xl">
                ✚
              </div>
            </div>
          </Link>
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Reset Password
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
            We&apos;ll send you a recovery link to restore access
          </p>
        </div>

        <div className="glass-card p-6 sm:p-8 rounded-3xl">
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {message && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
              {message}
            </div>
          )}

          <form onSubmit={resetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Account Email
              </label>
              <input
                type="email"
                placeholder="doctor@smartclinic.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="glass-input w-full rounded-xl px-4 py-3 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {loading ? "Sending link..." : "Send Reset Link"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Remembered your password?{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold">
              Return to Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
