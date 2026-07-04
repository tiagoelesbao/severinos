import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Video Studio — Virals",
  description: "Editor de vídeo viral on-brand (Fase B · EPIC-MKT-Video-Creative).",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: "#0a0a12", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
