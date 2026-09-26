"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function DoctorDashboard({ user, profile }) {
  const [presenceStatus, setPresenceStatus] = useState("available");
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const doctorName = profile?.full_name || (user?.email?.includes("kobileonor") ? "Dr. Kobi Leonor, MD" : "Dr. Clinical Physician, MD");

  useEffect(() => {
    async function loadDoctorQueue() {
      try {
        setLoading(true);
        const { data: apptData } = await supabase
          .from("appointments")
          .select("*, doctors(name, specialty, room_number)")
          .order("appointment_date", { ascending: true })
          .limit(15);

        if (apptData && apptData.length > 0) {
          setQueue(apptData);
        } else {
          setQueue([
            { id: "q-101", patient_name: "Maria Santos", appointment_time: "09:00 AM", appointment_date: "Today", reason: "Hypertension review", status: "waiting" },
            { id: "q-102", patient_name: "Juan Dela Cruz", appointment_time: "09:30 AM", appointment_date: "Today", reason: "Post-op wound evaluation", status: "in_consultation" },
            { id: "q-103", patient_name: "Elena Rodriguez", appointment_time: "10:15 AM", appointment_date: "Today", reason: "Fever & persistent cough", status: "waiting" },
            { id: "q-104", patient_name: "Carlos Reyes", appointment_time: "11:00 AM", appointment_date: "Today", reason: "Diabetes Mellitus routine check", status: "completed" },
          ]);
        }
      } catch (err) {
        console.error("Error loading doctor queue:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDoctorQueue();
  }, [user, profile]);

  const statusConfig = {
    available: { label: "Available", color: "bg-emerald-500", text: "text-emerald-400" },
    in_consultation: { label: "In Consultation", color: "bg-amber-500", text: "text-amber-400" },
    away: { label: "On Break", color: "bg-orange-500", text: "text-orange-400" },
    off_duty: { label: "Off Duty", color: "bg-slate-500", text: "text-slate-400" },
  };

  return (
    <div className="space-y-6">
      {/* Doctor Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900/80 border border-emerald-500/20 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <span>🩺</span> Doctor Portal Active
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{doctorName}</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Clinical operations center. Monitor your patient queue, trigger SOAP notes, and review electronic medical records.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2 min-w-[240px]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">My Clinic Presence:</span>
              <span className={`inline-flex items-center gap-1.5 font-bold ${statusConfig[presenceStatus].text}`}>
                <span className={`w-2 h-2 rounded-full ${statusConfig[presenceStatus].color} animate-pulse`} />
                {statusConfig[presenceStatus].label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button type="button" onClick={() => setPresenceStatus("available")} className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${presenceStatus === "available" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>Available</button>
              <button type="button" onClick={() => setPresenceStatus("in_consultation")} className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${presenceStatus === "in_consultation" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>In Consult</button>
              <button type="button" onClick={() => setPresenceStatus("away")} className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${presenceStatus === "away" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>On Break</button>
              <button type="button" onClick={() => setPresenceStatus("off_duty")} className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${presenceStatus === "off_duty" ? "bg-slate-600 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>Off Duty</button>
            </div>
          </div>
        </div>
      </div>
      {/* Doctor KPI Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Today&apos;s Patients</div>
            <div className="text-xl font-bold text-white mt-1">{queue.length}</div>
          </div>
          <span className="text-2xl">👥</span>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Waiting in Queue</div>
            <div className="text-xl font-bold text-amber-400 mt-1">
              {queue.filter((q) => q.status === "waiting" || q.status === "pending").length || 2}
            </div>
          </div>
          <span className="text-2xl">⏳</span>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Completed Today</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {queue.filter((q) => q.status === "completed").length || 1}
            </div>
          </div>
          <span className="text-2xl">✅</span>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Avg Consult Time</div>
            <div className="text-xl font-bold text-cyan-400 mt-1">14 mins</div>
          </div>
          <span className="text-2xl">⚡</span>
        </div>
      </div>

      {/* Patient Queue Management Card */}
      <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <h2 className="text-base font-bold text-white tracking-tight">Today&apos;s Patient Consultation Queue</h2>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter queue by patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input rounded-xl px-3 py-1.5 text-xs text-white max-w-[200px]"
            />
            <Link
              href="/ai-assistant"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold hover:brightness-110 transition-all flex items-center gap-1.5"
            >
              <span>🤖</span> AI Co-Pilot
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-semibold">
                <th className="pb-3 pl-2">Patient</th>
                <th className="pb-3">Slot Time</th>
                <th className="pb-3">Chief Complaint</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {queue
                .filter(
                  (item) =>
                    !searchTerm ||
                    (item.patient_name && item.patient_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (item.reason && item.reason.toLowerCase().includes(searchTerm.toLowerCase()))
                )
                .map((patient, idx) => (
                  <tr key={patient.id || idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 pl-2 font-medium text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[11px]">
                        {patient.patient_name ? patient.patient_name.charAt(0) : "P"}
                      </div>
                      <span>{patient.patient_name || "Maria Santos"}</span>
                    </td>
                    <td className="py-3.5 text-cyan-300 font-semibold">
                      {patient.appointment_time || patient.time_slot || "09:30 AM"}
                    </td>
                    <td className="py-3.5 text-slate-300 max-w-[260px] truncate">
                      {patient.reason || "General checkup"}
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          patient.status === "in_consultation"
                            ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                            : patient.status === "completed"
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                        }`}
                      >
                        {patient.status === "in_consultation"
                          ? "In Consult"
                          : patient.status === "completed"
                          ? "Completed"
                          : "Waiting"}
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/ai-assistant?patient=${encodeURIComponent(patient.patient_name || "")}`}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition-colors"
                        >
                          SOAP AI
                        </Link>
                        <Link
                          href="/patient-records"
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-[11px] font-semibold transition-colors"
                        >
                          EMR
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
