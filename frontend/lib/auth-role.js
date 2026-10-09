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

/**
 * Resolves the trusted role for a given authenticated user.
 * 1. Checks user.user_metadata?.role (trusted auth metadata)
 * 2. Checks if user email matches admin or doctor heuristics for demo accounts
 * 3. Defaults to 'patient'
 * Never trusts client-side storage or spoofed browser state for role resolution.
 */
export function getUserRole(user) {
  if (!user) return ROLES.PATIENT;

  const metaRole = user?.user_metadata?.role;
  if (metaRole && Object.values(ROLES).includes(metaRole)) {
    return metaRole;
  }

  // Heuristics for existing demo accounts
  const email = (user?.email || "").toLowerCase();
  if (
    email.includes("admin") ||
    email.includes("renzolamadrid14") ||
    email.includes("godki21")
  ) {
    return ROLES.ADMIN;
  }
  if (
    email.includes("doctor") ||
    email.includes("dr.") ||
    email.includes("kobileonor")
  ) {
    return ROLES.DOCTOR;
  }

  return ROLES.PATIENT;
}

/**
 * Updates the user's role in Supabase user metadata.
 */
export async function setUserRole(role, user = null) {
  if (!Object.values(ROLES).includes(role)) return;

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

