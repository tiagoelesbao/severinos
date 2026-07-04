import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Video Studio — Virals",
  description: "Editor de vídeo viral on-brand (Fase B · EPIC-MKT-Video-Creative).",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
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
