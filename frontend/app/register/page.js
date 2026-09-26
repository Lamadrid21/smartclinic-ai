"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ReCaptcha from "@/components/ReCaptcha";
import { ROLES, setUserRole } from "@/lib/auth-role";

function RegisterContent() {
  const searchParams = useSearchParams();
  const initialRole = searchParams?.get("role");

  const [selectedRole, setSelectedRole] = useState(
    [ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN].includes(initialRole)
      ? initialRole
      : ROLES.PATIENT
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [captchaPassed, setCaptchaPassed] = useState(false);

  const recaptchaRef = useRef(null);

  useEffect(() => {
    const roleParam = searchParams?.get("role");
    if (roleParam && [ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN].includes(roleParam)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedRole(roleParam);
    }
  }, [searchParams]);

  async function registerUser(e) {
    if (e) e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // ---- Basic input validation ----
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password should be at least 6 characters.");
      return;
    }

    // ---- reCAPTCHA check (frontend gate only) ----
    if (!captchaPassed) {
      setErrorMsg("Please complete the CAPTCHA.");
      return;
    }

    const captchaToken = recaptchaRef.current?.getToken();
    if (!captchaToken) {
      setErrorMsg("Please complete the CAPTCHA.");
      return;
    }

    setLoading(true);

    // ---- Server-side CAPTCHA verification (never trust the client) ----
    try {
      const captchaRes = await fetch("/api/auth/verify-captcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken }),
      });

      // Defensively parse the response: if the proxy ever returns a non-JSON
      // 500 (e.g. the backend was briefly unreachable), treat it as a CAPTCHA
      // failure instead of throwing an uncaught "Unexpected token" error.
      let captchaData = null;
      try {
        captchaData = await captchaRes.json();
      } catch {
        captchaData = null;
      }

      if (!captchaRes.ok || !captchaData?.success) {
        // Clear the used token; the user must complete the CAPTCHA again.
        recaptchaRef.current?.reset();
        setErrorMsg(
          captchaData?.error || "CAPTCHA verification failed. Please try again."
        );
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error("CAPTCHA verification request failed:", err);
      recaptchaRef.current?.reset();
      setErrorMsg("CAPTCHA verification failed. Please try again.");
      setLoading(false);
      return;
    }

    // ---- CAPTCHA passed → proceed with existing Supabase signup ----
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: selectedRole,
        },
      },
    });

    // reCAPTCHA tokens are single-use, so reset the widget after every attempt.
    recaptchaRef.current?.reset();

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    if (authData?.user) {
      await setUserRole(selectedRole, authData.user);
    }

    setSuccessMsg("Account created! Check your email inbox for the verification link.");
    setLoading(false);
  }

  const roleMeta = {
    [ROLES.PATIENT]: {
      title: "Register Patient Account",
      subtitle: "Create your account to book appointments and access records",
      emailPlaceholder: "patient@example.com",
      accent: "from-blue-600 to-cyan-500",
      cta: "Create Patient Account",
    },
    [ROLES.DOCTOR]: {
      title: "Register Clinical Staff",
      subtitle: "Create your provider account to access clinic systems",
      emailPlaceholder: "dr.smith@smartclinic.ai",
      accent: "from-emerald-600 to-teal-500",
      cta: "Create Staff Account",
    },
    [ROLES.ADMIN]: {
      title: "Register Administrator",
      subtitle: "Create an administrator account for clinic management",
      emailPlaceholder: "admin@smartclinic.ai",
      accent: "from-purple-600 to-indigo-500",
      cta: "Create Admin Account",
    },
  };

  const currentMeta = roleMeta[selectedRole] || roleMeta[ROLES.PATIENT];

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
        <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 border border-white/10 mb-4 shadow-xl max-w-[320px] mx-auto">
          <button
            type="button"
            onClick={() => setSelectedRole(ROLES.PATIENT)}
            className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              selectedRole === ROLES.PATIENT
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="text-sm">👤</span>
            Patient
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole(ROLES.DOCTOR)}
            className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              selectedRole === ROLES.DOCTOR
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="text-sm">🩺</span>
            Doctor / Staff
          </button>
        </div>

        <div className="glass-card p-6 sm:p-8 rounded-3xl">
          <div className="mb-5 pb-4 border-b border-white/10">
            <h2 className="text-xl font-bold text-white tracking-tight">{currentMeta.title}</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{currentMeta.subtitle}</p>
          </div>
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
              {successMsg}
            </div>
          )}

          <form onSubmit={registerUser} className="space-y-4">
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
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Create Password
              </label>
              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="glass-input w-full rounded-xl px-4 py-3 text-sm"
              />
            </div>

            {/* GOOGLE reCAPTCHA - required; verified by the backend before signup. */}
            <ReCaptcha ref={recaptchaRef} onChange={setCaptchaPassed} />

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mt-2 disabled:opacity-50 text-white bg-gradient-to-r ${currentMeta.accent} shadow-lg shadow-blue-500/20 hover:brightness-110 transition-all`}
            >
              {loading ? "Creating Account..." : currentMeta.cta}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{" "}
            <Link href={`/login?role=${selectedRole}`} className="text-blue-400 hover:text-blue-300 font-semibold">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function Register() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading...</div>}>
      <RegisterContent />
    </Suspense>
  );
}