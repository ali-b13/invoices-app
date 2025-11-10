const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^\/$/, // Home page
      handler: 'NetworkFirst', // try network first, fallback to cache
      options: {
        cacheName: 'home-page-cache',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 48 * 60 * 60, // 2 day
        },
      },
    },
    {
      urlPattern: /^\/login/, // Login page
      handler: 'NetworkFirst',
      options: {
        cacheName: 'login-page-cache',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 48 * 60 * 60,
        },
      },
    },
    // You can also cache static assets
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|woff2|woff|ttf|eot)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'assets-cache',
        expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }, // 30 days
      },
    },
    {
      urlPattern: /\.(?:js|css)$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
        expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
  ],
});

module.exports = withPWA({
  reactStrictMode: true,
  turbopack: {}, // silence Turbopack warning
});
