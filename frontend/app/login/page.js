"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ReCaptcha from "@/components/ReCaptcha";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [captchaPassed, setCaptchaPassed] = useState(false);

  const recaptchaRef = useRef(null);

  /**
   * Sends the Google reCAPTCHA token to the backend, which verifies it
   * against Google's siteverify API. Returns true only when the backend
   * confirms the token is valid. Never trusts the client-side checkbox.
   */
  async function verifyCaptchaWithBackend() {
    const captchaToken = recaptchaRef.current?.getToken();
    if (!captchaToken) {
      setErrorMsg("Please complete the CAPTCHA.");
      return false;
    }

    try {
      const res = await fetch("/api/auth/verify-captcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken }),
      });

      // Defensively parse the response: if the proxy ever returns a non-JSON
      // 500 (e.g. the backend was briefly unreachable), treat it as a CAPTCHA
      // failure instead of throwing an uncaught "Unexpected token" error.
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok || !data?.success) {
        recaptchaRef.current?.reset();
        setErrorMsg(
          data?.error || "CAPTCHA verification failed. Please try again."
        );
        return false;
      }

      return true;
    } catch (err) {
      console.error("CAPTCHA verification request failed:", err);
      recaptchaRef.current?.reset();
      setErrorMsg("CAPTCHA verification failed. Please try again.");
      return false;
    }
  }

  async function loginUser(e) {
    if (e) e.preventDefault();
    setErrorMsg("");

    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    if (!captchaPassed) {
      setErrorMsg("Please complete the CAPTCHA.");
      return;
    }

    setLoading(true);

    // ---- Server-side CAPTCHA verification before any login attempt ----
    const captchaOk = await verifyCaptchaWithBackend();
    if (!captchaOk) {
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // reCAPTCHA tokens are single-use, so reset after every attempt.
    recaptchaRef.current?.reset();

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  async function loginWithGoogle() {
    setErrorMsg("");

    if (!captchaPassed) {
      setErrorMsg("Please complete the CAPTCHA.");
      return;
    }

    setLoading(true);

    // ---- Server-side CAPTCHA verification before the OAuth redirect ----
    const captchaOk = await verifyCaptchaWithBackend();
    if (!captchaOk) {
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    recaptchaRef.current?.reset();

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
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

            {/* GOOGLE reCAPTCHA - required; verified by the backend before login. */}
            <ReCaptcha ref={recaptchaRef} onChange={setCaptchaPassed} />

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
            disabled={loading}
            className="btn-secondary w-full py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
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
