"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function loginUser(e) {
    if (e) e.preventDefault();
    setErrorMsg("");

    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  async function loginWithGoogle() {
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setErrorMsg(error.message);
    }
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
            Welcome back
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
            Sign in to access your SmartClinic dashboard
          </p>
        </div>

        <div className="glass-card p-6 sm:p-8 rounded-3xl">
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={loginUser} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Email Address
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300">
                  Forgot password?
                </Link>
              </div>
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
              {loading ? "Signing in..." : "Sign In to Clinic"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#0f172a] px-3 text-slate-400">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={loginWithGoogle}
            className="btn-secondary w-full py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
          >
            <span>Sign in with Google</span>
          </button>

          <p className="mt-6 text-center text-xs text-slate-400">
            Don&apos;t have an account yet?{" "}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold">
              Register now
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
