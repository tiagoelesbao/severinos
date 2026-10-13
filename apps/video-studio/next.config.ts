import type { NextConfig } from "next";

// UI Next (placeholder nesta story; editor completo é a MVC-10). O Remotion
// roda DESACOPLADO via `npm run studio` / `npm run render` (decisão do dono:
// Remotion standalone + UI Next separada). O Next não bundla o Remotion.
const nextConfig: NextConfig = {
  // O motor Remotion vive em src/remotion e é compilado pelo seu próprio
  // bundler — fora do build do Next.
  outputFileTracingExcludes: {
    "*": ["./src/remotion/**"],
  },
};

export default nextConfig;
