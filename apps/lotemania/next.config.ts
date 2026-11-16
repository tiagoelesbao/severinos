import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
