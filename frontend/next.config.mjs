/** @type {import('next').NextConfig} */

// URL of the separate SmartClinic backend (Express) server.
const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

const nextConfig = {
  /* config options here */
  reactCompiler: true,
  // Turbopack sees two lockfiles (root + frontend); pin its workspace root
  // to the frontend directory so it doesn't warn or misresolve.
  turbopack: {
    root: import.meta.dirname,
  },
  // Proxy all /api/* requests to the dedicated backend server.
  // The frontend keeps calling /api/... while the actual logic runs in
  // backend/ where secret keys (Groq/OpenAI, Resend, service role) stay.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
