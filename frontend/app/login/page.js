"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ReCaptcha from "@/components/ReCaptcha";
import { ROLES, setUserRole } from "@/lib/auth-role";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams?.get("role") || ROLES.PATIENT;

  const [selectedRole, setSelectedRole] = useState(
    [ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN].includes(initialRole)
      ? initialRole
      : ROLES.PATIENT
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [captchaPassed, setCaptchaPassed] = useState(false);

  const recaptchaRef = useRef(null);

  useEffect(() => {
    const roleParam = searchParams?.get("role");
    if (roleParam && [ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN].includes(roleParam)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedRole(roleParam);
    }
  }, [searchParams]);

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

    const { data: authData, error } = await supabase.auth.signInWithPassword({
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

    await setUserRole(selectedRole, authData?.user);

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

    await setUserRole(selectedRole);

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

  const roleMeta = {
    [ROLES.PATIENT]: {
      title: "Patient Portal",
      subtitle: "Access appointments, digital prescriptions & health records",
      badge: "👤 Patient Access",
      emailPlaceholder: "patient@example.com",
      accent: "from-blue-600 to-cyan-500",
      cta: "Sign In as Patient",
    },
    [ROLES.DOCTOR]: {
      title: "Doctor Portal",
      subtitle: "Manage daily queue, EMR charts, vital signs & prescriptions",
      badge: "🩺 Medical Staff",
      emailPlaceholder: "dr.smith@smartclinic.ai",
      accent: "from-emerald-600 to-teal-500",
      cta: "Sign In as Doctor",
    },
    [ROLES.ADMIN]: {
      title: "Clinic Administration",
      subtitle: "Clinic analytics, doctor monitor, revenue & system audit",
      badge: "⚙️ Administrator",
      emailPlaceholder: "admin@smartclinic.ai",
      accent: "from-purple-600 to-indigo-500",
      cta: "Sign In as Admin",
    },
  };

  const currentMeta = roleMeta[selectedRole];

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
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-white">
            SmartClinic <span className="text-cyan-400">AI</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Intelligent Medical & Patient Care Suite
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 border border-white/10 mb-4 shadow-xl">
          <button
            type="button"
            onClick={() => setSelectedRole(ROLES.PATIENT)}
            className={`py-2.5 px-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
              selectedRole === ROLES.PATIENT
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="text-base">👤</span>
            <span>Patient</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole(ROLES.DOCTOR)}
            className={`py-2.5 px-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
              selectedRole === ROLES.DOCTOR
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="text-base">🩺</span>
            <span>Doctor</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole(ROLES.ADMIN)}
            className={`py-2.5 px-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
              selectedRole === ROLES.ADMIN
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="text-base">⚙️</span>
            <span>Admin</span>
          </button>
        </div>

        <div className="glass-card p-6 sm:p-8 rounded-3xl">
          <div className="mb-5 pb-4 border-b border-white/10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white/5 border border-white/10 text-slate-300 mb-2">
              {currentMeta.badge}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">{currentMeta.title}</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{currentMeta.subtitle}</p>
          </div>
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
                placeholder={currentMeta.emailPlaceholder}
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
              className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mt-2 disabled:opacity-50 text-white bg-gradient-to-r ${currentMeta.accent} shadow-lg shadow-blue-500/20 hover:brightness-110 transition-all`}
            >
              {loading ? "Signing in..." : currentMeta.cta}
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
            <Link
              href={`/register?role=${selectedRole}`}
              className="text-blue-400 hover:text-blue-300 font-semibold"
            >
              Create {selectedRole === ROLES.PATIENT ? "Patient" : "Staff"} Account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function Login() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#090d16]">
          <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
