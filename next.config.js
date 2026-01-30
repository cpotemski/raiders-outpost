/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/api/arc-items": ["./node_modules/arcraiders-data/items/**"],
    "/api/arc-items/image": ["./node_modules/arcraiders-data/images/items/**"],
    "/api/blueprints": ["./node_modules/arcraiders-data/items/**"],
    "/api/projects": ["./node_modules/arcraiders-data/projects.json"],
  },
};

module.exports = nextConfig;
