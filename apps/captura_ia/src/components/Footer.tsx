import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ROUTES } from '../lib/router';

interface FooterProps {
  onOpenBookCall: () => void;
  onScrollToTop: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenBookCall, onScrollToTop }) => {
  return (
    <footer className="bg-[#050508] border-t border-zinc-800/80 py-12 px-4 sm:px-6 lg:px-8 text-zinc-400 text-xs select-none">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
        
        {/* Col 1: Brand Info */}
        <div className="space-y-3 md:col-span-1">
          <button
            type="button"
            onClick={onScrollToTop}
            aria-label="Voltar ao topo da página"
            className="flex items-center gap-2 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-sky-500 p-[1px]">
              <img
                src="https://res.cloudinary.com/dtw3f2py1/image/upload/v1786111368/ORACLUM_-_2_azzgzp.png"
                alt="Logotipo da ORACLUM TECH"
                width={28}
                height={28}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover rounded-full bg-zinc-900"
              />
            </div>
            <span className="font-bold text-base text-white">ORACLUM TECH</span>
          </button>
          <p className="text-zinc-500 leading-relaxed text-xs">
            Automatizando conteúdo, anúncios e sistemas de CRM para coaches, criadores de conteúdo e agências.
          </p>
        </div>

        {/* Col 2: Vault Navigation */}
        <nav aria-labelledby="footer-vault" className="space-y-2">
          <h2 id="footer-vault" className="font-bold text-zinc-200 uppercase text-[11px] tracking-wider">Cofre de Recursos</h2>
          <ul className="space-y-1.5 text-zinc-400">
            <li><a href={ROUTES.article('best-way-to-set-up-claude-code')} className="hover:text-purple-300 transition-colors">Configurar o Claude Code</a></li>
            <li><a href={ROUTES.article('connect-claude-to-your-ad-account')} className="hover:text-purple-300 transition-colors">Conectores MCP Meta Ads</a></li>
            <li><a href={ROUTES.article('connect-claude-to-gohighlevel')} className="hover:text-purple-300 transition-colors">Automação de CRM com IA</a></li>
            <li><a href={ROUTES.article('ai-content-team-blueprint')} className="hover:text-purple-300 transition-colors">Equipe de Conteúdo com 6 Agentes</a></li>
          </ul>
        </nav>

        {/* Col 3: Programs */}
        <div className="space-y-2">
          <h2 className="font-bold text-zinc-200 uppercase text-[11px] tracking-wider">Mentoria &amp; Anúncios</h2>
          <ul className="space-y-1.5 text-zinc-400">
            <li><button type="button" onClick={onOpenBookCall} className="hover:text-purple-300 transition-colors text-left cursor-pointer">Mentoria 1:1 de Estratégia de IA</button></li>
            <li><button type="button" onClick={onOpenBookCall} className="hover:text-purple-300 transition-colors text-left cursor-pointer">Sistemas de Conteúdo para Agências</button></li>
            <li><button type="button" onClick={onOpenBookCall} className="hover:text-purple-300 transition-colors text-left cursor-pointer">Configuração de UGC e Anúncios IA</button></li>
          </ul>
        </div>

        {/* Col 4: Action */}
        <div className="space-y-3">
          <h2 className="font-bold text-zinc-200 uppercase text-[11px] tracking-wider">Fale Conosco</h2>
          <p className="text-zinc-500 text-xs">
            Pronto para escalar seu negócio com sistemas autônomos de IA?
          </p>
          <button
            type="button"
            onClick={onOpenBookCall}
            className="w-full py-2.5 px-4 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-purple-950/40 cursor-pointer"
          >
            Agendar Reunião <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-500 text-[11px]">
        <p>© 2026 ORACLUM TECH. Todos os direitos reservados.</p>
        <div className="flex items-center gap-4">
          <a href="#privacy" className="hover:text-zinc-300">Política de Privacidade</a>
          <a href="#terms" className="hover:text-zinc-300">Termos & Condições</a>
          <button type="button" onClick={onOpenBookCall} className="hover:text-zinc-300 cursor-pointer">Contato</button>
        </div>
      </div>
    </footer>
  );
};
