"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ROLES, ROLE_BADGES, getUserRole } from "@/lib/auth-role";

const svgProps = {
  className: "w-5 h-5",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.8",
};

const ICONS = {
  dashboard: (
    <svg {...svgProps}>
      <rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  ),
  book: (
    <svg {...svgProps}>
      <rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /><path d="M12 14v4" /><path d="M10 16h4" />
    </svg>
  ),
  list: (
    <svg {...svgProps}>
      <path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" />
    </svg>
  ),
  people: (
    <svg {...svgProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  sparkle: (
    <svg {...svgProps}>
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  ),
  chart: (
    <svg {...svgProps}>
      <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
    </svg>
  ),
};

export default function AppLayout({
  children,
  activeNav,
  title,
  subtitle,
  actions,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRoleState] = useState(ROLES.PATIENT);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Dark is the default. Only an explicit "light" choice turns light mode on.
  useEffect(() => {
    const saved = localStorage.getItem("smartclinic_theme");
    const dark = saved !== "light";
    setIsDarkMode(dark);
    document.documentElement.classList.remove("light");
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  function toggleTheme() {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("smartclinic_theme", next ? "dark" : "light");
  }

  useEffect(() => {
    async function loadUser() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        setUser(currentUser);
        setUserRoleState(getUserRole(currentUser));
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", currentUser.id)
          .maybeSingle();
        if (profile) setUserProfile(profile);
      }
    }
    loadUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function getNavItems() {
    if (userRole === ROLES.PATIENT) {
      return [
        { id: "dashboard", name: "Patient Dashboard", href: "/dashboard", icon: ICONS.dashboard },
        { id: "appointments", name: "Book Consultation", href: "/appointments", icon: ICONS.book },
        { id: "appointments-manage", name: "My Appointments", href: "/appointments/manage", icon: ICONS.list },
        { id: "my-records", name: "My Medical Passport", href: "/patient-records/my-records", icon: ICONS.people },
        { id: "ai", name: "Patient AI Guide", href: "/ai-assistant", badge: "Triage", icon: ICONS.sparkle },
      ];
    }

    if (userRole === ROLES.DOCTOR) {
      return [
        { id: "dashboard", name: "Clinical Dashboard", href: "/dashboard", icon: ICONS.dashboard },
        { id: "appointments-manage", name: "Patient Queue", href: "/appointments/manage", icon: ICONS.list },
        { id: "patients", name: "Patient Records (EMR)", href: "/patient-records", icon: ICONS.people },
        { id: "ai", name: "Clinical AI Co-Pilot", href: "/ai-assistant", badge: "SOAP AI", icon: ICONS.sparkle },
        { id: "reports", name: "Clinical Reports", href: "/reports", icon: ICONS.chart },
      ];
    }

    return [
      { id: "dashboard", name: "Admin Dashboard", href: "/dashboard", icon: ICONS.dashboard },
      { id: "appointments-manage", name: "Clinic Appointments", href: "/appointments/manage", icon: ICONS.list },
      { id: "patients", name: "Patient Directory", href: "/patient-records", icon: ICONS.people },
      { id: "reports", name: "Financials & Analytics", href: "/reports", icon: ICONS.chart },
      { id: "ai", name: "AI Logs & Usage", href: "/ai-assistant", badge: "Admin", icon: ICONS.sparkle },
    ];
  }

  const navItems = getNavItems();
  const currentBadge = ROLE_BADGES[userRole] || ROLE_BADGES[ROLES.PATIENT];

  const currentActive =
    activeNav ||
    (pathname.startsWith("/patient-records/my-records")
      ? "my-records"
      : pathname.startsWith("/patient-records")
      ? "patients"
      : pathname === "/appointments"
      ? "appointments"
      : pathname.startsWith("/appointments/manage")
      ? "appointments-manage"
      : pathname.startsWith("/reports")
      ? "reports"
      : pathname.startsWith("/ai-assistant")
      ? "ai"
      : pathname.startsWith("/profile")
      ? "profile"
      : "dashboard");

  return (
    <div className="min-h-screen flex text-body antialiased">
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`app-sidebar fixed top-0 bottom-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-[1px] shadow-md shadow-blue-500/20">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[11px] flex items-center justify-center text-blue-500 font-bold text-lg">
                ✚
              </div>
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-heading flex items-center gap-1.5">
                SmartClinic{" "}
                <span className="text-cyan-600 dark:text-cyan-400 text-[10px] px-1 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-muted-c">Clinical System</p>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-muted-c hover:text-heading"
          >
            ✕
          </button>
        </div>

        {/* Active Portal Badge */}
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-300">
            <span className="flex items-center gap-1.5 truncate">
              <span>{currentBadge.icon}</span>
              <span className="truncate">{currentBadge.label} Portal</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-white/10 dark:text-white font-bold uppercase tracking-wider flex-shrink-0">
              Active
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-c">
            Navigation
          </div>
          {navItems.map((item) => {
            const isActive = currentActive === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "nav-item-active"
                    : "rounded-xl text-body hover:text-heading hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isActive ? "bg-white/25 text-white" : "bg-blue-600 text-white"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20">
          <div className="flex items-center justify-between gap-2">
            <Link href="/profile" className="flex items-center gap-2.5 overflow-hidden flex-1 group">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover ring-1 ring-blue-500/30 flex-shrink-0" /> // eslint-disable-line @next/next/no-img-element
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                  {userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : "U"}
                </div>
              )}
              <div className="truncate text-left">
                <div className="text-xs font-semibold text-heading truncate group-hover:text-blue-600 dark:group-hover:text-blue-300">
                  {userProfile?.full_name || user?.email?.split("@")[0] || "Staff"}
                </div>
                <div className="text-[10px] text-muted-c truncate">{user?.email}</div>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              title="Log Out"
              className="p-1.5 rounded-lg text-muted-c hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#090d16]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-muted-c hover:text-heading hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="truncate">
              {title && <h1 className="text-lg sm:text-xl font-bold tracking-tight text-heading truncate">{title}</h1>}
              {subtitle && <p className="text-xs text-muted-c truncate">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {/* Shows the CURRENT mode, like the login page; the tooltip says what a click does */}
            <button
              onClick={toggleTheme}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold btn-secondary flex items-center gap-1.5"
            >
              <span>{isDarkMode ? "🌙" : "☀️"}</span>
              <span className="hidden sm:inline">{isDarkMode ? "Dark" : "Light"}</span>
            </button>
            {actions}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-7 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}