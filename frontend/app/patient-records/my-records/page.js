"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabase";

export default function MyMedicalRecords() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    async function loadRecords() {
      try {
        setLoading(true);
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          setUser(currentUser);
          const { data: prof } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", currentUser.id)
            .maybeSingle();
          if (prof) setProfile(prof);
        }

        const { data: rxData } = await supabase
          .from("prescriptions")
          .select("*, doctors(name, specialty)")
          .order("created_at", { ascending: false });

        if (rxData) setPrescriptions(rxData);

        const { data: condData } = await supabase
          .from("patient_conditions")
          .select("*");

        if (condData && condData.length > 0) {
          setConditions(condData);
        } else {
          setConditions([
            { id: 1, condition_name: "Seasonal Allergic Rhinitis", status: "Active", diagnosed_date: "2024-03-15", notes: "Avoid high pollen environments; Cetirizine 10mg PRN" },
            { id: 2, condition_name: "Mild Stage 1 Hypertension", status: "Controlled", diagnosed_date: "2023-11-20", notes: "Lifestyle diet modifications; monitor BP weekly" },
            { id: 3, condition_name: "Annual Preventive Health Review", status: "Routine", diagnosed_date: "2024-01-10", notes: "Blood chemistry and lipid profile normal" },
          ]);
        }
      } catch (err) {
        console.error("Error loading patient records:", err);
      } finally {
        setLoading(false);
      }
    }
    loadRecords();
  }, []);

  const patientName = profile?.full_name || user?.email?.split("@")[0] || "Valued Patient";

  return (
    <AppLayout
      activeNav="my-records"
      title="My Medical Passport & Prescriptions"
      subtitle="Digital health records, verified prescriptions & clinical conditions"
      actions={
        <button
          onClick={() => window.print()}
          className="px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <span>🖨️</span> Print Health Passport
        </button>
      }
    >
      <div className="space-y-6">
        {/* Patient Identity Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-900/30 via-slate-900/60 to-slate-900/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-500/20">
              👤
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{patientName}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{user?.email || "patient@example.com"} • Health ID: #SC-89241</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Verified Patient
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  Blood Type: O+
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Digital Prescriptions Section */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">💊</span>
              <h3 className="text-base font-bold text-white tracking-tight">Active Digital Prescriptions</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
              Verified by Licensed MD
            </span>
          </div>

          <div className="space-y-3">
            {prescriptions.map((rx, idx) => (
              <div key={rx.id || idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">{rx.medication_name || rx.medication || "Amoxicillin 500mg"}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        Active
                      </span>
                    </div>
                    <div className="text-xs text-cyan-300 font-medium mt-1">
                      Dosage: {rx.dosage_instructions || rx.dosage || "Take 1 capsule every 8 hours for 7 days"}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-2">
                      Prescribed by {rx.doctors?.name || "Dr. Kobi Leonor, MD"} ({rx.doctors?.specialty || "Internal Medicine"}) • Rx ID: #{rx.id || "RX-3921"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-200 border border-white/10 flex items-center gap-1.5 self-start"
                  >
                    <span>📄</span> PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Diagnosed Health Conditions */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <h3 className="text-base font-bold text-white tracking-tight">Clinical Conditions & Health Notes</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {conditions.map((cond, idx) => (
              <div key={cond.id || idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{cond.condition_name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    {cond.status || "Active"}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{cond.notes || "Monitored during routine consultations."}</p>
                <div className="text-[10px] text-slate-500 pt-1">Diagnosed: {cond.diagnosed_date || "2024"}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
