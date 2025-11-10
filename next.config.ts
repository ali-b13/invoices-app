// next.config.ts
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  reactStrictMode: true,
  turbopack: {}, // silence Turbopack warning
  // your other Next.js config here
};

module.exports = withPWA(nextConfig);
