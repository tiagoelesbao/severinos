/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Domínio público onde o site é servido, sem barra no final.
   * Ex.: VITE_SITE_URL="https://oraclumtech-cofre.vercel.app"
   * Se não for definido, cai no padrão de `src/lib/seo.ts`.
   */
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
