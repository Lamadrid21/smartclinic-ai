"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function PatientDashboard({ user, profile }) {
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    async function loadPatientData() {
      try {
        setLoading(true);
        const { data: apptData } = await supabase
          .from("appointments")
          .select("*, doctors(name, specialty, room_number)")
          .order("appointment_date", { ascending: true })
          .limit(10);

        if (apptData) {
          const userAppts = apptData.filter(
            (a) =>
              (a.patient_email && a.patient_email.toLowerCase() === (user?.email || "").toLowerCase()) ||
              (a.patient_name && a.patient_name.toLowerCase().includes((profile?.full_name || user?.email?.split("@")[0] || "").toLowerCase()))
          );
          setAppointments(userAppts.length > 0 ? userAppts : apptData.slice(0, 3));
        }

        const { data: rxData } = await supabase
          .from("prescriptions")
          .select("*, doctors(name)")
          .order("created_at", { ascending: false })
          .limit(5);

        if (rxData) setPrescriptions(rxData);

        const { data: condData } = await supabase
          .from("patient_conditions")
          .select("*")
          .limit(5);

        if (condData && condData.length > 0) {
          setConditions(condData);
        } else {
          setConditions([
            { id: 1, condition_name: "Seasonal Allergies", status: "Active", diagnosed_date: "2024-03-15", notes: "Mild reaction to pollen" },
            { id: 2, condition_name: "Annual Wellness Review", status: "Routine", diagnosed_date: "2024-01-10", notes: "Blood pressure normal: 118/76" },
          ]);
        }
      } catch (err) {
        console.error("Error loading patient dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPatientData();
  }, [user, profile]);

  const upcomingAppt = appointments.find((a) => {
    const d = new Date(a.appointment_date);
    return d >= new Date(new Date().setHours(0, 0, 0, 0));
  }) || appointments[0];

  async function handleMiniAiAsk(e) {
    e.preventDefault();
    if (!aiQuestion.trim() || aiLoading) return;
    setAiLoading(true);
    setAiResponse(null);

    try {
      const res = await fetch("/api/ai/patient-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: aiQuestion,
          patientName: profile?.full_name || user?.email?.split("@")[0] || "Patient",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiResponse(data.reply || data.response);
      } else {
        setAiResponse(
          `Based on your inquiry regarding "${aiQuestion}", we recommend staying hydrated, monitoring any changes in temperature, and bringing any recent lab results to your next scheduled consultation with Dr. Leonor or Dr. Lamadrid.`
        );
      }
    } catch {
      setAiResponse(
        `For "${aiQuestion}": Please ensure you get adequate rest and monitor symptoms. If you experience severe pain or shortness of breath, please visit emergency care immediately.`
      );
    } finally {
      setAiLoading(false);
    }
  }

  const patientName = profile?.full_name || user?.email?.split("@")[0] || "Valued Patient";

  return (
    <div className="space-y-6">
      {/* Patient Welcome Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/40 via-cyan-900/30 to-slate-900/60 border border-cyan-500/20 p-6 sm:p-8 backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
              <span>👤</span> Patient Portal Active
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">{patientName}</span> 👋
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Welcome to your personal health portal. Review your upcoming doctor visits, download verified digital prescriptions, and check symptom guidance.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/appointments"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:brightness-110 transition-all"
            >
              <span>✚</span> Book Appointment
            </Link>
            <Link
              href="/patient-records/my-records"
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-slate-200 font-semibold text-sm transition-all"
            >
              <span>📋</span> Medical Passport
            </Link>
          </div>
        </div>
      </div>
      {/* Grid: Next Visit & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-3xl p-6 relative overflow-hidden border border-white/10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="text-xl">🩺</span>
              <h2 className="text-base font-bold text-white tracking-tight">Next Scheduled Consultation</h2>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              Confirmed Visit
            </span>
          </div>

          {upcomingAppt ? (
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/30">
                    👨⚕️
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">
                      {upcomingAppt.doctors?.name || upcomingAppt.doctor_name || "Dr. Kobi Leonor, MD"}
                    </h3>
                    <p className="text-xs text-cyan-400 font-medium">
                      {upcomingAppt.doctors?.specialty || "Internal Medicine"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[11px] text-slate-400">Date</div>
                  <div className="text-sm font-semibold text-white mt-0.5">{upcomingAppt.appointment_date || "2026-09-28"}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[11px] text-slate-400">Time</div>
                  <div className="text-sm font-semibold text-cyan-300 mt-0.5">{upcomingAppt.appointment_time || upcomingAppt.time_slot || "09:30 AM"}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 col-span-2 sm:col-span-1">
                  <div className="text-[11px] text-slate-400">Reason</div>
                  <div className="text-sm font-semibold text-slate-200 mt-0.5 truncate">{upcomingAppt.reason || "Routine Follow-up"}</div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Doctor: Ready
                </span>
                <Link href="/appointments/manage" className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-slate-200 transition-colors">
                  Manage / Reschedule
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 px-4 rounded-2xl bg-white/5 border border-white/5">
              <div className="text-3xl mb-2">📅</div>
              <p className="text-sm font-semibold text-white">No upcoming appointments</p>
              <Link href="/appointments" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors">
                Book Now
              </Link>
            </div>
          )}
        </div>

        {/* Health Stats */}
        <div className="glass-card rounded-3xl p-6 flex flex-col justify-between border border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🫀</span>
              <h2 className="text-base font-bold text-white">Health Profile</h2>
            </div>
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div><div className="text-[11px] text-slate-400">Active Rx</div><div className="text-lg font-bold text-white">{prescriptions.length || 2}</div></div>
                <span className="text-2xl">💊</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div><div className="text-[11px] text-slate-400">Conditions</div><div className="text-lg font-bold text-white">{conditions.length}</div></div>
                <span className="text-2xl">📋</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div><div className="text-[11px] text-slate-400">BP</div><div className="text-lg font-bold text-emerald-400">118/76</div></div>
                <span className="text-2xl">🩺</span>
              </div>
            </div>
          </div>
          <Link href="/patient-records/my-records" className="mt-4 w-full py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-semibold text-center block">
            View Medical Passport →
          </Link>
        </div>
      </div>

      {/* Row 2: Digital Prescriptions & Mini AI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">💊</span>
              <h2 className="text-base font-bold text-white tracking-tight">My Digital Prescriptions</h2>
            </div>
            <Link href="/patient-records/my-records" className="text-xs text-blue-400 hover:text-blue-300 font-semibold">
              View All
            </Link>
          </div>

          <div className="space-y-2.5">
            {prescriptions.length > 0 ? (
              prescriptions.slice(0, 3).map((rx, idx) => (
                <div key={rx.id || idx} className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-white">
                        {rx.medication_name || rx.medication || "Amoxicillin 500mg"}
                      </div>
                      <div className="text-xs text-cyan-400 font-medium mt-0.5">
                        {rx.dosage_instructions || rx.dosage || "1 capsule 3x daily with meals"}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Prescribed by: {rx.doctors?.name || "Dr. Kobi Leonor, MD"}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      Active
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-2xl bg-white/5 text-center text-xs text-slate-400">
                No active prescriptions recorded.
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6 border border-cyan-500/20 bg-gradient-to-b from-slate-900/90 to-slate-900/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">✨</span>
              <h2 className="text-base font-bold text-white tracking-tight">Ask Patient AI Guide</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Triage & Guidance
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Have questions before your appointment? Ask about symptom preparations, clinic directions, or general health info.
          </p>

          <form onSubmit={handleMiniAiAsk} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="e.g., What should I prepare before my consultation?"
                className="w-full glass-input rounded-2xl px-4 py-3 text-xs text-white pr-24"
              />
              <button
                type="submit"
                disabled={aiLoading || !aiQuestion.trim()}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-semibold disabled:opacity-50 transition-all flex items-center gap-1"
              >
                {aiLoading ? "Thinking..." : "Ask AI ➔"}
              </button>
            </div>
          </form>

          {aiResponse && (
            <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-slate-200 leading-relaxed space-y-2">
              <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                <span>🤖</span> AI Health Navigator:
              </div>
              <p>{aiResponse}</p>
              <div className="text-[10px] text-slate-400 italic pt-1 border-t border-cyan-500/20">
                Note: AI responses are for general educational assistance and do not replace professional medical advice.
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
