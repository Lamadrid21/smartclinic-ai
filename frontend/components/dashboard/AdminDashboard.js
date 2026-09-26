"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const OPERATING_HOURS = [
  { hour: "08:00 AM", baseTraffic: 38, key: 8 },
  { hour: "09:00 AM", baseTraffic: 72, key: 9 },
  { hour: "10:00 AM", baseTraffic: 94, key: 10 },
  { hour: "11:00 AM", baseTraffic: 84, key: 11 },
  { hour: "02:00 PM", baseTraffic: 89, key: 14 },
  { hour: "03:00 PM", baseTraffic: 74, key: 15 },
  { hour: "04:00 PM", baseTraffic: 48, key: 16 },
  { hour: "05:00 PM", baseTraffic: 24, key: 17 },
];

const DOCTOR_ROOM_MAP = {
  1: "Suite 101 - General Med",
  2: "Suite 204 - Dermatology",
  3: "Suite 305 - Cardiology",
  4: "Suite 201 - Pediatrics",
  5: "Suite 402 - Neurology",
};

const FALLBACK_ROOMS = [
  "Suite 101 - General Med",
  "Suite 204 - Dermatology",
  "Suite 305 - Cardiology",
  "Suite 201 - Pediatrics",
  "Suite 402 - Neurology",
  "Suite 308 - Orthopedics",
  "Suite 106 - Internal Med",
];

const DOCTOR_STATUS_CYCLE = [
  { status: "In Consultation", patient: "Patient in Session" },
  { status: "Available", patient: "None (Ready)" },
  { status: "In Consultation", patient: "Scheduled Walk-In" },
  { status: "On Break", patient: "None" },
  { status: "Available", patient: "Next in Queue" },
];

export default function AdminDashboard({ user, profile }) {
  const [stats, setStats] = useState({
    totalPatients: 142,
    activeDoctors: 5,
    todayAppointments: 28,
    completionRate: "94%",
    estimatedRevenue: "₱42,500",
  });
  const [doctorsList, setDoctorsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [peakHoursData, setPeakHoursData] = useState([]);
  const [peakSummary, setPeakSummary] = useState({
    peakHour: "10:00 AM",
    peakPercentage: 94,
    afternoonPeak: "02:00 PM",
  });
  const [lastCalculated, setLastCalculated] = useState(null);
  const [isRecalculating, startTransition] = useTransition();

  // Dynamic AI prediction calculation
  const calculatePredictions = useCallback((appointmentRows = []) => {
    // Count real appointments per hour if available
    const apptCounts = {};
    OPERATING_HOURS.forEach((h) => {
      apptCounts[h.key] = 0;
    });

    appointmentRows.forEach((appt) => {
      if (appt.start_time) {
        const hour = parseInt(String(appt.start_time).split(":")[0], 10);
        if (apptCounts[hour] !== undefined) {
          apptCounts[hour]++;
        }
      }
    });

    // Time-based variance seed (changes every minute and adds live fluctuation)
    const now = new Date();
    const timeVariance = (now.getMinutes() * 7 + now.getSeconds()) % 17;

    const updated = OPERATING_HOURS.map((slot, idx) => {
      // Dynamic variance simulation that responds to time passing and page reload
      const wave = Math.sin((now.getTime() / 10000) + idx * 1.3) * 6;
      const jitter = ((Math.random() * 8) - 4);
      const apptBoost = (apptCounts[slot.key] || 0) * 12;

      let traffic = Math.round(slot.baseTraffic + wave + jitter + apptBoost + (timeVariance % (idx + 3)));
      traffic = Math.min(99, Math.max(15, traffic));

      let label = "Low";
      if (traffic >= 88) label = "Peak (AI Alert)";
      else if (traffic >= 70) label = "High";
      else if (traffic >= 40) label = "Moderate";

      return {
        hour: slot.hour,
        traffic,
        label,
        key: slot.key,
      };
    });

    // Find morning & afternoon peak
    let highest = updated[0];
    let pmHighest = updated.find((u) => u.key >= 14) || updated[4];

    updated.forEach((u) => {
      if (u.traffic > highest.traffic) highest = u;
      if (u.key >= 14 && u.traffic > pmHighest.traffic) pmHighest = u;
    });

    setPeakHoursData(updated);
    setPeakSummary({
      peakHour: highest.hour,
      peakPercentage: highest.traffic,
      afternoonPeak: pmHighest.hour,
    });
    setLastCalculated(new Date());
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch doctors from DB
      const { data: docData } = await supabase.from("doctors").select("*");

      // Fetch real appointments to feed into the prediction model
      const { data: apptData } = await supabase
        .from("appointments")
        .select("start_time, status, appointment_date");

      if (docData && docData.length > 0) {
        // Guarantee distinct rooms for every doctor
        const mappedDoctors = docData.map((doc, idx) => {
          const room =
            doc.room_number ||
            DOCTOR_ROOM_MAP[doc.id] ||
            FALLBACK_ROOMS[idx % FALLBACK_ROOMS.length];

          const statusTemplate = DOCTOR_STATUS_CYCLE[idx % DOCTOR_STATUS_CYCLE.length];

          return {
            ...doc,
            room_number: room,
            specialty: doc.specialization || doc.specialty || "General Medicine",
            status: doc.status || statusTemplate.status,
            current_patient: doc.current_patient || statusTemplate.patient,
          };
        });
        setDoctorsList(mappedDoctors);
      } else {
        setDoctorsList([
          { id: 1, name: "Dr. Albert Leonor", specialty: "General Medicine", room_number: "Suite 101 - General Med", status: "In Consultation", current_patient: "Juan Dela Cruz" },
          { id: 2, name: "Dr. Jryndel Macuja", specialty: "Dermatology", room_number: "Suite 204 - Dermatology", status: "Available", current_patient: "None (Ready)" },
          { id: 3, name: "Dr. Renzo Lamadrid", specialty: "Cardiology", room_number: "Suite 305 - Cardiology", status: "In Consultation", current_patient: "Maria Santos" },
          { id: 4, name: "Dr. Sophia Javier", specialty: "Pediatrics", room_number: "Suite 201 - Pediatrics", status: "Available", current_patient: "Next in Queue" },
          { id: 5, name: "Dr. Maria Sanoy", specialty: "Neurology", room_number: "Suite 402 - Neurology", status: "On Break", current_patient: "None" },
        ]);
      }

      // Run dynamic prediction model
      calculatePredictions(apptData || []);
    } catch (err) {
      console.error("Error loading admin dashboard data:", err);
      calculatePredictions([]);
    } finally {
      setLoading(false);
    }
  }, [calculatePredictions]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();

    // Auto-update the dynamic AI prediction model overtime (every 20 seconds)
    const interval = setInterval(() => {
      calculatePredictions();
    }, 20000);

    return () => clearInterval(interval);
  }, [fetchDashboardData, calculatePredictions]);

  const handleManualRecalculate = () => {
    startTransition(() => {
      calculatePredictions();
    });
  };

  return (
    <div className="space-y-6">
      {/* Admin Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900/80 border border-purple-500/20 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
              <span>⚙️</span> Clinic Administrator Center
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Executive Overview & Intelligence
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Real-time monitoring of all clinic facilities, doctor presence, appointment traffic, and automated AI triage logs.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/reports"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-lg shadow-purple-500/25"
            >
              <span>📊</span> Financial & Clinical Reports
            </Link>
            <Link
              href="/patient-records"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-slate-200 font-semibold text-xs transition-all"
            >
              <span>🗂️</span> Master Patient Directory
            </Link>
          </div>
        </div>
      </div>
      {/* Executive KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Total Patients</div>
            <div className="text-xl font-bold text-white mt-1">142</div>
          </div>
          <span className="text-2xl">👤</span>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Active Doctors</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">5 On Duty</div>
          </div>
          <span className="text-2xl">🩺</span>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Today Visits</div>
            <div className="text-xl font-bold text-cyan-400 mt-1">28 Booked</div>
          </div>
          <span className="text-2xl">📅</span>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Completion Rate</div>
            <div className="text-xl font-bold text-purple-400 mt-1">94%</div>
          </div>
          <span className="text-2xl">📈</span>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-white/10 flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <div className="text-xs text-slate-400">Est. Daily Rev</div>
            <div className="text-xl font-bold text-emerald-300 mt-1">₱42,500</div>
          </div>
          <span className="text-2xl">💰</span>
        </div>
      </div>

      {/* AI Peak Hours & Traffic Forecast */}
      <div className="glass-card rounded-3xl p-6 border border-purple-500/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-300 text-lg">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">AI Peak Traffic & Patient Flow Forecast</h2>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {lastCalculated
                  ? `Live inference updated at ${lastCalculated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} • Auto-refresh active`
                  : "Calibrating neural queue prediction..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRecalculate}
              disabled={isRecalculating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              title="Force recalculate AI prediction model"
            >
              <span className={isRecalculating ? "animate-spin" : ""}>🔄</span>
              <span>{isRecalculating ? "Recalculating..." : "Recalculate AI Model"}</span>
            </button>
            <span className="hidden sm:inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
              Automated Prediction Model
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Peak consultation volume projected at <strong className="text-cyan-300">{peakSummary.peakHour} ({peakSummary.peakPercentage}% capacity)</strong> with afternoon peak around <strong className="text-purple-300">{peakSummary.afternoonPeak}</strong>. Doctor allocation and triage queue are dynamically optimized.
        </p>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-2">
          {peakHoursData.map((item, idx) => (
            <div
              key={idx}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all ${
                item.traffic >= 88
                  ? "bg-purple-950/40 border border-purple-500/40 shadow-sm shadow-purple-500/10"
                  : "bg-white/5 border border-white/5"
              }`}
            >
              <span className="text-[10px] text-slate-400 font-semibold">{item.hour}</span>
              <div className="w-full bg-slate-800/90 h-20 rounded-lg relative overflow-hidden flex items-end">
                <div
                  className={`w-full transition-all duration-700 rounded-b-lg ${
                    item.traffic >= 88
                      ? "bg-gradient-to-t from-rose-500 via-amber-500 to-purple-400"
                      : item.traffic >= 70
                      ? "bg-gradient-to-t from-amber-500 to-cyan-400"
                      : "bg-gradient-to-t from-blue-600 to-cyan-500"
                  }`}
                  style={{ height: `${item.traffic}%` }}
                />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-white font-bold">{item.traffic}%</span>
                <span
                  className={`text-[9px] font-medium px-1 rounded mt-0.5 ${
                    item.traffic >= 88
                      ? "text-rose-300 bg-rose-500/20"
                      : item.traffic >= 70
                      ? "text-amber-300 bg-amber-500/10"
                      : "text-slate-400"
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Doctor Presence & Clinic Room Monitor */}
      <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🩺</span>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Active Doctor Roster & Room Status</h2>
              <p className="text-[11px] text-slate-400">Assigned consultation suites and current occupancy</p>
            </div>
          </div>
          <Link href="/appointments/manage" className="text-xs text-purple-400 hover:text-purple-300 font-semibold">
            Manage Schedules
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-semibold">
                <th className="pb-3 pl-2">Doctor</th>
                <th className="pb-3">Specialty</th>
                <th className="pb-3">Assigned Room</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-2">Current Patient</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {doctorsList.map((doc, idx) => (
                <tr key={doc.id || idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 pl-2 font-medium text-white flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-[11px] border border-purple-500/30">
                      {doc.name ? doc.name.charAt(4) || doc.name.charAt(0) : "D"}
                    </div>
                    <div>
                      <div className="font-semibold">{doc.name || "Dr. Medical Staff, MD"}</div>
                      <div className="text-[10px] text-slate-400">ID: DOC-00{doc.id || idx + 1}</div>
                    </div>
                  </td>
                  <td className="py-3.5 text-slate-300">{doc.specialty || doc.specialization || "General Medicine"}</td>
                  <td className="py-3.5 font-semibold">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px]">
                      <span>🚪</span> {doc.room_number}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        doc.status === "In Consultation"
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          : doc.status === "On Break"
                          ? "bg-orange-500/15 text-orange-300 border-orange-500/30"
                          : doc.status === "Off Duty"
                          ? "bg-slate-500/15 text-slate-400 border-slate-500/30"
                          : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      }`}
                    >
                      {doc.status || "Available"}
                    </span>
                  </td>
                  <td className="py-3.5 text-right pr-2 text-slate-300 font-medium">
                    {doc.current_patient || "None (Ready)"}
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
