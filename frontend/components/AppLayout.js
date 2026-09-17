"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

  useEffect(() => {
    async function loadUser() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        setUser(currentUser);
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

  const navItems = [
    {
      id: "dashboard",
      name: "Dashboard",
      href: "/dashboard",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      ),
    },
    {
      id: "appointments",
      name: "Book Appointment",
      href: "/appointments",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /><path d="M12 14v4" /><path d="M10 16h4" />
        </svg>
      ),
    },
    {
      id: "appointments-manage",
      name: "Appointments List",
      href: "/appointments/manage",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" />
        </svg>
      ),
    },
    {
      id: "patients",
      name: "Patient Records",
      href: "/patient-records",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: "reports",
      name: "Reports & Analytics",
      href: "/reports",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
        </svg>
      ),
    },
    {
      id: "ai",
      name: "SmartClinic AI",
      href: "/ai-assistant",
      badge: "AI",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
        </svg>
      ),
    },
    {
      id: "profile",
      name: "My Profile",
      href: "/profile",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" />
        </svg>
      ),
    },
  ];

  const currentActive =
    activeNav ||
    (pathname.startsWith("/patient-records")
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
    <div className="min-h-screen flex bg-[#090d16] text-slate-100 antialiased">
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0d1322]/95 border-r border-white/10 backdrop-blur-2xl flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-[1px] shadow-md shadow-blue-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[11px] flex items-center justify-center text-blue-400 font-bold text-lg">
                ✚
              </div>
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                SmartClinic <span className="text-cyan-400 text-[10px] px-1 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">AI</span>
              </div>
              <p className="text-[11px] text-slate-400">Clinical System</p>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navigation
          </div>
          {navItems.map((item) => {
            const isActive = currentActive === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-600/20 text-white border border-blue-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? "text-blue-400" : "text-slate-400"}>{item.icon}</span>
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500 text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-3 border-t border-white/10 bg-slate-950/40">
          <div className="flex items-center justify-between gap-2">
            <Link href="/profile" className="flex items-center gap-2.5 overflow-hidden flex-1 group">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover ring-1 ring-blue-500/30 flex-shrink-0" /> // eslint-disable-line @next/next/no-img-element
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                  {userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : "U"}
                </div>
              )}
              <div className="truncate text-left">
                <div className="text-xs font-semibold text-slate-200 truncate group-hover:text-blue-300">
                  {userProfile?.full_name || user?.email?.split("@")[0] || "Staff"}
                </div>
                <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
              </div>
            </Link>
            <button onClick={handleLogout} title="Log Out" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <header className="sticky top-0 z-30 bg-[#090d16]/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-white/10">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="truncate">
              {title && <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white truncate">{title}</h1>}
              {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2.5">{actions}</div>
        </header>

        <main className="flex-1 p-4 sm:p-7 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
