import { supabase } from "./supabase";

export const ROLES = {
  PATIENT: "patient",
  DOCTOR: "doctor",
  ADMIN: "admin",
};

export const ROLE_LABELS = {
  [ROLES.PATIENT]: "Patient",
  [ROLES.DOCTOR]: "Doctor / Physician",
  [ROLES.ADMIN]: "Clinic Administrator",
};

export const ROLE_BADGES = {
  [ROLES.PATIENT]: { label: "Patient", icon: "👤", color: "from-blue-500/20 to-cyan-500/20 border-cyan-500/30 text-cyan-300" },
  [ROLES.DOCTOR]: { label: "Doctor", icon: "🩺", color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-300" },
  [ROLES.ADMIN]: { label: "Admin", icon: "⚙️", color: "from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-300" },
};

const STORAGE_KEY = "smartclinic_active_role";

/**
 * Resolves the role for a given user.
 * 1. Checks localStorage for an explicit override/selection
 * 2. Checks user.user_metadata?.role
 * 3. Checks if user email matches admin or doctor heuristics
 * 4. Defaults to 'patient'
 */
export function getUserRole(user) {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && Object.values(ROLES).includes(saved)) {
      return saved;
    }
  }

  const metaRole = user?.user_metadata?.role;
  if (metaRole && Object.values(ROLES).includes(metaRole)) {
    return metaRole;
  }

  // Heuristics for existing demo accounts
  const email = (user?.email || "").toLowerCase();
  if (email.includes("admin") || email.includes("renzolamadrid14") || email.includes("godki21")) {
    return ROLES.ADMIN;
  }
  if (email.includes("doctor") || email.includes("dr.") || email.includes("kobileonor")) {
    return ROLES.DOCTOR;
  }

  return ROLES.PATIENT;
}

/**
 * Updates the user's role in local storage and optionally in Supabase user metadata.
 */
export async function setUserRole(role, user = null) {
  if (!Object.values(ROLES).includes(role)) return;

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, role);
  }

  if (user) {
    try {
      await supabase.auth.updateUser({
        data: { role },
      });
    } catch (err) {
      console.warn("Could not sync role to Supabase metadata:", err);
    }
  }
}
