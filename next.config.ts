import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Any hosting: "npm run build && npm start" on a Node server (VPS, PaaS) or a managed Next.js host as is.
  // NEXT_OUTPUT=standalone builds a self-contained server (.next/standalone/server.js) for Docker / small servers.
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" as const } : {}),
  // Next.js 16 defaults: Partial Prerendering via Cache Components.
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Required allowlist in Next.js 16.
    qualities: [75],
    formats: ["image/avif", "image/webp"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
