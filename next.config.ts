import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tree-shake Three.js and only import what's used
  transpilePackages: ["three"],
  // Reduce bundle size by externalizing large server-only packages
  serverExternalPackages: [],
  // Production-only: remove all console.* calls
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["error", "warn"] }
      : false,
  },
};

export default nextConfig;
