import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  // Sem isto o navegador pede /favicon.ico e leva 404 em toda carga —
  // ruido que atrapalha justamente quando se esta lendo o console atras de
  // outra coisa.
  icons: { icon: "/icon.svg" },
  title: "Video Studio — Virals",
  description: "Editor de vídeo viral on-brand (Fase B · EPIC-MKT-Video-Creative).",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // suppressHydrationWarning: extensões como o Tag Assistant injetam
  // atributos (ex.: data-tag-assistant-prod-present) na tag <html> antes do
  // React hidratar — não é mismatch de verdade, é ruído do browser do dev,
  // mas o React ainda loga e o overlay de dev conta como "issue".
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        {children}
        {/* Toasts do design system (VEX-07) — substituem alert()/status solto. */}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-line-strong)",
              color: "var(--color-fg)",
            },
          }}
        />
      </body>
    </html>
  );
}
