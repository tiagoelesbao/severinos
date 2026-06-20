import React, { useState } from 'react';
import type { Layer, LayerType } from '@/lib/layers';

const TYPE_ICON: Record<LayerType, string> = { text: 'T', image: '🖼', shape: '◼' };
const TYPE_TINT: Record<LayerType, string> = {
  text: 'bg-sky-500/20 text-sky-300',
  image: 'bg-emerald-500/20 text-emerald-300',
  shape: 'bg-fuchsia-500/20 text-fuchsia-300',
};

function ActionBtn({
  onClick, title, children, danger = false, disabled = false,
}: {
  onClick: (e: React.MouseEvent) => void; title: string;
  children: React.ReactNode; danger?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`h-7 w-7 flex items-center justify-center rounded-md text-[13px] transition disabled:opacity-25 disabled:cursor-not-allowed ${
        danger ? 'text-white/55 hover:text-[#FF4D2E] hover:bg-[#FF4D2E]/10'
          : 'text-white/55 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

export function LayersPanel({
  layers,
  selectedId,
  onSelect,
  onAdd,
  onPatch,
  onReorder,
  onDuplicate,
  onDelete,
}: {
  layers: Layer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (type: LayerType) => void;
  onPatch: (id: string, patch: Partial<Layer>) => void;
  onReorder: (id: string, dir: 'up' | 'down') => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  // Topo da lista = maior zIndex (frente).
  const ordered = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <span className="text-[11px] font-black uppercase tracking-widest text-white/50">
          Camadas <span className="text-white/25">({layers.length})</span>
        </span>
        <div className="flex gap-1">
          <button onClick={() => onAdd('text')} title="Adicionar texto"
            className="h-7 w-7 grid place-items-center text-xs rounded-md bg-white/5 hover:bg-white/15 font-bold transition">T</button>
          <button onClick={() => onAdd('image')} title="Adicionar imagem"
            className="h-7 w-7 grid place-items-center text-xs rounded-md bg-white/5 hover:bg-white/15 transition">🖼</button>
          <button onClick={() => onAdd('shape')} title="Adicionar forma"
            className="h-7 w-7 grid place-items-center text-xs rounded-md bg-white/5 hover:bg-white/15 transition">◼</button>
        </div>
      </div>

      <div className="flex flex-col gap-1 overflow-y-auto min-h-0 -mr-1 pr-1">
        {ordered.map((l, i) => {
          const isSel = l.id === selectedId;
          return (
            <div
              key={l.id}
              onClick={() => onSelect(l.id)}
              className={`rounded-lg border transition cursor-pointer ${
                isSel ? 'border-[#FFB800]/70 bg-[#FFB800]/[0.08]' : 'border-white/5 hover:border-white/15 hover:bg-white/[0.03]'
              }`}
            >
              {/* Linha 1: tipo + nome (sempre legível) + olho/cadeado */}
              <div className="flex items-center gap-2 px-2 py-1.5">
                <span className={`h-6 w-6 shrink-0 grid place-items-center rounded text-[11px] font-bold ${TYPE_TINT[l.type]}`}>
                  {TYPE_ICON[l.type]}
                </span>
                {editingId === l.id ? (
                  <input
                    autoFocus
                    value={l.name}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onPatch(l.id, { name: e.target.value })}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingId(null); }}
                    className="flex-1 min-w-0 bg-black/40 border border-[#FFB800]/40 rounded px-1.5 py-0.5 text-sm outline-none"
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => { e.stopPropagation(); setEditingId(l.id); }}
                    title={`${l.name} — duplo-clique para renomear`}
                    className={`flex-1 min-w-0 truncate text-sm select-none ${l.hidden ? 'text-white/30 line-through' : 'text-white/90'}`}
                  >
                    {l.name}
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onPatch(l.id, { hidden: !l.hidden }); }}
                  title={l.hidden ? 'Mostrar' : 'Ocultar'}
                  className="h-6 w-6 shrink-0 grid place-items-center rounded text-[12px] text-white/40 hover:text-white hover:bg-white/10 transition"
                >{l.hidden ? '🙈' : '👁'}</button>
                <button
                  onClick={(e) => { e.stopPropagation(); onPatch(l.id, { locked: !l.locked }); }}
                  title={l.locked ? 'Destravar' : 'Travar'}
                  className="h-6 w-6 shrink-0 grid place-items-center rounded text-[12px] text-white/40 hover:text-white hover:bg-white/10 transition"
                >{l.locked ? '🔒' : '🔓'}</button>
              </div>

              {/* Linha 2: barra de ações (só na camada selecionada) — sem sobrepor o nome */}
              {isSel && (
                <div className="flex items-center gap-0.5 px-1.5 pb-1.5 -mt-0.5 border-t border-white/5 pt-1">
                  <ActionBtn title="Trazer à frente" disabled={i === 0}
                    onClick={(e) => { e.stopPropagation(); onReorder(l.id, 'up'); }}>▲</ActionBtn>
                  <ActionBtn title="Enviar para trás" disabled={i === ordered.length - 1}
                    onClick={(e) => { e.stopPropagation(); onReorder(l.id, 'down'); }}>▼</ActionBtn>
                  <ActionBtn title="Renomear"
                    onClick={(e) => { e.stopPropagation(); setEditingId(l.id); }}>✎</ActionBtn>
                  <ActionBtn title="Duplicar (Ctrl+D)"
                    onClick={(e) => { e.stopPropagation(); onDuplicate(l.id); }}>⧉</ActionBtn>
                  <div className="flex-1" />
                  <ActionBtn title="Remover (Del)" danger
                    onClick={(e) => { e.stopPropagation(); onDelete(l.id); }}>🗑</ActionBtn>
                </div>
              )}
            </div>
          );
        })}
        {layers.length === 0 && (
          <p className="text-xs text-white/30 py-4 text-center">Sem camadas. Use T / 🖼 / ◼ para adicionar.</p>
        )}
      </div>
    </div>
  );
}
