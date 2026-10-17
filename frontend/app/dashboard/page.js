"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppLayout from "@/components/AppLayout";
import PatientDashboard from "@/components/dashboard/PatientDashboard";
import DoctorDashboard from "@/components/dashboard/DoctorDashboard";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import { ROLES, ROLE_LABELS, getUserRole } from "@/lib/auth-role";

function DashboardContent() {
  const router = useRouter();
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

      // Authenticated role from trusted metadata / heuristics — cannot be overridden by URL or client storage
      const trustedRole = getUserRole(currentUser);
      setActiveRole(trustedRole);

      setLoading(false);
    }

    initUser();
  }, [router]);

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
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-xs text-muted-c font-medium tracking-wider uppercase">
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
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

