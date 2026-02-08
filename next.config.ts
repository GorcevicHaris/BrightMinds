import type { NextConfig } from "next";
import { internalIpV4 } from "internal-ip";

const getNextConfig = (): Promise<NextConfig> => {
  return internalIpV4().then(ip => {
    console.log("🌐 Detected local IP:", ip); // <-- loguje IP
    return {
      env: {
        NEXT_PUBLIC_APP_URL: `http://${ip}:3000`,
      },
    };
  });
};

export default getNextConfig();
