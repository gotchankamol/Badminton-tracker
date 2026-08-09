import type { NextConfig } from "next";

// Lets phones on the same Wi-Fi load the dev server via its LAN IP (e.g.
// http://192.168.1.103:3000) and actually have Server Actions work there —
// without this, Next.js rejects those requests as cross-origin in dev mode
// (buttons still show a tap response, but nothing gets saved).
const lanDevOrigins = ["192.168.1.103"];

const nextConfig: NextConfig = {
  allowedDevOrigins: lanDevOrigins,
  experimental: {
    serverActions: {
      allowedOrigins: lanDevOrigins,
    },
  },
};

export default nextConfig;
