/** @type {import('next').NextConfig} */

const nextConfig = {
  /* config options here */
  reactCompiler: true,
  // Turbopack sees two lockfiles (root + frontend); pin its workspace root
  // to the frontend directory so it doesn't warn or misresolve.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
