import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for Docker deployment
  output: "standalone",
  // Dev only: allow opening the dev server via the machine's LAN IP (Next 16
  // otherwise blocks its own script chunks as cross-origin, leaving pages
  // rendered but with no working JS).
  allowedDevOrigins: ["172.28.32.1"],
};

export default nextConfig;
