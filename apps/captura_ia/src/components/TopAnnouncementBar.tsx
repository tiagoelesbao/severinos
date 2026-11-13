import React from 'react';
import { ArrowRight } from 'lucide-react';

interface TopAnnouncementBarProps {
  onOpenBookCall: () => void;
}

export const TopAnnouncementBar: React.FC<TopAnnouncementBarProps> = ({ onOpenBookCall }) => {
  return (
    // A barra inteira é clicável: precisa ser <button> para chegar pelo teclado
    // e ser anunciada como controle, não como texto solto.
    <button
      type="button"
      onClick={onOpenBookCall}
      aria-label="Agendar reunião de estratégia — automação de conteúdo e anúncios com IA"
      className="w-full bg-[#0b0a14] border-b border-purple-900/30 text-xs py-2 px-4 text-center text-zinc-300 flex items-center justify-center gap-2 cursor-pointer hover:bg-[#121020] transition-colors group select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500"
    >
      <span
        aria-hidden="true"
        className="w-2 h-2 rounded-full bg-purple-500 animate-pulse inline-block flex-shrink-0"
      />
      <span className="font-semibold tracking-wider uppercase text-[11px] text-purple-300 sm:text-xs">
        AUTOMATIZE CONTEÚDO &amp; ANÚNCIOS
      </span>
      <span className="text-zinc-600 hidden sm:inline" aria-hidden="true">•</span>
      <span className="font-normal text-zinc-300 text-[11px] sm:text-xs hidden sm:inline">
        MENTORIA 1:1 COM IA PARA COACHES E AGÊNCIAS
      </span>
      <span className="font-bold text-purple-300 group-hover:text-purple-200 group-hover:translate-x-1 transition-transform flex items-center gap-1 text-[11px] sm:text-xs ml-1">
        AGENDAR REUNIÃO <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
      </span>
    </button>
  );
};
