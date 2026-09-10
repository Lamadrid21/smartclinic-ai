"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ChangePassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function updatePassword(e) {
    if (e) e.preventDefault();
    setErrorMsg("");
    setMessage("");

    if (!password) {
      setErrorMsg("Please enter a new password.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    setMessage("Your password has been successfully updated.");
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
            Set New Password
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
            Create a secure password for your clinical account
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

          <form onSubmit={updatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                New Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="glass-input w-full rounded-xl px-4 py-3 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Finished updating?{" "}
            <Link href="/profile" className="text-blue-400 hover:text-blue-300 font-semibold">
              Return to Profile
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
