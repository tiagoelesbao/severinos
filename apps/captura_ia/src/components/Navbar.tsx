import React, { useState } from 'react';
import { Check, Menu, X, ArrowRight } from 'lucide-react';
import { ROUTES } from '../lib/router';

interface NavbarProps {
  currentPage: 'landing' | 'vault';
  onNavigate: (hash: string) => void;
  onOpenBookCall: () => void;
  unlocked: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  onOpenBookCall,
  unlocked
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#08080C]/90 backdrop-blur-md border-b border-zinc-800/80 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Avatar + Name (Left) — link real: navegável, rastreável e focável */}
        <a
          href={ROUTES.landing}
          onClick={(e) => {
            e.preventDefault();
            onNavigate(ROUTES.landing);
          }}
          aria-label="ORACLUM TECH — página inicial"
          className="flex items-center gap-2.5 cursor-pointer group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-sky-500 p-[1.5px]">
              <img
                src="https://res.cloudinary.com/dtw3f2py1/image/upload/v1786111368/ORACLUM_-_2_azzgzp.png"
                alt="Logotipo da ORACLUM TECH"
                width={32}
                height={32}
                decoding="async"
                className="w-full h-full object-cover rounded-full bg-zinc-900"
              />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 bg-sky-500 rounded-full p-0.5 border border-zinc-950 flex items-center justify-center">
              <Check className="w-2 h-2 text-white stroke-[3]" aria-hidden="true" />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base sm:text-lg text-white tracking-tight group-hover:text-purple-300 transition-colors">
              ORACLUM TECH
            </span>
            <span
              aria-hidden="true"
              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sky-500 text-white text-[10px] font-bold"
            >
              ✓
            </span>
          </div>
        </a>

        {/* Desktop Nav Links (Center) */}
        <nav
          aria-label="Navegação principal"
          className="hidden md:flex items-center gap-6 lg:gap-8 text-xs sm:text-sm font-medium"
        >
          <button
            onClick={() => onNavigate(ROUTES.landing)}
            className={`transition-colors cursor-pointer ${
              currentPage === 'landing' && !unlocked ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Início
          </button>

          <button
            onClick={onOpenBookCall}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Automação de Conteúdo & Ads
          </button>

          <button
            onClick={() => onNavigate(unlocked ? ROUTES.vault : ROUTES.landing)}
            className={`transition-colors cursor-pointer ${
              (currentPage === 'vault' || (currentPage === 'landing' && unlocked)) ? 'text-purple-300 font-bold' : 'text-zinc-300 hover:text-white'
            }`}
          >
            Recursos Gratuitos
          </button>

          <button
            onClick={() => onNavigate(ROUTES.landing)}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Sobre
          </button>

          <button
            onClick={onOpenBookCall}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Contato
          </button>
        </nav>

        {/* Right Action Button */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={onOpenBookCall}
            className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold px-5 py-2 rounded-full text-xs transition-all shadow-md shadow-purple-900/40 flex items-center gap-1.5 cursor-pointer hover:scale-105"
          >
            <span>Agendar reunião</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile Menu Actions */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={onOpenBookCall}
            className="bg-[#8b5cf6] text-white font-bold px-3.5 py-1.5 rounded-full text-xs flex items-center gap-1 cursor-pointer"
          >
            <span>Agendar</span>
            <ArrowRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav"
            className="p-2 text-zinc-300 hover:text-white bg-zinc-900 rounded-lg border border-zinc-800"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <nav
          id="mobile-nav"
          aria-label="Navegação principal (mobile)"
          className="md:hidden bg-[#0a0a12] border-b border-zinc-800 px-4 pt-3 pb-6 space-y-3 animate-fadeIn"
        >
          <div className="flex flex-col gap-2 text-sm font-medium">
            <button
              onClick={() => {
                onNavigate(ROUTES.landing);
                setMobileMenuOpen(false);
              }}
              className="text-left px-3 py-2 rounded-lg text-zinc-300 hover:bg-zinc-900"
            >
              Início
            </button>

            <button
              onClick={() => {
                onOpenBookCall();
                setMobileMenuOpen(false);
              }}
              className="text-left px-3 py-2 rounded-lg text-zinc-300 hover:bg-zinc-900"
            >
              Automação de Conteúdo & Ads
            </button>

            <button
              onClick={() => {
                onNavigate(unlocked ? ROUTES.vault : ROUTES.landing);
                setMobileMenuOpen(false);
              }}
              className={`text-left px-3 py-2 rounded-lg transition-colors font-bold ${
                currentPage === 'vault' ? 'bg-purple-950/60 text-purple-200' : 'text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              Recursos Gratuitos {unlocked ? '(Cofre Liberado)' : '(Formulário)'}
            </button>

            <button
              onClick={() => {
                onNavigate(ROUTES.landing);
                setMobileMenuOpen(false);
              }}
              className="text-left px-3 py-2 rounded-lg text-zinc-300 hover:bg-zinc-900"
            >
              Sobre
            </button>

            <button
              onClick={() => {
                onOpenBookCall();
                setMobileMenuOpen(false);
              }}
              className="text-left px-3 py-2 rounded-lg text-zinc-300 hover:bg-zinc-900"
            >
              Contato
            </button>
          </div>
        </nav>
      )}
    </header>
  );
};

