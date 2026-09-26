"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppLayout from "@/components/AppLayout";
import PatientDashboard from "@/components/dashboard/PatientDashboard";
import DoctorDashboard from "@/components/dashboard/DoctorDashboard";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import { ROLES, ROLE_LABELS, getUserRole, setUserRole } from "@/lib/auth-role";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeRole, setActiveRole] = useState(ROLES.PATIENT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initUser() {
      setLoading(true);
      const {
        data: { user: currentUser },
        error,
      } = await supabase.auth.getUser();

      if (error || !currentUser) {
        router.push("/login");
        return;
      }

      setUser(currentUser);

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (prof) setProfile(prof);

      const roleParam = searchParams?.get("role");
      if (roleParam && Object.values(ROLES).includes(roleParam)) {
        setActiveRole(roleParam);
        setUserRole(roleParam, currentUser);
      } else {
        const detected = getUserRole(currentUser);
        setActiveRole(detected);
      }

      setLoading(false);
    }

    initUser();
  }, [router, searchParams]);

  async function handleRoleChange(newRole) {
    if (!Object.values(ROLES).includes(newRole)) return;
    setActiveRole(newRole);
    await setUserRole(newRole, user);
  }

  const roleMeta = {
    [ROLES.PATIENT]: {
      title: "Patient Health Dashboard",
      subtitle: "Upcoming consultations, active prescriptions & health records",
    },
    [ROLES.DOCTOR]: {
      title: "Physician Clinical Dashboard",
      subtitle: "Daily patient queue, EMR review & Clinical AI Co-Pilot",
    },
    [ROLES.ADMIN]: {
      title: "Clinic Administration Dashboard",
      subtitle: "Executive overview, doctor monitor & AI peak hours forecast",
    },
  };

  const currentMeta = roleMeta[activeRole] || roleMeta[ROLES.PATIENT];

  return (
    <AppLayout
      activeNav="dashboard"
      title={currentMeta.title}
      subtitle={currentMeta.subtitle}
      actions={
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-white/10 shadow-sm">
          <button
            type="button"
            onClick={() => handleRoleChange(ROLES.PATIENT)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              activeRole === ROLES.PATIENT
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
            title="Switch to Patient View"
          >
            <span>👤</span>
            <span className="hidden sm:inline">Patient</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange(ROLES.DOCTOR)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              activeRole === ROLES.DOCTOR
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/25"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
            title="Switch to Doctor View"
          >
            <span>🩺</span>
            <span className="hidden sm:inline">Doctor</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange(ROLES.ADMIN)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              activeRole === ROLES.ADMIN
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/25"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
            title="Switch to Admin View"
          >
            <span>⚙️</span>
            <span className="hidden sm:inline">Admin</span>
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium tracking-wider uppercase">
            Loading {ROLE_LABELS[activeRole] || "Portal"} Experience...
          </p>
        </div>
      ) : (
        <div className="animate-fadeIn">
          {activeRole === ROLES.PATIENT && (
            <PatientDashboard user={user} profile={profile} />
          )}
          {activeRole === ROLES.DOCTOR && (
            <DoctorDashboard user={user} profile={profile} />
          )}
          {activeRole === ROLES.ADMIN && (
            <AdminDashboard user={user} profile={profile} />
          )}
        </div>
      )}
    </AppLayout>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

