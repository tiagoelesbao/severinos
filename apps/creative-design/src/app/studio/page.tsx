'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StudioCanvas } from '@/components/studio/StudioCanvas';
import { LayersPanel } from '@/components/studio/LayersPanel';
import { Inspector } from '@/components/studio/Inspector';
import { panelField } from '@/components/studio/controls';
import {
  type Layer, type LayerType, type SlideBackground,
  makeTextLayer, makeImageLayer, makeShapeLayer, newId,
} from '@/lib/layers';
import {
  STUDIO_TEMPLATES, buildPreset, extractContent,
  type PresetContent, type PresetPalette,
} from '@/lib/templatePresets';

interface BriefListItem { id: string; archetype: string; slideCount: number; }

interface StudioSlide {
  slide_n: number;
  source_slide_n?: number;
  templateId: string;
  background: SlideBackground;
  layers: Layer[];
  /** UI-only: slide confirmado/salvo pelo usuário (não persistido). */
  committed?: boolean;
}

/**
 * Recomputa a numeração/paginação após inserir ou remover slides.
 * Atualiza slide_n e as camadas dependentes do índice:
 *  - role 'ghost'   → nº do slide com zero à esquerda (editorial)
 *  - role 'counter' → "/ total" (passos)
 *  - role 'number'  → nº do slide APENAS no template de passos (tiago-step);
 *    nos demais (ex.: tiago-data) 'number' é um dado e não deve ser tocado.
 */
const repaginate = (arr: StudioSlide[]): StudioSlide[] => {
  const total = arr.length;
  return arr.map((sd, i) => {
    const n = i + 1;
    const layers = sd.layers.map((l) => {
      // Barra de progresso (shape): largura proporcional à posição do slide.
      if (l.type === 'shape' && l.role === 'progressFill') {
        return { ...l, w: Math.max(6, Math.round(128 * (n / total))) };
      }
      if (l.type !== 'text') return l;
      if (l.role === 'ghost') return { ...l, content: String(n).padStart(2, '0') };
      if (l.role === 'counter') return { ...l, content: `/ ${total}` };
      if (l.role === 'pagination') return { ...l, content: `${String(n).padStart(2, '0')} / ${String(total).padStart(2, '0')}` };
      if (l.role === 'number' && sd.templateId === 'tiago-step') return { ...l, content: String(n) };
      return l;
    });
    return { ...sd, slide_n: n, layers };
  });
};

const inferTemplate = (archetype: string, total: number): string => {
  if (archetype === 'quote') return 'quote-slide';
  if (total === 1) return 'single-post';
  return 'carousel-slide';
};

const makeLayer = (type: LayerType): Layer =>
  type === 'text' ? makeTextLayer()
    : type === 'image' ? makeImageLayer() : makeShapeLayer();

function StudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeClient = searchParams.get('client');

  const [briefs, setBriefs] = useState<BriefListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [slides, setSlides] = useState<StudioSlide[]>([]);
  const [slideIdx, setSlideIdx] = useState(0);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [scale, setScale] = useState(0.42);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [gridOn, setGridOn] = useState(false);
  const [gridCols, setGridCols] = useState(3);
  const [gridRows, setGridRows] = useState(3);
  const [palette, setPalette] = useState<PresetPalette>({
    primary: '#0B0B0F', secondary: '#1A1A24', accent: '#FFB800', accentAlt: '#FF4D2E', accentAurora: '#FFD86B',
  });
  const [signature, setSignature] = useState('');
  const [status, setStatus] = useState('');
  const [showGallery, setShowGallery] = useState(false);
  const [runs, setRuns] = useState<{ kind: string; creativeSlug: string; dir: string; mtime: number; slides: string[] }[]>([]);

  const slidesRef = useRef<StudioSlide[]>([]);
  useEffect(() => { slidesRef.current = slides; }, [slides]);
  const hist = useRef<{ past: string[]; future: string[]; last: number }>({ past: [], future: [], last: 0 });

  const pushHistory = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - hist.current.last < 350) return;
    hist.current.past.push(JSON.stringify(slidesRef.current));
    if (hist.current.past.length > 60) hist.current.past.shift();
    hist.current.future = [];
    hist.current.last = now;
  }, []);
  const undo = useCallback(() => {
    if (!hist.current.past.length) return;
    hist.current.future.push(JSON.stringify(slidesRef.current));
    setSlides(JSON.parse(hist.current.past.pop() as string));
  }, []);
  const redo = useCallback(() => {
    if (!hist.current.future.length) return;
    hist.current.past.push(JSON.stringify(slidesRef.current));
    setSlides(JSON.parse(hist.current.future.pop() as string));
  }, []);

  useEffect(() => { if (!activeClient) router.replace('/'); }, [activeClient, router]);

  const loadBriefs = useCallback(() => {
    if (!activeClient) return;
    fetch(`/api/briefs?client=${encodeURIComponent(activeClient)}`)
      .then((r) => r.json()).then((d) => setBriefs(d.briefs ?? [])).catch(() => setBriefs([]));
  }, [activeClient]);

  useEffect(() => { loadBriefs(); }, [loadBriefs]);

  const deleteBrief = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm(`Excluir o criativo "${id.replace(/^brief-v5-?/, '')}" do banco?\n\nEsta ação remove o arquivo do brief e não pode ser desfeita.`)) return;
    try {
      const res = await fetch(`/api/briefs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedId === id) { setSelectedId(null); setSlides([]); }
        loadBriefs();
      } else {
        alert('Falha ao excluir o criativo.');
      }
    } catch { alert('Erro ao excluir o criativo.'); }
  }, [selectedId, loadBriefs]);

  const loadBrief = useCallback((id: string) => {
    fetch(`/api/briefs/${id}`).then((r) => r.json()).then((d) => {
      const clientSlug = (d.client_slug as string) || 'virals';
      const pal = (d.brand_tokens as Record<string, unknown> | undefined)?.palette as Record<string, string> | undefined;
      const resolved: PresetPalette = {
        primary: pal?.primary || (clientSlug === 'virals' ? '#0C0A1F' : '#0B0B0F'),
        secondary: pal?.secondary || (clientSlug === 'virals' ? '#181436' : '#1A1A24'),
        accent: pal?.accent || (clientSlug === 'virals' ? '#FF3D68' : '#FFB800'),
        accentAlt: pal?.accent_alt || (clientSlug === 'virals' ? '#7B5BFF' : '#FF4D2E'),
        accentAurora: pal?.accent_aurora || (clientSlug === 'virals' ? '#2DE2C8' : '#FFD86B'),
      };
      setPalette(resolved);
      const sig = clientSlug === 'virals' ? '' : `@${clientSlug.replace(/-/g, '')}`;
      setSignature(sig);

      const archetype = (d.archetype as string) || 'news';
      const cd = (d.content_data ?? []) as Record<string, unknown>[];
      const total = cd.length;
      const docs: StudioSlide[] = cd.map((s, i) => {
        const n = (s.slide_n as number) ?? i + 1;
        const tid = (s.template_id as string) || inferTemplate(archetype, total);
        // Já editado no Studio → reusa camadas/fundo persistidos.
        if (Array.isArray(s.layers) && s.layers.length && s.background) {
          return {
            slide_n: n, source_slide_n: (s.source_slide_n as number) ?? n,
            templateId: tid, background: s.background as SlideBackground, layers: s.layers as Layer[],
            committed: true, // veio da persistência → já confirmado
          };
        }
        const content: PresetContent = {
          headline: (s.headline as string) ?? '',
          subHeadline: (s.sub_headline as string) ?? '',
          bodyText: (s.body_text as string) ?? '',
          number: (s.number as string) ?? '',
          unitSuffix: (s.unit_suffix as string) ?? '',
          callToThink: (s.call_to_think as string) ?? '',
          accentColor: (s.accent_color as string) || resolved.accent,
          image: (s.image_url as string) ?? null,
          pexelsQuery: (s.pexels_query as string) ?? '',
        };
        const preset = buildPreset(tid, content, resolved, { slideNumber: i + 1, totalSlides: total, signature: sig });
        return { slide_n: n, source_slide_n: (s.source_slide_n as number) ?? n, templateId: tid, ...preset };
      });
      setSlides(docs);
      setSlideIdx(0); setSelectedLayerId(null);
      hist.current = { past: [], future: [], last: 0 };
      hydratePexels(docs);
    }).catch(() => setSlides([]));
  }, []);

  // MED-06/G1: busca foto no Pexels para camadas de imagem com `query` e sem
  // `src` (casa o default do Studio com o pipeline automático). Salvar persiste
  // o src e evita re-busca nos próximos loads.
  const hydratePexels = useCallback((docs: StudioSlide[]) => {
    docs.forEach((doc, i) => {
      doc.layers.forEach((l) => {
        if (l.type !== 'image' || !l.query || l.src) return;
        fetch(`/api/pexels?q=${encodeURIComponent(l.query)}&orientation=portrait`)
          .then((r) => r.json())
          .then((d) => {
            if (!d?.url) return;
            setSlides((prev) => prev.map((sd, idx) => (idx === i
              ? { ...sd, layers: sd.layers.map((x) => (x.id === l.id ? { ...x, src: d.url } as Layer : x)) }
              : sd)));
          })
          .catch(() => { /* degrada em silêncio */ });
      });
    });
  }, []);

  useEffect(() => { if (selectedId) loadBrief(selectedId); }, [selectedId, loadBrief]);

  const current = slides[slideIdx];

  const setCurrent = useCallback((updater: (s: StudioSlide) => StudioSlide, history = true) => {
    if (history) pushHistory();
    setSlides((prev) => prev.map((sd, i) => (i === slideIdx ? { ...updater(sd), committed: false } : sd)));
  }, [slideIdx, pushHistory]);

  const patchLayer = useCallback((idL: string, patch: Partial<Layer>) => {
    setCurrent((s) => ({ ...s, layers: s.layers.map((l) => (l.id === idL ? { ...l, ...patch } as Layer : l)) }));
  }, [setCurrent]);

  const patchBackground = useCallback((patch: Partial<SlideBackground>) => {
    setCurrent((s) => ({ ...s, background: { ...s.background, ...patch } }));
  }, [setCurrent]);

  // Troca de template → recalcula camadas mantendo o conteúdo (calibração).
  const switchTemplate = useCallback((templateId: string) => {
    pushHistory(true);
    setSlides((prev) => prev.map((sd, i) => {
      if (i !== slideIdx) return sd;
      const content = extractContent(sd.layers);
      content.accentColor = palette.accent;
      const preset = buildPreset(templateId, content, palette, {
        slideNumber: i + 1, totalSlides: prev.length, signature,
      });
      return { ...sd, templateId, ...preset, committed: false };
    }));
    setSelectedLayerId(null);
  }, [slideIdx, palette, signature, pushHistory]);

  const addLayer = useCallback((type: LayerType) => {
    pushHistory(true);
    const maxZ = Math.max(0, ...(current?.layers.map((l) => l.zIndex) ?? [0]));
    const layer = { ...makeLayer(type), zIndex: maxZ + 1 };
    setSlides((prev) => prev.map((sd, i) => (i === slideIdx ? { ...sd, layers: [...sd.layers, layer], committed: false } : sd)));
    setSelectedLayerId(layer.id);
  }, [current, slideIdx, pushHistory]);

  const deleteLayer = useCallback((idL: string) => {
    pushHistory(true);
    setCurrent((s) => ({ ...s, layers: s.layers.filter((l) => l.id !== idL) }), false);
    setSelectedLayerId((s) => (s === idL ? null : s));
  }, [setCurrent, pushHistory]);

  const duplicateLayer = useCallback((idL: string) => {
    pushHistory(true);
    const src = current?.layers.find((l) => l.id === idL);
    if (!src) return;
    const copy = { ...src, id: newId(src.type[0]), name: `${src.name} cópia`, x: src.x + 24, y: src.y + 24, zIndex: src.zIndex + 1, role: undefined } as Layer;
    setSlides((prev) => prev.map((sd, i) => (i === slideIdx ? { ...sd, layers: [...sd.layers, copy], committed: false } : sd)));
    setSelectedLayerId(copy.id);
  }, [current, slideIdx, pushHistory]);

  const reorder = useCallback((idL: string, dir: 'up' | 'down') => {
    pushHistory(true);
    setCurrent((s) => {
      const sorted = [...s.layers].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((l) => l.id === idL);
      const swap = dir === 'up' ? idx + 1 : idx - 1;
      if (swap < 0 || swap >= sorted.length) return s;
      const z1 = sorted[idx].zIndex, z2 = sorted[swap].zIndex;
      return { ...s, layers: s.layers.map((l) => l.id === sorted[idx].id ? { ...l, zIndex: z2 } : l.id === sorted[swap].id ? { ...l, zIndex: z1 } : l) };
    }, false);
  }, [setCurrent, pushHistory]);

  // ── Operações de SLIDE (não só de camada) ───────────────────────────────
  const deleteSlide = useCallback((idx: number) => {
    if (slides.length <= 1) { alert('O criativo precisa de ao menos 1 slide.'); return; }
    if (!confirm(`Excluir o slide ${idx + 1}?\n\nOs demais serão renumerados e a paginação recomputada.`)) return;
    pushHistory(true);
    setSlides((prev) => repaginate(prev.filter((_, i) => i !== idx)));
    setSlideIdx((cur) => {
      const newLen = slides.length - 1;
      const next = idx < cur ? cur - 1 : idx === cur ? Math.min(cur, newLen - 1) : cur;
      return Math.max(0, next);
    });
    setSelectedLayerId(null);
  }, [slides.length, pushHistory]);

  // Duplica o slide atual como um novo slide (clona camadas com ids frescos).
  const addSlide = useCallback(() => {
    pushHistory(true);
    setSlides((prev) => {
      const base = prev[slideIdx];
      if (!base) return prev;
      const clone: StudioSlide = {
        ...base,
        committed: false,
        layers: base.layers.map((l) => ({ ...l, id: newId(l.type[0]) })),
      };
      const next = [...prev.slice(0, slideIdx + 1), clone, ...prev.slice(slideIdx + 1)];
      return repaginate(next);
    });
    setSlideIdx((cur) => cur + 1);
    setSelectedLayerId(null);
  }, [slideIdx, pushHistory]);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json(); return data.url ?? null;
    } catch { return null; }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if (!selectedLayerId) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateLayer(selectedLayerId); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteLayer(selectedLayerId); return; }
      if (e.key === 'Escape') { setSelectedLayerId(null); return; }
      const nudge = e.shiftKey ? 10 : 1;
      const sel = current?.layers.find((l) => l.id === selectedLayerId);
      if (!sel) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); patchLayer(sel.id, { x: sel.x - nudge }); }
      if (e.key === 'ArrowRight') { e.preventDefault(); patchLayer(sel.id, { x: sel.x + nudge }); }
      if (e.key === 'ArrowUp') { e.preventDefault(); patchLayer(sel.id, { y: sel.y - nudge }); }
      if (e.key === 'ArrowDown') { e.preventDefault(); patchLayer(sel.id, { y: sel.y + nudge }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedLayerId, current, undo, redo, duplicateLayer, deleteLayer, patchLayer]);

  const save = useCallback(async () => {
    if (!selectedId) return;
    const payload = {
      slides: slides.map((sd) => ({
        slide_n: sd.slide_n,
        headline: '', sub_headline: '', body_text: '',
        headlineFontSize: null, bodyFontSize: null,
        mainObjectImage: null, imageZoom: 1, imagePosX: 50, imagePosY: 50,
        template_id: sd.templateId,
        layers: sd.layers,
        background: sd.background,
      })),
    };
    setStatus('Salvando…');
    await fetch(`/api/briefs/${selectedId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    setStatus('✓ Salvo'); setTimeout(() => setStatus(''), 2000);
  }, [selectedId, slides]);

  // Confirma o slide atual: marca como salvo e persiste tudo (durável no reload).
  const confirmSlide = useCallback(async () => {
    if (!selectedId) return;
    setSlides((prev) => prev.map((sd, i) => (i === slideIdx ? { ...sd, committed: true } : sd)));
    await save();
    setStatus(`✓ Slide ${slideIdx + 1} confirmado e salvo`);
    setTimeout(() => setStatus(''), 2200);
  }, [selectedId, slideIdx, save]);

  const exportCreative = useCallback(async () => {
    if (!selectedId) return;
    await save();
    setStatus('Renderizando… (pode levar alguns minutos)');
    try {
      const res = await fetch('/api/export', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedId }),
      });
      const data = await res.json();
      setStatus(data.ok ? '✓ Exportado — veja outputs/' : '✗ Falha no export');
    } catch { setStatus('✗ Erro ao exportar'); }
  }, [selectedId, save]);

  const openGallery = async () => {
    if (!selectedId || !activeClient) return;
    setShowGallery(true);
    setRuns([]);
    try {
      const res = await fetch(`/api/renders?client=${encodeURIComponent(activeClient)}&id=${encodeURIComponent(selectedId)}`);
      const d = await res.json();
      setRuns(d.runs ?? []);
    } catch { setRuns([]); }
  };

  if (!activeClient) {
    return <div className="h-screen bg-[#0a0a12] text-white flex items-center justify-center text-white/40">Redirecionando…</div>;
  }

  const selectedLayer = current?.layers.find((l) => l.id === selectedLayerId) ?? null;

  return (
    <div className="h-screen bg-[#0a0a12] text-white flex overflow-hidden">
      {/* Esquerda */}
      <aside className="w-72 shrink-0 border-r border-white/10 flex flex-col bg-[#0c0c16]">
        <div className="p-4 border-b border-white/10 shrink-0">
          <button onClick={() => router.push('/')} className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white uppercase tracking-wider font-bold mb-3 transition">
            <span>←</span> Trocar cliente
          </button>
          <h1 className="text-base font-black uppercase tracking-wide">Creative Studio</h1>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[11px] text-white/40 truncate">{activeClient}</span>
            <a href={`/editor?client=${activeClient}`} className="text-[11px] text-[#FFB800] hover:underline shrink-0">↔ Editor clássico</a>
          </div>
        </div>

        {/* Seletor de criativos */}
        <div className="px-3 pt-3 pb-2 border-b border-white/10 shrink-0">
          <div className="text-[11px] font-black uppercase tracking-widest text-white/50 mb-2 px-1">
            Criativos <span className="text-white/25">({briefs.length})</span>
          </div>
          <div className="flex flex-col gap-1 max-h-52 overflow-y-auto -mr-1 pr-1">
            {briefs.map((b) => {
              const isSel = selectedId === b.id;
              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  className={`group relative rounded-lg pl-3 pr-9 py-2 border cursor-pointer transition ${
                    isSel ? 'border-[#FFB800]/70 bg-[#FFB800]/[0.08]' : 'border-white/5 hover:border-white/20 hover:bg-white/[0.03]'
                  }`}
                >
                  <div className={`truncate text-sm font-bold ${isSel ? 'text-white' : 'text-white/85'}`}>
                    {b.id.replace(/^brief-v5-?/, '')}
                  </div>
                  <div className="text-[10px] text-white/40 mt-0.5">{b.archetype} · {b.slideCount} slide(s)</div>
                  <button
                    onClick={(e) => deleteBrief(e, b.id)}
                    title="Excluir criativo do banco"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-md text-white/25 hover:text-[#FF4D2E] hover:bg-[#FF4D2E]/10 opacity-0 group-hover:opacity-100 transition"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              );
            })}
            {briefs.length === 0 && <p className="text-xs text-white/30 px-1 py-2">Nenhum criativo.</p>}
          </div>
        </div>

        <div className="flex-1 p-3 overflow-hidden min-h-0">
          {current && (
            <LayersPanel
              layers={current.layers}
              selectedId={selectedLayerId}
              onSelect={setSelectedLayerId}
              onAdd={addLayer}
              onPatch={patchLayer}
              onReorder={reorder}
              onDuplicate={duplicateLayer}
              onDelete={deleteLayer}
            />
          )}
        </div>
      </aside>

      {/* Centro */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 border-b border-white/10 flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={undo} title="Desfazer (Ctrl+Z)" className="px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 text-sm">↶</button>
            <button onClick={redo} title="Refazer (Ctrl+Shift+Z)" className="px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 text-sm">↷</button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <span className="text-[11px] text-white/40">Zoom</span>
            <input type="range" min={0.2} max={0.8} step={0.02} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-28 accent-[#FFB800]" />
            <span className="text-[11px] text-white/60 w-10">{Math.round(scale * 100)}%</span>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button onClick={() => setSnapEnabled((s) => !s)} title="Guias de alinhamento (snap ao arrastar)"
              className={`px-2.5 py-1.5 rounded text-xs font-bold transition ${snapEnabled ? 'bg-[#FFB800]/20 text-[#FFB800]' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
              ⊹ Guias
            </button>
            <button onClick={() => setGridOn((g) => !g)} title="Grade de colunas e linhas"
              className={`px-2.5 py-1.5 rounded text-xs font-bold transition ${gridOn ? 'bg-[#2DE2C8]/20 text-[#2DE2C8]' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
              ⊞ Grade
            </button>
            {gridOn && (
              <div className="flex items-center gap-1 text-[11px] text-white/50">
                <span>C</span>
                <input type="number" min={2} max={16} value={gridCols}
                  onChange={(e) => setGridCols(Math.max(2, Math.min(16, Number(e.target.value) || 2)))}
                  className="w-10 bg-white/5 rounded px-1 py-0.5 text-white text-center" />
                <span>×</span>
                <span>L</span>
                <input type="number" min={2} max={16} value={gridRows}
                  onChange={(e) => setGridRows(Math.max(2, Math.min(16, Number(e.target.value) || 2)))}
                  className="w-10 bg-white/5 rounded px-1 py-0.5 text-white text-center" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {status && <span className="text-xs text-white/60">{status}</span>}
            <button onClick={confirmSlide} disabled={!current} title="Confirma e salva este slide (não reseta ao trocar de slide)"
              className="text-xs border border-emerald-400/40 text-emerald-300 rounded-md px-4 py-2 hover:bg-emerald-400/10 disabled:opacity-30 transition">
              ✓ Confirmar slide
            </button>
            <button onClick={openGallery} disabled={!selectedId} title="Ver imagens já geradas deste criativo"
              className="text-xs border border-white/15 rounded-md px-4 py-2 hover:border-white/40 disabled:opacity-30">🖼 Gerados</button>
            <button onClick={save} className="text-xs border border-white/15 rounded-md px-4 py-2 hover:border-white/40">Salvar tudo</button>
            <button onClick={exportCreative} className="text-xs font-bold rounded-md px-4 py-2 bg-[#FFB800] text-black hover:bg-[#FFB800]/80 transition">Salvar e Exportar</button>
          </div>
        </div>

        {slides.length > 0 && (
          <div className="flex items-center gap-1.5 px-5 py-2 border-b border-white/10 overflow-x-auto shrink-0">
            {slides.map((sd, i) => (
              <div key={sd.slide_n} className="relative group/sl shrink-0">
                <button onClick={() => { setSlideIdx(i); setSelectedLayerId(null); }}
                  className={`pl-3 pr-2.5 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5 ${i === slideIdx ? 'bg-[#FFB800] text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                  <span>{i + 1}</span>
                  {sd.committed
                    ? <span title="Confirmado e salvo" className={i === slideIdx ? 'text-black/70' : 'text-emerald-400'}>✓</span>
                    : <span title="Edições não confirmadas" className={i === slideIdx ? 'text-black/50' : 'text-amber-400/80'}>•</span>}
                </button>
                {slides.length > 1 && (
                  <button onClick={() => deleteSlide(i)} title={`Excluir slide ${i + 1}`}
                    className="absolute -top-1.5 -right-1.5 h-4 w-4 grid place-items-center rounded-full bg-[#FF4D2E] text-white text-[11px] leading-none opacity-0 group-hover/sl:opacity-100 transition">
                    ×
                  </button>
                )}
              </div>
            ))}
            <button onClick={addSlide} title="Duplicar o slide atual como um novo slide"
              className="shrink-0 px-2.5 py-1.5 rounded text-xs font-bold bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition">
              + slide
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto flex items-center justify-center p-8">
          {current ? (
            <StudioCanvas
              layers={current.layers}
              background={current.background}
              palette={palette}
              scale={scale}
              selectedId={selectedLayerId}
              onSelect={setSelectedLayerId}
              onChange={patchLayer}
              snap={snapEnabled}
              grid={gridOn ? { cols: gridCols, rows: gridRows } : null}
            />
          ) : (
            <div className="text-white/30">Selecione um criativo para começar.</div>
          )}
        </div>
      </main>

      {/* Modal: imagens geradas (auditoria) */}
      {showGallery && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
          onMouseDown={() => setShowGallery(false)}>
          <div className="bg-[#0c0c16] border border-white/10 rounded-2xl max-w-5xl w-full max-h-[88vh] overflow-y-auto p-6"
            onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black uppercase tracking-wide">Imagens geradas</h2>
              <button onClick={() => setShowGallery(false)} className="text-white/40 hover:text-white text-2xl leading-none">×</button>
            </div>
            {runs.length === 0 && (
              <p className="text-sm text-white/40 py-10 text-center">
                Nenhuma imagem gerada para este criativo ainda. Use <span className="text-[#FFB800]">Salvar e Exportar</span> para renderizar.
              </p>
            )}
            {runs.map((run, ri) => (
              <div key={`${run.kind}-${run.creativeSlug}-${run.dir}`} className="mb-6">
                <div className="text-[11px] text-white/40 mb-2 flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white/70">{run.dir}</span>
                  <span>· {run.kind} · {run.slides.length} slide(s)</span>
                  {ri === 0 && <span className="px-1.5 py-0.5 rounded bg-[#FFB800]/20 text-[#FFB800] text-[10px] font-bold">MAIS RECENTE</span>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {run.slides.map((s) => (
                    <a key={s} href={`/api/renders/file?p=${encodeURIComponent(s)}`} target="_blank" rel="noreferrer"
                      title="Abrir em tamanho real"
                      className="block w-28 rounded-lg overflow-hidden border border-white/10 hover:border-[#FFB800]/60 transition">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/renders/file?p=${encodeURIComponent(s)}`} alt="" className="w-full h-auto block" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Direita */}
      <aside className="w-72 shrink-0 border-l border-white/10 p-4 overflow-y-auto">
        {current && (
          <>
            <div className="mb-3">
              <div className="text-[11px] font-black uppercase tracking-widest text-white/50 mb-2">Template</div>
              <select className={panelField} value={current.templateId} onChange={(e) => switchTemplate(e.target.value)}>
                {STUDIO_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <p className="text-[10px] text-white/30 mt-1">Trocar recalcula o layout mantendo o conteúdo.</p>
            </div>
            <Inspector
              layer={selectedLayer}
              background={current.background}
              onPatch={(patch) => selectedLayer && patchLayer(selectedLayer.id, patch)}
              onBackground={patchBackground}
              onUpload={uploadImage}
              showBackground
            />
          </>
        )}
      </aside>
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#0a0a12] text-white flex items-center justify-center text-white/40">Carregando Studio…</div>}>
      <StudioContent />
    </Suspense>
  );
}
