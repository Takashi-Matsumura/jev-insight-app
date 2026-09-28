import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker（docker-compose.yml）で server.js だけを動かすため
  output: "standalone",
};

export default nextConfig;
