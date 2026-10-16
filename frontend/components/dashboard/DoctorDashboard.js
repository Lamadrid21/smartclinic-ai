"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function DoctorDashboard({ user, profile }) {
  const [presenceStatus, setPresenceStatus] = useState("available");
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("queue");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [notifications, setNotifications] = useState([]);

  const doctorName = profile?.full_name || (user?.email?.includes("kobileonor") ? "Dr. Kobi Leonor, MD" : "Dr. Clinical Physician, MD");

  useEffect(() => {
    async function loadDoctorData() {
      try {
        setLoading(true);
        const { data: apptData } = await supabase
          .from("appointments")
          .select("*, doctors(name, specialty, room_number)")
          .order("appointment_date", { ascending: true })
          .limit(50);

        if (apptData && apptData.length > 0) {
          setQueue(apptData);
          setNotifications(apptData.map((a, idx) => ({
            id: `notif-${a.id || idx}`,
            title: a.status === "Pending" ? "New Appointment Request" : `Appointment ${a.status}`,
            description: `Patient ${a.patient_name || "Patient"} scheduled for ${a.appointment_date} at ${a.start_time || "09:00 AM"}.`,
            time: "Today",
            read: idx > 2,
            type: a.status?.toLowerCase() || "pending",
          })));
        } else {
          setQueue([
            { id: "q-101", patient_name: "Maria Santos", appointment_time: "09:00 AM", appointment_date: new Date().toISOString().split("T")[0], reason: "Hypertension review", status: "Pending" },
            { id: "q-102", patient_name: "Juan Dela Cruz", appointment_time: "09:30 AM", appointment_date: new Date().toISOString().split("T")[0], reason: "Post-op evaluation", status: "Confirmed" },
          ]);
          setNotifications([
            { id: "n-1", title: "New Appointment Request", description: "Maria Santos requested a consultation.", time: "08:30 AM", read: false, type: "pending" },
            { id: "n-2", title: "Appointment Confirmed", description: "Juan Dela Cruz confirmed.", time: "08:00 AM", read: false, type: "confirmed" },
          ]);
        }
      } catch (err) {
        console.error("Error loading doctor data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDoctorData();
  }, [user, profile]);

  const unreadCount = notifications.filter(n => !n.read).length;
  function markAllRead() { setNotifications(notifications.map(n => ({ ...n, read: true }))); }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function prevMonth() { setCurrentDate(new Date(year, month - 1, 1)); }
  function nextMonth() { setCurrentDate(new Date(year, month + 1, 1)); }


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
              Clinical operations center. Monitor patient queue, appointment calendar, notifications, and clinical AI co-pilot.
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-white/10">
          <button
            onClick={() => setActiveTab("queue")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "queue"
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
            }`}
          >
            <span>📋</span> Patient Queue ({queue.length})
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "calendar"
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
            }`}
          >
            <span>📅</span> Doctor Calendar
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 relative ${
              activeTab === "notifications"
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
            }`}
          >
            <span>🔔</span> Notifications
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </button>
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

      {/* TAB 2: DOCTOR CALENDAR VIEW */}
      {activeTab === "calendar" && (
        <div className="glass-card rounded-3xl p-6 space-y-6 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Doctor Appointment Calendar</h2>
              <p className="text-xs text-slate-400 mt-0.5">View your scheduled consultations by month and date.</p>
            </div>
            <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-2 rounded-2xl border border-white/10">
              <button onClick={prevMonth} className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 text-xs font-bold">‹ Prev</button>
              <span className="text-sm font-bold text-emerald-300 min-w-[140px] text-center">{monthNames[month]} {year}</span>
              <button onClick={nextMonth} className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 text-xs font-bold">Next ›</button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-xs font-bold text-slate-400 py-2">{day}</div>
            ))}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`blank-${i}`} className="h-24 rounded-2xl bg-white/[0.01] border border-white/5 opacity-30" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const dayAppointments = queue.filter((a) => a.appointment_date === dateStr);
              const isToday = new Date().toISOString().split("T")[0] === dateStr;

              return (
                <div key={`day-${dayNum}`} className={`h-28 rounded-2xl p-2 flex flex-col justify-between text-left transition-all border ${isToday ? "bg-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-500/10" : "bg-white/[0.02] border-white/10 hover:border-white/20"}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isToday ? "text-emerald-300" : "text-slate-300"}`}>{dayNum}</span>
                    {dayAppointments.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-extrabold text-[9px]">{dayAppointments.length}</span>
                    )}
                  </div>
                  <div className="space-y-1 overflow-y-auto max-h-[64px]">
                    {dayAppointments.map((appt, aIdx) => (
                      <div key={aIdx} className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-200 truncate font-medium">
                        {appt.start_time ? String(appt.start_time).substring(0, 5) : "09:00"} {appt.patient_name || "Patient"}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: DOCTOR NOTIFICATIONS */}
      {activeTab === "notifications" && (
        <div className="glass-card rounded-3xl p-6 space-y-5 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Doctor Notifications & Alerts</h2>
              <p className="text-xs text-slate-400 mt-0.5">Real-time appointment requests, confirmations, cancellations, and rescheduling.</p>
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors">
                Mark All as Read ({unreadCount})
              </button>
            )}
          </div>

          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 rounded-2xl bg-white/[0.02]">No notifications found.</div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${notif.read ? "bg-white/[0.02] border-white/5 opacity-75" : "bg-emerald-950/20 border-emerald-500/30 shadow-md shadow-emerald-500/10"}`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{notif.type === "pending" ? "📋" : notif.type === "confirmed" ? "✅" : "🔄"}</span>
                      <h3 className="text-xs font-bold text-white">{notif.title}</h3>
                      {!notif.read && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{notif.description}</p>
                    <div className="text-[10px] text-slate-400 font-medium">{notif.time}</div>
                  </div>
                  {!notif.read && (
                    <button onClick={() => { setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n)); }} className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-semibold border border-white/10 flex-shrink-0">
                      Mark Read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
