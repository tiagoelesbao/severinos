import type { Metadata } from "next";
import { Montserrat, Public_Sans, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// DUAS FAMILIAS, uma por aplicacao — medido em 2026-11-17 na Sorteamos:
// o painel usa Public Sans (heranca do Minimal UI) e a loja usa Montserrat
// por cima. Ver docs/research/2026-11-17-paridade-visual-loja.md.
//
// Public Sans e o padrao global (`--font-sans`); a loja troca para Montserrat
// no seu proprio layout, aplicando `--font-sans` de novo no escopo dela.
//
// A variavel se chama `--font-sans` de proposito: o globals.css mapeia
// `--font-sans: var(--font-sans)`, e ate 2026-11-17 NADA definia essa
// variavel. Ela resolvia para vazio e o navegador caia no serif padrao —
// e era por isso que o titulo do sorteio saia serifado.
const painelSans = Public_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const lojaSans = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lotemania",
  description: "Plataforma white-label de sorteios online",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${painelSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
