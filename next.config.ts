import type { NextConfig } from "next";

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/chat",
        destination: "http://127.0.0.1:8000/incoming-user-prompt",
      },
    ];
  },
};

export default nextConfig;
