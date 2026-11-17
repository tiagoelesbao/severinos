import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Posto pelo `next upgrade --agent=security` em 2026-11-17 (16.4.3 → 16.4.6).
   * Marca que esta app adota atualizações de segurança por agente. */
  experimental: {
    agentUpgrade: "security",
  },
  /* Entire app is an authenticated, per-user admin panel — nothing
   * benefits from static prerendering, so Cache Components' opt-in
   * dynamic boundaries just add noise here. */
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
