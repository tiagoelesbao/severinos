import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

/**
 * Tokens do design system (VEX-07) — documentação viva.
 * O accent é DINÂMICO por cliente: o switcher abaixo reproduz o que o Studio
 * faz em runtime (seta --accent no root a partir do brand-config do cliente).
 */

const CLIENTS = [
  { slug: "virals", label: "Virals", accent: "#FF3D68" },
  { slug: "tiago-elesbao", label: "Tiago Elesbão", accent: "#FFB800" },
];

const SURFACES = [
  ["surface-0", "palco / fundo do app"],
  ["surface-1", "painéis / timeline"],
  ["surface-2", "cards / seções"],
  ["surface-3", "elementos elevados"],
  ["surface-4", "botões / inputs"],
] as const;

const SEMANTIC = [
  ["accent", "marca do CLIENTE (dinâmica)"],
  ["ok", "sucesso / positivo"],
  ["warn", "atenção"],
  ["danger", "erro / destrutivo"],
] as const;

function Swatch({ name, note }: { name: string; note: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="size-10 rounded-md border border-line-strong shrink-0"
        style={{ background: `var(--color-${name})` }}
      />
      <div>
        <div className="text-[12px] font-bold text-fg">--color-{name}</div>
        <div className="text-[11px] text-fg-muted">{note}</div>
      </div>
    </div>
  );
}

function TokensPage() {
  const [client, setClient] = useState(CLIENTS[0]);
  return (
    <div style={{ ["--accent" as string]: client.accent }} className="bg-surface-1 min-h-screen p-6 space-y-8">
      <header className="space-y-2">
        <h1 className="text-lg font-bold text-fg m-0">Video Studio — Design Tokens</h1>
        <p className="text-[12px] text-fg-muted m-0 max-w-[520px]">
          O editor "veste" a marca do cliente ativo: <code>--accent</code> é sobrescrito em runtime
          a partir do <code>brand-config.yaml</code>. Troque o cliente abaixo e observe accent,
          foco, ranges e badges mudarem juntos.
        </p>
        <div className="flex gap-2 pt-1">
          {CLIENTS.map((c) => (
            <button
              key={c.slug}
              onClick={() => setClient(c)}
              className={`px-3 py-1.5 rounded-(--radius-control) text-[12px] font-bold cursor-pointer border ${
                client.slug === c.slug
                  ? "bg-accent text-black border-transparent"
                  : "bg-surface-4 text-fg border-line-strong"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-fg-muted m-0">Superfícies</h2>
        <div className="grid grid-cols-2 gap-3 max-w-[640px]">
          {SURFACES.map(([n, note]) => <Swatch key={n} name={n} note={note} />)}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-fg-muted m-0">Semânticas</h2>
        <div className="grid grid-cols-2 gap-3 max-w-[640px]">
          {SEMANTIC.map(([n, note]) => <Swatch key={n} name={n} note={note} />)}
        </div>
      </section>

      <section className="space-y-3 max-w-[420px]">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-fg-muted m-0">Controles nativos</h2>
        <input type="range" defaultValue={60} className="w-full" />
        <label className="flex items-center gap-2 text-[12px] text-fg-muted">
          <input type="checkbox" defaultChecked /> checkbox com accent do cliente
        </label>
      </section>

      <section className="space-y-2 max-w-[520px]">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-fg-muted m-0">Tipografia de UI</h2>
        <p className="text-[13px] text-fg m-0">Corpo 13px — leitura confortável em sessões longas.</p>
        <p className="text-[11px] text-fg-muted m-0">Labels 11px — metadados e legendas de controle.</p>
        <p className="text-[10px] text-fg-faint m-0">Faint 10px — dicas e rodapés (mínimo permitido).</p>
      </section>
    </div>
  );
}

const meta: Meta<typeof TokensPage> = {
  title: "Design System/Tokens",
  component: TokensPage,
  parameters: { layout: "fullscreen" },
};
export default meta;

export const Tokens: StoryObj<typeof TokensPage> = {};
