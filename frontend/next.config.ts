import type { NextConfig } from "next";

// Keep the rewrite target in sync with lib/api.ts (NEXT_PUBLIC_API_URL),
// so media/image paths (/api/v1/public/media/...) reach the same backend
// as direct API calls instead of a hardcoded localhost port.
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
