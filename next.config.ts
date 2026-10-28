import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Serverless Chromium must stay outside the server bundle. It ships a
  // compressed binary that is extracted at runtime, so the binary assets also
  // have to be traced into the /api/render function explicitly.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/render": [
      "./node_modules/@sparticuz/chromium/bin/**",
      "./node_modules/puppeteer-core/**",
    ],
  },
};

export default nextConfig;
