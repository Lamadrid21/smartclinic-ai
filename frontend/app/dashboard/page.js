"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import AppLayout from "@/components/AppLayout";

export default function Dashboard() {
  const router = useRouter();

  const [patients, setPatients] = useState(0);
  const [doctors, setDoctors] = useState(0);
  const [appointments, setAppointments] = useState(0);
  const [aiConsultations, setAiConsultations] = useState(0);
  const [appointmentStats, setAppointmentStats] = useState({
    pending: 0, confirmed: 0, completed: 0, cancelled: 0, expired: 0,
  });
  const [revenueStats, setRevenueStats] = useState({
    totalRevenue: 0, todayRevenue: 0, completedRevenue: 0,
  });
  const [peakHour, setPeakHour] = useState("");
  const [peakAppointments, setPeakAppointments] = useState(0);
  const [peakPredictions, setPeakPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Feature #4: Doctor presence + available slots + patient conditions
  const [doctorPresence, setDoctorPresence] = useState([]);
  const [availableSlots, setAvailableSlots] = useState(0);
  const [regularPatients, setRegularPatients] = useState(0);
  const [latestCondition, setLatestCondition] = useState(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    loadDashboardData();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadDashboardData();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) { router.push("/login"); return; }

    const { data: patData } = await supabase.from("patients").select("id").eq("is_archived", false);
    setPatients(patData?.length || 0);

    const { data: apptData } = await supabase.from("appointments").select("id, patient_id, status, appointment_date, consultation_fee");
    const all = (apptData || []).map(a => ({ ...a, status: a.status?.toLowerCase() || "" }));
    const active = all.filter(a => a.status !== "cancelled");
    setAppointments(active.length);

    setAppointmentStats({
      pending: all.filter(a => a.status === "pending").length,
      confirmed: all.filter(a => a.status === "confirmed").length,
      completed: all.filter(a => a.status === "completed").length,
      cancelled: all.filter(a => a.status === "cancelled").length,
      expired: all.filter(a => a.status === "expired").length,
    });

    const completed = all.filter(a => a.status === "completed");
    const total = completed.reduce((s, a) => s + Number(a.consultation_fee || 0), 0);
    const today = new Date().toISOString().split("T")[0];
    const todayRev = completed.filter(a => a.appointment_date === today).reduce((s, a) => s + Number(a.consultation_fee || 0), 0);
    setRevenueStats({ totalRevenue: total, todayRevenue: todayRev, completedRevenue: total });

    const { data: docData } = await supabase.from("doctors").select("id");
    setDoctors(docData?.length || 0);
    const { data: aiData } = await supabase.from("ai_usage_logs").select("id");
    setAiConsultations(aiData?.length || 0);

    // ---- Feature #4: Doctor presence status ----------------
    const { data: presenceData } = await supabase
      .from("doctor_presence")
      .select("doctor_id, status, last_updated");
    const presenceMap = {};
    (presenceData || []).forEach((p) => {
      presenceMap[p.doctor_id] = p.status;
    });

    const { data: docFull } = await supabase
      .from("doctors")
      .select("id, name, specialization")
      .order("name");
    setDoctorPresence(
      (docFull || []).map((d) => ({
        id: d.id,
        name: d.name,
        specialization: d.specialization || "General Practice",
        status: presenceMap[d.id] || "offline",
      }))
    );

    // ---- Feature #4: Available slots for today ------------
    try {
      const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
      const todayStr = new Date().toISOString().split("T")[0];
      const todayName = dayNames[new Date().getDay()];

      const { data: schedData } = await supabase
        .from("doctor_schedules")
        .select("doctor_id, start_time, end_time")
        .eq("day_of_week", todayName);

      const { data: bookedToday } = await supabase
        .from("appointments")
        .select("doctor_id, start_time")
        .eq("appointment_date", todayStr)
        .neq("status", "Cancelled");

      let totalSlots = 0;
      const bookedKeys = new Set(
        (bookedToday || []).map(
          (a) => `${a.doctor_id}-${a.start_time}`
        )
      );

      (schedData || []).forEach((schedule) => {
        const [sh, sm] = (schedule.start_time || "08:00:00").split(":").map(Number);
        const [eh, em] = (schedule.end_time || "17:00:00").split(":").map(Number);
        let start = sh * 60 + sm;
        const end = eh * 60 + em;
        while (start + 30 <= end) {
          const hour = String(Math.floor(start / 60)).padStart(2, "0");
          const minute = String(start % 60).padStart(2, "0");
          const slotTime = `${hour}:${minute}:00`;
          if (!bookedKeys.has(`${schedule.doctor_id}-${slotTime}`)) {
            totalSlots += 1;
          }
          start += 30;
        }
      });

      setAvailableSlots(totalSlots);
    } catch (slotError) {
      console.error("Available slots error:", slotError);
    }

    // ---- Feature #4: Regular patients + latest condition ----
    const { data: regData } = await supabase
      .from("appointments")
      .select("patient_id, patient_full_name");
    if (regData) {
      const visits = {};
      regData.forEach((a) => {
        visits[a.patient_id] = (visits[a.patient_id] || 0) + 1;
      });
      setRegularPatients(
        Object.values(visits).filter((count) => count >= 3).length
      );
    }

    const { data: condData } = await supabase
      .from("patient_conditions")
      .select("patient_id, condition_name, status, diagnosed_date, severity")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLatestCondition(condData || null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch("/api/peak-hours", { headers: { Authorization: `Bearer ${session?.access_token || ""}` } });
      let data = null;
      try {
        data = await resp.json();
      } catch {
        data = null;
      }
      if (resp.ok && data.success) {
        setPeakHour(data.peakHour || "");
        setPeakAppointments(data.predictions?.find(p => p.hour === data.peakHour)?.predictedAppointments || 0);
        setPeakPredictions((data.predictions || []).filter(p => ["08:00","09:00","10:00","11:00"].includes(p.hour)));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const fmtPHP = (n) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n || 0);
  const revTotal = revenueStats.totalRevenue;
  const revToday = revenueStats.todayRevenue;

  return (
    <AppLayout title="Dashboard" subtitle="Clinic overview and analytics">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
          <p className="text-slate-400 text-sm">Loading dashboard metrics...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* PRIMARY STAT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card-interactive p-5 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              </div>
              <p className="text-xs text-slate-400 font-medium">Active Patients</p>
              <p className="text-3xl font-bold text-white mt-1">{patients}</p>
            </div>

            <div className="glass-card-interactive p-5 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              </div>
              <p className="text-xs text-slate-400 font-medium">Appointments</p>
              <p className="text-3xl font-bold text-white mt-1">{appointments}</p>
            </div>

            <div className="glass-card-interactive p-5 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 00-16 0"/></svg>
              </div>
              <p className="text-xs text-slate-400 font-medium">Doctors</p>
              <p className="text-3xl font-bold text-white mt-1">{doctors}</p>
            </div>

            <div className="glass-card-interactive p-5 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m12 3-1.9 5.8a2 2 0 01-1.3 1.3L3 12l5.8 1.9a2 2 0 011.3 1.3L12 21l1.9-5.8a2 2 0 011.3-1.3L21 12l-5.8-1.9a2 2 0 01-1.3-1.3Z"/></svg>
              </div>
              <p className="text-xs text-slate-400 font-medium">AI Consultations</p>
              <p className="text-3xl font-bold text-white mt-1">{aiConsultations}</p>
            </div>
          </div>
{/* FEATURE #4: CLINIC SNAPSHOT (doctor presence / slots / patients) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* DOCTOR PRESENCE */}
            <div className="glass-card p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Doctor Presence</h2>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 bg-white/5 border border-white/10 rounded-full px-3 py-1">Live</span>
              </div>
              {doctorPresence.length === 0 ? (
                <p className="text-slate-400 text-sm">No doctors with presence data.</p>
              ) : (
                <div className="space-y-3">
                  {doctorPresence.map((doc) => {
                    const styles = {
                      available: { dot: "bg-emerald-400", text: "text-emerald-400", label: "Available" },
                      busy: { dot: "bg-amber-400", text: "text-amber-400", label: "Busy" },
                      consulting: { dot: "bg-blue-400", text: "text-blue-400", label: "Consulting" },
                      offline: { dot: "bg-slate-500", text: "text-slate-400", label: "Offline" },
                    }[doc.status] || { dot: "bg-slate-500", text: "text-slate-400", label: "Offline" };

                    return (
                      <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-200 truncate">{doc.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{doc.specialization}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
                          <span className={`text-xs font-semibold ${styles.text}`}>{styles.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* TODAY'S AVAILABLE SLOTS */}
            <div className="glass-card p-6 rounded-2xl">
              <h2 className="text-lg font-bold text-white mb-5">Today&apos;s Open Slots</h2>
              <div className="p-5 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-center justify-between">
                <div>
                  <p className="text-4xl font-bold text-blue-400">{availableSlots}</p>
                  <p className="text-xs text-slate-400 mt-1">30-minute slots available</p>
                </div>
                <Link href="/appointments" className="text-xs font-semibold text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-400/60 rounded-lg px-3 py-2 transition-colors">
                  View Booking →
                </Link>
              </div>
              <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                Computed from today&apos;s doctor schedules minus confirmed bookings.
              </p>
            </div>

            {/* PATIENT INSIGHTS */}
            <div className="glass-card p-6 rounded-2xl">
              <h2 className="text-lg font-bold text-white mb-5">Patient Insights</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <span className="text-sm text-slate-300">⭐ Regular patients (3+ visits)</span>
                  <span className="text-xl font-bold text-amber-400">{regularPatients}</span>
                </div>
                {latestCondition ? (
                  <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                    <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Latest condition</p>
                    <p className="text-sm font-semibold text-rose-300">{latestCondition.condition_name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      status: {latestCondition.status}
                      {latestCondition.diagnosed_date ? ` · diagnosed ${latestCondition.diagnosed_date}` : ""}
                    </p>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No patient conditions recorded yet.</p>
                )}
              </div>
            </div>
          </div>

{/* APPOINTMENT STATUS + REVENUE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card p-6 rounded-2xl lg:col-span-2">
              <h2 className="text-lg font-bold text-white mb-5">Appointment Status</h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: "Pending", count: appointmentStats.pending, cls: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
                  { label: "Confirmed", count: appointmentStats.confirmed, cls: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
                  { label: "Completed", count: appointmentStats.completed, cls: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
                  { label: "Cancelled", count: appointmentStats.cancelled, cls: "bg-rose-500/10 border-rose-500/20 text-rose-400" },
                  { label: "Expired", count: appointmentStats.expired, cls: "bg-slate-500/10 border-slate-500/20 text-slate-400" },
                ].map((item) => (
                  <div key={item.label} className={`p-3 rounded-xl border text-center ${item.cls}`}>
                    <p className="text-2xl font-bold">{item.count}</p>
                    <p className="text-[11px] font-medium mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl">
              <h2 className="text-lg font-bold text-white mb-5">Revenue</h2>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-xs text-slate-400 font-medium">Total Revenue</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">{fmtPHP(revenueStats.totalRevenue)}</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                  <p className="text-xs text-slate-400 font-medium">Today&apos;s Revenue</p>
                  <p className="text-2xl font-bold text-blue-400 mt-1">{fmtPHP(revenueStats.todayRevenue)}</p>
                </div>
                <Link
                  href="/reports"
                  className="block w-full text-center py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all"
                >
                  View Full Reports
                </Link>
              </div>
            </div>
          </div>

          {/* AI PEAK HOURS */}
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">AI Peak Hour Prediction</h2>
              {peakHour && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <span className="text-xs font-semibold text-purple-300">Peak: {peakHour}</span>
                </div>
              )}
            </div>
            {peakPredictions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                  <h3 className="font-bold text-blue-400 mb-4 text-sm">Historical Appointments</h3>
                  <div className="space-y-3">
                    {peakPredictions.map((item) => (
                      <div key={item.hour} className="flex justify-between items-center">
                        <span className="text-sm text-slate-300">{item.hour}</span>
                        <span className="font-bold text-blue-400">{item.historicalAppointments}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                  <h3 className="font-bold text-purple-400 mb-4 text-sm">AI Predicted</h3>
                  <div className="space-y-3">
                    {peakPredictions.map((item) => (
                      <div key={item.hour} className="flex justify-between items-center">
                        <span className="text-sm text-slate-300">{item.hour}</span>
                        <span className="font-bold text-purple-400">{item.predictedAppointments}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">No appointment prediction data available.</p>
            )}
          </div>

          {/* (Quick actions removed — accessible via sidebar) */}
        </div>
      )}
    </AppLayout>
  );
}
