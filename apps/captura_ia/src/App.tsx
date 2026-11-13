import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TopAnnouncementBar } from './components/TopAnnouncementBar';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { PeekVaultSection } from './components/PeekVaultSection';
import { BookCallModal } from './components/BookCallModal';
import { FloatingWidget } from './components/FloatingWidget';
import { Footer } from './components/Footer';
import { ResourceArticleView } from './components/ResourceArticleView';
import { Resource, UserLead } from './types';
import { RESOURCES_DATA } from './data/resources';
import { parseHash, navigate, replaceRoute, ROUTES } from './lib/router';
import { metaForRoute } from './lib/seo';
import { useDocumentMeta } from './hooks/useDocumentMeta';
import { registerLead } from './lib/api';

const LEAD_STORAGE_KEY = 'oraclum_lead';
/** Chave da marca anterior (NoeAI) — lida uma vez para não deslogar quem já tinha acesso. */
const LEGACY_LEAD_STORAGE_KEY = 'noeai_lead';

/** Lê o lead salvo de forma síncrona para que deep links não pisquem na guarda de acesso. */
function readStoredLead(): UserLead | null {
  try {
    const saved = localStorage.getItem(LEAD_STORAGE_KEY);
    if (saved) return JSON.parse(saved) as UserLead;

    const legacy = localStorage.getItem(LEGACY_LEAD_STORAGE_KEY);
    if (!legacy) return null;

    // Migra para a chave nova e descarta a antiga.
    localStorage.setItem(LEAD_STORAGE_KEY, legacy);
    localStorage.removeItem(LEGACY_LEAD_STORAGE_KEY);
    return JSON.parse(legacy) as UserLead;
  } catch (e) {
    console.warn('LocalStorage indisponível:', e);
    return null;
  }
}

export default function App() {
  const [userLead, setUserLead] = useState<UserLead | null>(readStoredLead);
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  const [isBookCallOpen, setIsBookCallOpen] = useState(false);

  const unlocked = userLead !== null;

  // Sincroniza o estado com o hash da URL (botão voltar, F5, link colado).
  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const activeArticle: Resource | null = useMemo(() => {
    if (route.name !== 'article') return null;
    return RESOURCES_DATA.find((r) => r.slug === route.slug) ?? null;
  }, [route]);

  // Guarda de acesso: rotas do cofre exigem lead capturado. Slug inexistente volta pro cofre.
  useEffect(() => {
    if (route.name === 'landing') return;

    if (!unlocked) {
      replaceRoute(ROUTES.landing);
      return;
    }

    if (route.name === 'article' && !activeArticle) {
      replaceRoute(ROUTES.vault);
    }
  }, [route, unlocked, activeArticle]);

  // Toda troca de rota volta ao topo.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [route]);

  // Título, description, canonical, Open Graph e JSON-LD por rota.
  // Sem isso o <head> ficaria congelado no de index.html a navegação inteira.
  const pageMeta = useMemo(() => metaForRoute(route, activeArticle), [route, activeArticle]);
  useDocumentMeta(pageMeta);

  const handleUnlockSubmit = useCallback((lead: UserLead) => {
    setUserLead(lead);
    try {
      localStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify(lead));
    } catch (e) {
      console.warn('Não foi possível salvar o lead localmente:', e);
    }
    // Registro no servidor em paralelo: o acesso não espera a rede.
    void registerLead(lead);
    navigate(ROUTES.vault);
  }, []);

  const handleSelectResource = useCallback(
    (resource: Resource) => {
      // Sem lead capturado não há acesso ao conteúdo: volta para o formulário.
      navigate(unlocked ? ROUTES.article(resource.slug) : ROUTES.landing);
    },
    [unlocked],
  );

  const openBookCall = useCallback(() => setIsBookCallOpen(true), []);
  const closeBookCall = useCallback(() => setIsBookCallOpen(false), []);
  const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

  // Artigo completo de um recurso (layout próprio, sem navbar do funil)
  if (activeArticle) {
    return (
      <div className="min-h-screen bg-[#08080C] text-zinc-100 font-sans">
        <TopAnnouncementBar onOpenBookCall={openBookCall} />
        <ResourceArticleView
          resource={activeArticle}
          onBackToVault={() => navigate(ROUTES.vault)}
          onBookCall={openBookCall}
        />
        <BookCallModal isOpen={isBookCallOpen} onClose={closeBookCall} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080C] text-zinc-100 flex flex-col font-sans selection:bg-purple-900 selection:text-purple-100">

      {/* Top Ticker Notification Header */}
      <TopAnnouncementBar onOpenBookCall={openBookCall} />

      {/* Main Header / Navigation */}
      <Navbar
        currentPage={route.name === 'vault' ? 'vault' : 'landing'}
        onNavigate={navigate}
        onOpenBookCall={openBookCall}
        unlocked={unlocked}
      />

      {/* Main Container */}
      <main className="flex-1">
        {route.name !== 'vault' ? (
          /* PAGE 1: Lead Capture Landing Page */
          <div className="space-y-12">
            <HeroSection
              unlocked={unlocked}
              onUnlockSubmit={handleUnlockSubmit}
              userLead={userLead}
              onGoToVaultPage={() => navigate(ROUTES.vault)}
            />

            {/* Teaser Preview of Page 2 (Vault Content Preview) */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-t border-zinc-800/60">
              <div className="text-center mb-8">
                <span className="inline-block text-xs font-bold tracking-widest text-purple-400 uppercase bg-purple-950/70 border border-purple-800/80 px-3 py-1 rounded-full">
                  O QUE TEM DENTRO DO COFRE
                </span>
                <h2 className="mt-7 sm:mt-8 text-2xl sm:text-3xl font-extrabold text-white">
                  O que você irá desbloquear
                </h2>
                <p className="mt-3 text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto">
                  Preencha o formulário acima para liberar a biblioteca completa de prompts, scripts e automações.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="bg-[#101018] border border-zinc-800/80 rounded-2xl p-5 space-y-2 text-center">
                  <div className="w-10 h-10 rounded-full bg-purple-900/40 text-purple-300 mx-auto flex items-center justify-center font-bold text-lg border border-purple-800/50">
                    ⚡
                  </div>
                  <h3 className="font-bold text-white text-sm">Prompts para Claude & AI</h3>
                  <p className="text-xs text-zinc-400">Prompts prontos para copiar e colar que aceleram criação de código, conteúdo e ads.</p>
                </div>

                <div className="bg-[#101018] border border-zinc-800/80 rounded-2xl p-5 space-y-2 text-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-900/40 text-indigo-300 mx-auto flex items-center justify-center font-bold text-lg border border-indigo-800/50">
                    🎯
                  </div>
                  <h3 className="font-bold text-white text-sm">Sistemas de Lead Gen</h3>
                  <p className="text-xs text-zinc-400">Modelos de prospecção fria, scrapers e listas de contatos estratégicos.</p>
                </div>

                <div className="bg-[#101018] border border-zinc-800/80 rounded-2xl p-5 space-y-2 text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-900/40 text-emerald-300 mx-auto flex items-center justify-center font-bold text-lg border border-emerald-800/50">
                    🚀
                  </div>
                  <h3 className="font-bold text-white text-sm">Scripts de Automação</h3>
                  <p className="text-xs text-zinc-400">Blueprints do n8n, Make e conectores de API para escalar vendas automaticamente.</p>
                </div>
              </div>

              <div className="text-center pt-8">
                {unlocked ? (
                  <a
                    href={ROUTES.vault}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(ROUTES.vault);
                    }}
                    className="inline-block px-8 py-3.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all shadow-xl shadow-purple-950/50 cursor-pointer"
                  >
                    Entrar no Cofre de Recursos →
                  </a>
                ) : (
                  <p className="text-xs text-zinc-500 italic">
                    ↑ Preencha o formulário no topo da página para liberar o acesso
                  </p>
                )}
              </div>
            </section>
          </div>
        ) : (
          /* PAGE 2: Full Vault Page */
          <div className="py-4">
            <PeekVaultSection
              onSelectResource={handleSelectResource}
              onOpenBookCall={openBookCall}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer onOpenBookCall={openBookCall} onScrollToTop={scrollToTop} />

      {/* Book a Call Strategy Modal */}
      <BookCallModal isOpen={isBookCallOpen} onClose={closeBookCall} />

      {/* Bottom Right Floating Assistant Widget */}
      <FloatingWidget unlocked={unlocked} onSelectResource={handleSelectResource} />

    </div>
  );
}
