/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    outputFileTracingIncludes: {
      "/api/arc-items": ["./lib/arc-items/data/items.json"],
      "/api/arc-items/image": ["./lib/arc-items/images/**"],
      "/api/blueprints": ["./lib/arc-items/data/items.json"],
    },
  },
};

module.exports = nextConfig;
