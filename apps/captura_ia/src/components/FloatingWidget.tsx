import React, { useState, useMemo } from 'react';
import { Lock, Unlock, X, ChevronRight, Search } from 'lucide-react';
import { Resource } from '../types';
import { RESOURCES_DATA } from '../data/resources';

interface FloatingWidgetProps {
  unlocked: boolean;
  onSelectResource: (res: Resource) => void;
}

export const FloatingWidget: React.FC<FloatingWidgetProps> = ({
  unlocked,
  onSelectResource,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return RESOURCES_DATA.filter(
      (r) => r.title.toLowerCase().includes(term) || r.category.toLowerCase().includes(term),
    ).slice(0, 4);
  }, [search]);

  return (
    <div className="fixed bottom-5 right-5 z-40">

      {/* Expanded Popup */}
      {isOpen && (
        <div
          role="region"
          aria-labelledby="vault-assistant-title"
          className="mb-3 w-80 bg-[#0e0e18] border border-sky-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-fade-in text-white space-y-3"
        >

          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-sky-500/20 border border-sky-400 flex items-center justify-center text-sky-400">
                {unlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              </div>
              <div>
                {/* <p>, não heading: o widget não faz parte do sumário da página. */}
                <p id="vault-assistant-title" className="text-xs font-bold">Assistente do Cofre</p>
                <p className="text-[10px] text-zinc-400">
                  {unlocked ? 'Acesso liberado' : 'Acesso bloqueado'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Fechar assistente"
              className="text-zinc-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              aria-label="Busca rápida no cofre"
              placeholder="Busca rápida no cofre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#181826] border border-zinc-800 focus:border-sky-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none"
            />
          </div>

          {/* Quick List */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <p className="text-[11px] text-zinc-500 py-3 text-center">Nenhum recurso encontrado.</p>
            )}

            {filtered.map((res) => (
              <button
                type="button"
                key={res.id}
                onClick={() => {
                  onSelectResource(res);
                  setIsOpen(false);
                }}
                className="w-full text-left p-2 rounded-lg bg-[#141422] hover:bg-[#1a1a2e] border border-zinc-800/80 cursor-pointer flex items-center justify-between text-xs group"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-200 group-hover:text-sky-300 transition-colors line-clamp-1">
                    {res.title}
                  </p>
                  <span className="text-[9px] text-zinc-500 uppercase">{res.category}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-sky-400 flex-shrink-0" aria-hidden="true" />
              </button>
            ))}
          </div>

          {!unlocked && (
            <p className="text-[10px] text-zinc-400 leading-relaxed border-t border-zinc-800 pt-2.5">
              Preencha o formulário na página inicial para abrir qualquer um destes guias por completo.
            </p>
          )}

        </div>
      )}

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-sky-500 hover:bg-sky-400 text-white shadow-xl shadow-sky-500/30 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 border border-sky-300/40 cursor-pointer"
        aria-label={isOpen ? 'Fechar assistente do cofre' : 'Abrir assistente do cofre'}
        aria-expanded={isOpen}
      >
        {unlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
      </button>

    </div>
  );
};
