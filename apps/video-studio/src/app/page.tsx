"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ClientTile {
  slug: string;
  display: string;
  count: number;
}

// Paleta por cliente (alinhada ao brand-config.yaml).
const THEME: Record<string, { accent: string; tagline: string }> = {
  virals: { accent: "#FF3D68", tagline: "Marca institucional · navy + coral" },
  "tiago-elesbao": { accent: "#FFB800", tagline: "Perfil pessoal · preto + âmbar" },
};
const themeOf = (slug: string) => THEME[slug] ?? { accent: "#FF3D68", tagline: "Cliente · paleta padrão" };

export default function ClientPicker() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientTile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => {
        setClients(d.clients ?? []);
        setTotal(d.total ?? 0);
      })
      .catch(() => setError("Não foi possível carregar a lista de clientes."))
      .finally(() => setLoading(false));
  }, []);

  const open = (slug: string) => router.push(`/studio?client=${encodeURIComponent(slug)}`);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a12", color: "#fff" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "64px 32px" }}>
        <header style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 40, fontWeight: 900, textTransform: "uppercase", letterSpacing: -1, margin: 0 }}>
            🎬 Video Studio
          </h1>
          <p style={{ color: "rgba(255,255,255,.5)", fontSize: 16, marginTop: 10 }}>
            Selecione o cliente para editar seus criativos de vídeo.
          </p>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 12 }}>
            {total} criativo{total === 1 ? "" : "s"} · {clients.length} cliente{clients.length === 1 ? "" : "s"}
          </div>
        </header>

        {loading && <div style={{ color: "rgba(255,255,255,.4)", fontSize: 14 }}>Carregando clientes…</div>}
        {error && (
          <div style={{ color: "#FF3D68", fontSize: 14, border: "1px solid rgba(255,61,104,.3)", background: "rgba(255,61,104,.05)", borderRadius: 8, padding: 16 }}>
            {error}
          </div>
        )}

        {!loading && !error && clients.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            {clients.map((c) => {
              const theme = themeOf(c.slug);
              return (
                <button
                  key={c.slug}
                  onClick={() => open(c.slug)}
                  style={{
                    position: "relative", textAlign: "left", borderRadius: 16, minHeight: 200, cursor: "pointer",
                    border: "1px solid rgba(255,255,255,.1)", background: "#0c0c16", color: "#fff", overflow: "hidden",
                    padding: 28, display: "flex", flexDirection: "column", justifyContent: "space-between",
                  }}
                >
                  <div style={{ position: "absolute", top: -48, right: -48, width: 180, height: 180, borderRadius: "50%", background: theme.accent, opacity: 0.18, filter: "blur(40px)" }} />
                  <div style={{ position: "relative" }}>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 3, color: "rgba(255,255,255,.4)", fontWeight: 700, marginBottom: 6 }}>
                      {c.slug}
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, textTransform: "uppercase", lineHeight: 1.05 }}>{c.display}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginTop: 6 }}>{theme.tagline}</div>
                  </div>
                  <div style={{ position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 24 }}>
                    <div>
                      <div style={{ fontSize: 40, fontWeight: 900, color: theme.accent, lineHeight: 1 }}>{c.count}</div>
                      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,.4)", marginTop: 2 }}>
                        criativo{c.count === 1 ? "" : "s"}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, color: theme.accent }}>Abrir →</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!loading && !error && clients.length === 0 && (
          <div style={{ color: "rgba(255,255,255,.4)", fontSize: 14, border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: 24 }}>
            Nenhum cliente com criativos de vídeo. Rode o pipeline <code style={{ color: "rgba(255,255,255,.6)" }}>*industrialize-video</code> primeiro.
          </div>
        )}
      </div>
    </div>
  );
}
