import type { NextConfig } from "next";
import { internalIpV4 } from "internal-ip";

const getNextConfig = async (): Promise<NextConfig> => {
  const ip = await internalIpV4();
  return {
    env: {
      NEXT_PUBLIC_APP_URL: `http://${ip}:3000`,
    },
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
};

export default getNextConfig();
