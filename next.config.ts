import withPWA from "next-pwa";
import type { NextConfig } from "next";

// 1. Define your PWA configuration options
const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // NOTE: Do not put your Next.js config here.
  // This object is ONLY for next-pwa specific options.
});

// 2. Define your main Next.js configuration
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // This is correct for silencing the Turbopack warning
  turbopack: {},
};

// 3. Export the result of wrapping your nextConfig with the pwaConfig function
export default pwaConfig(nextConfig);
