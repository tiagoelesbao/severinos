'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ClientTile {
  slug: string;
  display: string;
  count: number;
}

// Mapeia o slug do cliente para sua paleta visual (alinhada com brand-config.yaml).
const CLIENT_THEME: Record<string, { accent: string; bg1: string; bg2: string; tagline: string }> = {
  virals: {
    accent: '#FF3D68',
    bg1: 'rgba(255,61,104,0.10)',
    bg2: 'rgba(123,91,255,0.06)',
    tagline: 'Marca institucional · navy + coral',
  },
  'tiago-elesbao': {
    accent: '#FFB800',
    bg1: 'rgba(255,184,0,0.10)',
    bg2: 'rgba(255,77,46,0.06)',
    tagline: 'Perfil pessoal · preto + âmbar',
  },
};

function getTheme(slug: string) {
  return CLIENT_THEME[slug] || {
    accent: '#FF3D68',
    bg1: 'rgba(255,255,255,0.04)',
    bg2: 'rgba(255,255,255,0.02)',
    tagline: 'Cliente · paleta padrão',
  };
}

export default function ClientPickerPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientTile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/briefs')
      .then((r) => r.json())
      .then((d) => {
        setClients(d.clients ?? []);
        setTotal(d.total ?? 0);
      })
      .catch(() => setError('Não foi possível carregar a lista de clientes.'))
      .finally(() => setLoading(false));
  }, []);

  const goToEditor = (slug: string) => {
    router.push(`/editor?client=${encodeURIComponent(slug)}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <div className="max-w-6xl mx-auto px-8 py-16">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-4xl font-black uppercase tracking-tight">
            Editor de Criativos
          </h1>
          <p className="text-white/50 mt-3 text-base">
            Selecione o cliente para visualizar e editar seus criativos.
          </p>
          <div className="flex items-center gap-2 mt-4 text-xs text-white/40">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#FF3D68]" />
            <span>{total} criativo{total === 1 ? '' : 's'} no total · {clients.length} cliente{clients.length === 1 ? '' : 's'} ativo{clients.length === 1 ? '' : 's'}</span>
          </div>
        </header>

        {/* Estados */}
        {loading && (
          <div className="text-white/40 text-sm">Carregando clientes…</div>
        )}
        {error && (
          <div className="text-[#FF3D68] text-sm border border-[#FF3D68]/30 bg-[#FF3D68]/5 rounded-lg p-4">
            {error}
          </div>
        )}

        {/* Grade de tiles */}
        {!loading && !error && clients.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {clients.map((c) => {
              const theme = getTheme(c.slug);
              return (
                <button
                  key={c.slug}
                  onClick={() => goToEditor(c.slug)}
                  className="group relative text-left rounded-2xl border border-white/10 hover:border-white/30 transition overflow-hidden focus:outline-none focus:ring-2 focus:ring-white/30"
                  style={{
                    background: `linear-gradient(135deg, ${theme.bg1} 0%, ${theme.bg2} 100%)`,
                    minHeight: 220,
                  }}
                >
                  {/* Halo de cor da marca */}
                  <div
                    className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity"
                    style={{ backgroundColor: theme.accent }}
                  />

                  {/* Conteúdo */}
                  <div className="relative z-10 p-8 flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: theme.accent }}
                        />
                        <span className="text-[11px] uppercase tracking-[0.3em] text-white/40 font-bold">
                          {c.slug}
                        </span>
                      </div>
                      <h2 className="text-3xl font-black uppercase leading-tight">
                        {c.display}
                      </h2>
                      <p className="text-xs text-white/50 mt-2">{theme.tagline}</p>
                    </div>

                    <div className="flex items-end justify-between mt-8">
                      <div>
                        <div
                          className="text-5xl font-black"
                          style={{ color: theme.accent }}
                        >
                          {c.count}
                        </div>
                        <div className="text-[11px] uppercase tracking-wider text-white/40 mt-1">
                          criativo{c.count === 1 ? '' : 's'} disponíve{c.count === 1 ? 'l' : 'is'}
                        </div>
                      </div>
                      <div
                        className="text-xs uppercase tracking-widest font-bold opacity-60 group-hover:opacity-100 transition flex items-center gap-2"
                        style={{ color: theme.accent }}
                      >
                        Abrir editor
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M13 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!loading && !error && clients.length === 0 && (
          <div className="text-white/40 text-sm border border-white/10 rounded-lg p-6">
            Nenhum cliente com criativos. Rode o pipeline <code className="text-white/60">*design-creative</code> primeiro.
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-xs text-white/30">
          Pipeline: <code className="text-white/50">*design-creative</code> · Registry: <code className="text-white/50">data/clients/_registry.yaml</code>
        </footer>
      </div>
    </div>
  );
}
