import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col justify-between">
      {/* Background Ambient Glows */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[850px] rounded-full bg-blue-600/15 blur-[140px]" />
        <div className="absolute top-1/2 -right-40 h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-[130px]" />
        <div className="absolute -bottom-20 -left-20 h-[450px] w-[450px] rounded-full bg-indigo-600/15 blur-[140px]" />
      </div>

      {/* Navigation Bar */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-[1px] shadow-lg shadow-blue-500/20">
            <div className="w-full h-full bg-slate-900 rounded-[11px] flex items-center justify-center text-blue-400 font-bold text-lg">
              ✚
            </div>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            SmartClinic <span className="text-cyan-400">AI</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-blue-600/20"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-6 py-12 sm:py-20 text-center flex-1 flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-8 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          Intelligent Clinical Platform v2.4
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.15]">
          Smarter Care. Faster Decisions.{" "}
          <span className="text-gradient-cyan">Powered by AI.</span>
        </h1>

        <p className="mt-6 text-base sm:text-xl text-slate-400 max-w-2xl leading-relaxed">
          The all-in-one healthcare management suite featuring predictive scheduling, automated EMR records, digital prescription generation, and AI-assisted clinical workflow.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/login"
            className="btn-primary px-8 py-3.5 rounded-xl text-base font-semibold text-white shadow-xl shadow-blue-600/25 flex items-center justify-center gap-2"
          >
            <span>Access Clinic Dashboard</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/register"
            className="btn-secondary px-8 py-3.5 rounded-xl text-base font-medium flex items-center justify-center"
          >
            Create Staff Account
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full text-left">
          <div className="glass-card-interactive p-5 rounded-2xl">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
              ⚡
            </div>
            <h3 className="font-semibold text-white text-sm">Peak Hours AI</h3>
            <p className="text-xs text-slate-400 mt-1">Predict patient traffic and optimize clinic staffing automatically.</p>
          </div>

          <div className="glass-card-interactive p-5 rounded-2xl">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
              📋
            </div>
            <h3 className="font-semibold text-white text-sm">EMR & History</h3>
            <p className="text-xs text-slate-400 mt-1">Structured medical records and file vault at doctor fingertips.</p>
          </div>

          <div className="glass-card-interactive p-5 rounded-2xl">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
              💊
            </div>
            <h3 className="font-semibold text-white text-sm">Digital Rx & PDF</h3>
            <p className="text-xs text-slate-400 mt-1">Instant digital prescription generation with official PDF export.</p>
          </div>

          <div className="glass-card-interactive p-5 rounded-2xl">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
              🤖
            </div>
            <h3 className="font-semibold text-white text-sm">AI Assistant</h3>
            <p className="text-xs text-slate-400 mt-1">24/7 clinical AI agent answering patient & operational queries.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-500">
        <p>© 2026 SmartClinic AI. Advanced Medical Management System. All rights reserved.</p>
      </footer>
    </main>
  );
}
