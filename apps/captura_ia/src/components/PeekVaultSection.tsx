import React, { useState, useMemo, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { Resource, CategoryType } from '../types';
import { RESOURCES_DATA, CATEGORIES, CATEGORY_LABELS } from '../data/resources';
import { ROUTES } from '../lib/router';
import { VaultSearchInput } from './VaultSearchInput';

interface PeekVaultSectionProps {
  onSelectResource: (resource: Resource) => void;
  onOpenBookCall: () => void;
}

export const PeekVaultSection: React.FC<PeekVaultSectionProps> = ({
  onSelectResource,
  onOpenBookCall,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Brilho e parallax são escritos direto no DOM: setState aqui re-renderizaria
  // a grade inteira a cada pixel de movimento do mouse.
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (glowRef.current) {
      glowRef.current.style.background =
        `radial-gradient(750px circle at ${x}px ${y}px, rgba(139, 92, 246, 0.18), rgba(99, 102, 241, 0.04) 45%, transparent 80%)`;
    }

    if (gridRef.current) {
      const offsetX = ((x - rect.width / 2) / (rect.width / 2)) * 12;
      const offsetY = ((y - rect.height / 2) / (rect.height / 2)) * 12;
      gridRef.current.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
    }
  };

  const setGlowOpacity = (opacity: string) => {
    if (glowRef.current) glowRef.current.style.opacity = opacity;
  };

  // Filter resources based on selected category and search query
  const filteredResources = useMemo(() => {
    return RESOURCES_DATA.filter((item) => {
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchesSearch = 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Badge pill class depending on category
  const getCategoryBadgeClass = (category: CategoryType) => {
    switch (category) {
      case 'LEAD GENERATION':
        return 'bg-[#2a1728] text-purple-300 border-purple-800/60';
      case 'AUTOMATION':
        return 'bg-[#12241e] text-emerald-300 border-emerald-800/60';
      case 'AI ADS':
        return 'bg-[#151c38] text-sky-300 border-sky-800/60';
      case 'AI CONTENT':
        return 'bg-[#211634] text-purple-300 border-purple-800/60';
      case 'CLAUDE':
        return 'bg-[#2c1d12] text-amber-300 border-amber-800/60';
      case 'PROMPTS':
        return 'bg-[#12232a] text-cyan-300 border-cyan-800/60';
      case 'TOOLS AND SKILLS':
      default:
        return 'bg-[#1a1a24] text-zinc-300 border-zinc-800';
    }
  };

  return (
    <section 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setGlowOpacity('1')}
      onMouseLeave={() => setGlowOpacity('0.6')}
      id="vault-grid" 
      className="w-full relative min-h-screen py-10 md:py-16 bg-[#08080C] select-none overflow-hidden"
    >
      {/* Full-width Background Interactive Grid with Mouse Parallax Shift */}
      <div 
        ref={gridRef}
        className="absolute inset-0 pointer-events-none transition-transform duration-200 ease-out z-0 bg-grid-pattern"
      />

      {/* Full-width Radial Purple Glow Following Mouse Pointer */}
      <div 
        ref={glowRef}
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
        style={{
          opacity: 0.6,
          background: 'radial-gradient(750px circle at 50% 30%, rgba(139, 92, 246, 0.18), rgba(99, 102, 241, 0.04) 45%, transparent 80%)',
        }}
      />

      {/* Main Centered Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 relative z-10">

        {/* Main Title Section */}
        <div className="text-center space-y-3 max-w-3xl mx-auto pt-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            O Cofre de Recursos
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 font-normal leading-relaxed">
            Cada sistema que usamos para rodar conteúdo e vendas com IA. Toque em qualquer card para a explicação completa.
          </p>
        </div>

        {/* Search Input & Category Filter Tabs */}
        <div className="space-y-6 max-w-4xl mx-auto">
          
          {/* Animated Search Bar */}
          <VaultSearchInput value={searchQuery} onChange={setSearchQuery} />

          {/* Category Filter Pills (Smaller & Left-aligned directly under search bar) */}
          <div className="w-full pt-1">
            <div
              role="group"
              aria-label="Filtrar recursos por categoria"
              className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-start"
            >
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.value;

                return (
                  <button
                    key={cat.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`text-[11px] sm:text-xs font-medium px-3 py-1 rounded-full border transition-all whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-[#241740] border-purple-600/80 text-white font-semibold shadow-sm'
                        : 'bg-[#0d0d16] border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resource Counter Text */}
          <div role="status" aria-live="polite" className="text-zinc-500 text-xs font-normal pt-1">
            {filteredResources.length} recursos disponíveis
          </div>
        </div>

        {/* 2-Column Resource Card Grid */}
        <h2 className="sr-only">Todos os recursos do cofre</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-7xl mx-auto">
          {filteredResources.map((res) => {
            const badgeStyle = getCategoryBadgeClass(res.category);

            return (
              // <a> de verdade: o card ganha href real (abre em nova aba, é
              // rastreável e vem com semântica de link de graça). O onClick
              // mantém a guarda de acesso, que decide se leva ao artigo ou
              // devolve ao formulário.
              <a
                key={res.id}
                href={ROUTES.article(res.slug)}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectResource(res);
                }}
                className="group relative bg-[#0a0a12]/95 border border-zinc-800/80 hover:border-zinc-700 focus-visible:border-purple-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600/60 rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-lg overflow-hidden"
              >
                <div>
                  {/* Category Badge Tag Top Left */}
                  <div className="mb-4">
                    <span className={`text-[10px] font-extrabold tracking-wider px-3 py-1 rounded-full border uppercase inline-block ${badgeStyle}`}>
                      {CATEGORY_LABELS[res.category]}
                    </span>
                  </div>

                  {/* Card Title */}
                  <h3 className="font-extrabold text-lg sm:text-xl text-white group-hover:text-purple-300 transition-colors mb-3 leading-snug">
                    {res.title}
                  </h3>

                  {/* Card Description */}
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-normal mb-6">
                    {res.description}
                  </p>
                </div>

                {/* Bottom Open Link */}
                <div className="pt-2 flex items-center text-xs font-semibold text-purple-400 group-hover:text-purple-300">
                  <span>Abrir tutorial</span>
                  <ArrowRight
                    className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform"
                    aria-hidden="true"
                  />
                </div>

                {/* Hover Highlight Overlay */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </a>
            );
          })}
        </div>

        {/* Empty Search State */}
        {filteredResources.length === 0 && (
          <div className="text-center py-16 bg-[#0a0a12] border border-zinc-800 rounded-2xl space-y-3">
            <p className="text-base font-bold text-white">Nenhum recurso encontrado</p>
            <p className="text-xs text-zinc-400">Tente selecionar "Todos" ou busque por termos como "Claude", "Meta ads" ou "Leads".</p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('ALL');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-full bg-purple-600 text-white text-xs font-semibold hover:bg-purple-500 cursor-pointer"
            >
              Ver todos os recursos
            </button>
          </div>
        )}

        {/* Featured CTA Banner Card (Bottom of page 2) */}
        <div className="mt-16 pt-8 max-w-7xl mx-auto">
          <div className="bg-[#0e0c18] border-2 border-purple-600/60 rounded-3xl p-6 sm:p-10 text-left shadow-2xl relative overflow-hidden group">
            
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-700/80 text-purple-300 text-[11px] font-bold tracking-wider uppercase mb-6">
              VOCÊ ACABA DE LER COMO UMA PEÇA FUNCIONA
            </div>

            {/* Title */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight">
              Automatize seu Conteúdo e Anúncios com IA
            </h2>

            {/* Description */}
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed mb-8 max-w-3xl">
              Instalamos os sistemas de IA que automatizam seu conteúdo e anúncios e treinamos você para executá-los — para que você gaste menos tempo criando e mais tempo escalando. Nas suas contas, de sua propriedade.
            </p>

            {/* Checklist Features */}
            <div className="space-y-3 mb-8 text-sm text-zinc-200">
              <div className="flex items-start gap-3">
                <span className="text-purple-400 font-bold text-base mt-0.5">✓</span>
                <span><strong>Um sistema de conteúdo</strong> que pesquisa, roteiriza com sua voz e publica diariamente</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-purple-400 font-bold text-base mt-0.5">✓</span>
                <span><strong>Um comprador de mídia com agente</strong> que audita sua conta de anúncios, cria criativos e lança</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-purple-400 font-bold text-base mt-0.5">✓</span>
                <span><strong>Uma máquina de leads</strong> que encontra seus clientes exatos e rascunha o acompanhamento</span>
              </div>
            </div>

            {/* Callout */}
            <div className="bg-[#181528] border border-purple-800/50 rounded-2xl p-4 sm:p-5 text-xs sm:text-sm text-zinc-300 mb-8 font-medium">
              Arquivos na sua máquina, rodando nas suas contas. Sem assinatura para nós, nada para manter.
            </div>

            {/* CTA Footer */}
            <div className="space-y-4 pt-2">
              <p className="text-xs font-bold tracking-widest text-purple-300 uppercase">
                MENTORIA 1:1 PARA COACHES E AGÊNCIAS
              </p>

              <button
                type="button"
                onClick={onOpenBookCall}
                className="px-8 py-4 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-purple-900/50 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                Agendar reunião <ArrowRight className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
              </button>

              <p className="text-xs text-zinc-400 max-w-xl leading-relaxed pt-2">
                Não está pronto para o 1:1? Comece na comunidade por $97/mês — a versão no seu próprio ritmo. Avance quando estiver pronto.
              </p>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};


