'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ModeledCarouselSlide } from '@/components/design-system/templates/ModeledCarouselSlide';
import { QuoteSlide } from '@/components/design-system/templates/QuoteSlide';
import { SinglePostSlide } from '@/components/design-system/templates/SinglePostSlide';

interface BriefClient {
  slug: string;
  display: string;
  handle?: string;
}

interface BriefListItem {
  id: string;
  archetype: string;
  slideCount: number;
  theme: string;
  client: BriefClient;
}

interface ClientTab {
  slug: string;
  display: string;
  handle?: string;
  count: number;
}

/** Brand props derivados do brief (paleta + signature) repassados ao preview. */
interface BrandPreviewProps {
  signatureHandle?: string;
  footerText?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentAlt?: string;
  accentAurora?: string;
}

interface EditableSlide {
  slide_n: number;
  source_slide_n: number;
  variant?: string;
  headline: string;
  sub_headline: string;
  body_text: string;
  accent_color: string;
  headlineFontSize: number | null;
  bodyFontSize: number | null;
  mainObjectImage: string | null;
  imageZoom: number;
  imagePosX: number;
  imagePosY: number;
}

// Formato vertical 4:5 (1080x1350) — alinhado à grade do Instagram.
const PREVIEW_SCALE = 0.42;
const PREVIEW_WIDTH = Math.round(1080 * PREVIEW_SCALE);
const PREVIEW_HEIGHT = Math.round(1350 * PREVIEW_SCALE);

function pickTemplate(archetype: string, total: number): 'quote' | 'single' | 'news' {
  if (archetype === 'quote') return 'quote';
  if (total === 1) return 'single';
  return 'news';
}

function SlidePreview({
  slide, displayN, total, archetype, brand,
}: {
  slide: EditableSlide;
  displayN: number;
  total: number;
  archetype: string;
  brand: BrandPreviewProps;
}) {
  const props = {
    slideNumber: displayN,
    totalSlides: total,
    variant: (slide.variant as 'HOOK' | 'CONTENT' | 'IMAGE_FOCUS' | 'CTA') ?? 'CONTENT',
    headline: slide.headline,
    subHeadline: slide.sub_headline,
    bodyText: slide.body_text,
    accentColor: slide.accent_color,
    headlineFontSize: slide.headlineFontSize ?? undefined,
    bodyFontSize: slide.bodyFontSize ?? undefined,
    mainObjectImage: slide.mainObjectImage ?? undefined,
    imageZoom: slide.imageZoom,
    imagePosX: slide.imagePosX,
    imagePosY: slide.imagePosY,
    // Brand-agnostic props (MKT-MC4-04 + MC4-05) — preview reflete o cliente.
    ...brand,
  };
  const tpl = pickTemplate(archetype, total);
  const node =
    tpl === 'quote' ? <QuoteSlide {...props} />
      : tpl === 'single' ? <SinglePostSlide {...props} />
        : <ModeledCarouselSlide {...props} />;

  return (
    <div
      className="rounded-xl overflow-hidden border border-white/10 shrink-0"
      style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
    >
      <div
        style={{
          width: 1080, height: 1350,
          transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left',
        }}
      >
        {node}
      </div>
    </div>
  );
}

function FontControl({
  label, value, autoDefault, min, max, onChange,
}: {
  label: string; value: number | null; autoDefault: number;
  min: number; max: number; onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-center text-[11px] text-white/50 mb-1">
        <span>{label}</span>
        <span className="flex items-center gap-2">
          <span className="text-white/70">{value ? `${value}px` : 'Auto'}</span>
          {value !== null && (
            <button onClick={() => onChange(null)} className="text-[#FF3D68] hover:underline">
              auto
            </button>
          )}
        </span>
      </div>
      <input
        type="range" min={min} max={max} value={value ?? autoDefault}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#FF3D68]"
      />
    </div>
  );
}

function Slider({
  label, value, min, max, step, suffix, onChange,
}: {
  label: string; value: number; min: number; max: number;
  step: number; suffix: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-[11px] text-white/50 mb-1">
        <span>{label}</span>
        <span className="text-white/70">{value}{suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#FF3D68]"
      />
    </div>
  );
}

const fieldCls =
  'w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm '
  + 'text-white focus:border-[#FF3D68] outline-none';

function EditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeClient = searchParams.get('client');

  const [briefs, setBriefs] = useState<BriefListItem[]>([]);
  const [clients, setClients] = useState<ClientTab[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [archetype, setArchetype] = useState('news');
  const [theme, setTheme] = useState('');
  const [slides, setSlides] = useState<EditableSlide[]>([]);
  const [brandPreview, setBrandPreview] = useState<BrandPreviewProps>({});
  const [loading, setLoading] = useState(false);
  const [exportStatus, setExportStatus] = useState('');

  // Sem cliente selecionado → volta para a tela de seleção.
  useEffect(() => {
    if (!activeClient) {
      router.replace('/');
    }
  }, [activeClient, router]);

  const loadBriefs = useCallback(() => {
    if (!activeClient) return;
    fetch(`/api/briefs?client=${encodeURIComponent(activeClient)}`)
      .then((r) => r.json())
      .then((d) => {
        setBriefs(d.briefs ?? []);
        setClients(d.clients ?? []);
      })
      .catch(() => {
        setBriefs([]);
        setClients([]);
      });
  }, [activeClient]);

  const currentClient = clients.find((c) => c.slug === activeClient);
  const currentClientDisplay = currentClient?.display || activeClient || '';

  useEffect(() => {
    loadBriefs();
  }, [loadBriefs]);

  const deleteBrief = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm(`Deseja realmente remover o criativo "${label(id)}"?`)) return;
    
    try {
      const res = await fetch(`/api/briefs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedId === id) setSelectedId(null);
        loadBriefs();
      }
    } catch {
      alert('Falha ao deletar criativo');
    }
  };

  const loadBrief = useCallback((id: string) => {
    setLoading(true);
    fetch(`/api/briefs/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setArchetype(d.archetype ?? 'news');
        setTheme(d.central_theme ?? '');

        // Brand-agnostic preview (MKT-MC4-04 + MC4-05 + MC5-04)
        // Reflete no editor a mesma identidade visual que o orquestrador injeta no render.
        const clientSlug = (d.client_slug as string) || 'virals';
        const tabClient = (d.client_slug && clients.find((c) => c.slug === clientSlug)) || null;
        const handle = tabClient?.handle || '';
        const palette = (d.brand_tokens as Record<string, unknown> | undefined)?.palette as
          Record<string, string> | undefined;
        const passPalette = clientSlug !== 'virals' && Boolean(palette);
        setBrandPreview({
          signatureHandle: clientSlug === 'virals' ? '' : handle,
          footerText: clientSlug === 'virals' ? 'Virals Intelligence Engine' : '',
          primaryColor:   passPalette ? palette?.primary       : undefined,
          secondaryColor: passPalette ? palette?.secondary     : undefined,
          accentAlt:      passPalette ? palette?.accent_alt    : undefined,
          accentAurora:   passPalette ? palette?.accent_aurora : undefined,
        });

        setSlides(
          (d.content_data ?? []).map((s: Record<string, unknown>) => ({
            slide_n: s.slide_n as number,
            source_slide_n: (s.source_slide_n as number) ?? (s.slide_n as number),
            variant: s.variant as string | undefined,
            headline: (s.headline as string) ?? '',
            sub_headline: (s.sub_headline as string) ?? '',
            body_text: (s.body_text as string) ?? '',
            accent_color: (s.accent_color as string) ?? '#FF3D68',
            headlineFontSize: null,
            bodyFontSize: null,
            mainObjectImage: null,
            imageZoom: 1,
            imagePosX: 50,
            imagePosY: 50,
          })),
        );
      })
      .catch(() => setSlides([]))
      .finally(() => setLoading(false));
  }, [clients]);

  useEffect(() => {
    if (selectedId) loadBrief(selectedId);
  }, [selectedId, loadBrief]);

  const updateSlide = (n: number, patch: Partial<EditableSlide>) =>
    setSlides((prev) => prev.map((s) => (s.slide_n === n ? { ...s, ...patch } : s)));

  const removeSlide = (n: number, displayN: number) => {
    if (slides.length <= 1) {
      alert('O criativo precisa ter ao menos 1 slide.');
      return;
    }
    if (
      !confirm(
        `Remover o slide ${displayN} deste carrossel?\n\n`
          + 'A remoção será persistida no brief quando você clicar em "Salvar e Exportar". '
          + 'Para restaurar todos os slides originais, rode o pipeline a partir do benchmark.',
      )
    ) {
      return;
    }
    setSlides((prev) => prev.filter((s) => s.slide_n !== n));
  };

  const handleUpload = async (n: number, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) updateSlide(n, { mainObjectImage: data.url });
    } catch {
      /* upload falhou — silencioso */
    }
  };

  const handleExport = async () => {
    if (!selectedId) return;
    setExportStatus('Salvando edição…');
    try {
      await fetch(`/api/briefs/${selectedId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides }),
      });
      setExportStatus('Renderizando… (pode levar alguns minutos)');
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedId }),
      });
      const data = await res.json();
      setExportStatus(
        data.ok ? '✓ Exportado — veja outputs/carousels/' : '✗ Falha no export',
      );
    } catch {
      setExportStatus('✗ Erro ao exportar');
    }
  };

  const label = (id: string) => id.replace(/^brief-v5-?/, '');

  // O cliente da URL já é filtrado pela API; mas mantemos guard local também.
  const visibleBriefs = briefs.filter((b) => !activeClient || b.client?.slug === activeClient);

  // Enquanto o redirect para / não dispara, evita flash
  if (!activeClient) {
    return (
      <div className="h-screen bg-[#0a0a12] text-white flex items-center justify-center text-white/40">
        Redirecionando para a seleção de cliente…
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0a0a12] text-white flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 shrink-0 border-r border-white/10 p-6 overflow-y-auto">
        {/* Botão de voltar para seleção de cliente */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-[11px] text-white/50 hover:text-white transition mb-5 group"
          title="Voltar para a seleção de cliente"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span className="uppercase tracking-wider font-bold">Trocar cliente</span>
        </button>

        <h1 className="text-lg font-black uppercase tracking-wide">Editor de Criativos</h1>
        <p className="text-xs text-white/40 mb-2">
          <span className="text-[#FF3D68]">{currentClientDisplay}</span> · {visibleBriefs.length} criativo{visibleBriefs.length === 1 ? '' : 's'}
        </p>
        <a
          href={`/studio?client=${activeClient}`}
          className="inline-block text-[11px] text-[#FFB800] hover:underline mb-5"
          title="Abrir o editor avançado de camadas"
        >
          ✨ Abrir no Creative Studio (camadas)
        </a>

        <div className="flex flex-col gap-2">
          {visibleBriefs.map((b) => (
            <div key={b.id} className="group relative">
              <button
                onClick={() => setSelectedId(b.id)}
                className={`w-full text-left rounded-lg px-4 py-3 border transition pr-10 ${
                  selectedId === b.id
                    ? 'border-[#FF3D68] bg-[#FF3D68]/10'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <div className="text-sm font-bold truncate">{label(b.id)}</div>
                <div className="text-[11px] text-white/40 mt-1">
                  {b.archetype} · {b.slideCount} slide(s)
                </div>
              </button>
              <button
                onClick={(e) => deleteBrief(e, b.id)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/20 hover:text-[#FF3D68] transition opacity-0 group-hover:opacity-100"
                title="Deletar criativo"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                </svg>
              </button>
            </div>
          ))}
          {visibleBriefs.length === 0 && (
            <p className="text-xs text-white/30">
              Nenhum criativo do cliente {currentClientDisplay} encontrado.
            </p>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-y-auto">
        {!selectedId && (
          <div className="h-full flex items-center justify-center text-white/30">
            Selecione um criativo na lateral.
          </div>
        )}
        {loading && <div className="text-white/40">Carregando…</div>}
        {selectedId && !loading && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black uppercase">{label(selectedId)}</h2>
                <p className="text-sm text-white/50 mt-1">
                  Arquétipo: <span className="text-white/80">{archetype}</span>
                  {theme && <> · Tema: <span className="text-white/80">{theme}</span></>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {exportStatus && (
                  <span className="text-xs text-white/60">{exportStatus}</span>
                )}
                <button
                  onClick={() => loadBrief(selectedId)}
                  className="text-xs border border-white/15 rounded-md px-4 py-2 hover:border-white/40"
                >
                  ↺ Restaurar
                </button>
                <button
                  onClick={handleExport}
                  className="text-xs font-bold rounded-md px-4 py-2 bg-[#FF3D68] hover:bg-[#FF3D68]/80 transition"
                >
                  Salvar e Exportar
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              {slides.map((s, idx) => (
                <div
                  key={s.slide_n}
                  className="flex gap-6 items-start border border-white/10 rounded-2xl p-5 bg-white/[0.02]"
                >
                  {/* Controles */}
                  <div className="flex-1 flex flex-col gap-3 max-w-md">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-widest text-white/40">
                        Slide {idx + 1}
                        {s.source_slide_n !== idx + 1 && (
                          <span className="ml-2 text-white/20 font-medium normal-case tracking-normal">
                            (origem #{s.source_slide_n})
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => removeSlide(s.slide_n, idx + 1)}
                        disabled={slides.length <= 1}
                        title={
                          slides.length <= 1
                            ? 'Não é possível remover o único slide'
                            : 'Remover este slide do carrossel'
                        }
                        className="flex items-center gap-1 text-[11px] text-white/40 hover:text-[#FF3D68] disabled:opacity-30 disabled:hover:text-white/40 disabled:cursor-not-allowed transition"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                        </svg>
                        <span>Remover slide</span>
                      </button>
                    </div>
                    <div>
                      <label className="text-[11px] text-white/50">Kicker</label>
                      <input
                        className={fieldCls}
                        value={s.sub_headline}
                        onChange={(e) => updateSlide(s.slide_n, { sub_headline: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-white/50">Headline</label>
                      <textarea
                        className={`${fieldCls} resize-none`}
                        rows={2}
                        value={s.headline}
                        onChange={(e) => updateSlide(s.slide_n, { headline: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-white/50">Body</label>
                      <textarea
                        className={`${fieldCls} resize-none`}
                        rows={3}
                        value={s.body_text}
                        onChange={(e) => updateSlide(s.slide_n, { body_text: e.target.value })}
                      />
                    </div>
                    <FontControl
                      label="Fonte do título"
                      value={s.headlineFontSize}
                      autoDefault={60}
                      min={28}
                      max={130}
                      onChange={(v) => updateSlide(s.slide_n, { headlineFontSize: v })}
                    />
                    <FontControl
                      label="Fonte do corpo"
                      value={s.bodyFontSize}
                      autoDefault={26}
                      min={14}
                      max={48}
                      onChange={(v) => updateSlide(s.slide_n, { bodyFontSize: v })}
                    />

                    {/* Imagem */}
                    <div className="pt-2 border-t border-white/10">
                      <div className="flex items-center gap-3 mt-2">
                        <label className="text-xs border border-white/15 rounded-md px-3 py-2 cursor-pointer hover:border-white/40">
                          {s.mainObjectImage ? 'Trocar imagem' : 'Enviar imagem'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUpload(s.slide_n, f);
                            }}
                          />
                        </label>
                        {s.mainObjectImage && (
                          <button
                            onClick={() => updateSlide(s.slide_n, { mainObjectImage: null })}
                            className="text-xs text-white/50 hover:text-white"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                      {s.mainObjectImage && (
                        <div className="flex flex-col gap-2 mt-3">
                          <Slider
                            label="Zoom da imagem" value={s.imageZoom}
                            min={1} max={2.5} step={0.05} suffix="x"
                            onChange={(v) => updateSlide(s.slide_n, { imageZoom: v })}
                          />
                          <Slider
                            label="Posição horizontal" value={s.imagePosX}
                            min={0} max={100} step={1} suffix="%"
                            onChange={(v) => updateSlide(s.slide_n, { imagePosX: v })}
                          />
                          <Slider
                            label="Posição vertical" value={s.imagePosY}
                            min={0} max={100} step={1} suffix="%"
                            onChange={(v) => updateSlide(s.slide_n, { imagePosY: v })}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preview reativo */}
                  <SlidePreview
                    slide={s}
                    displayN={idx + 1}
                    total={slides.length}
                    archetype={archetype}
                    brand={brandPreview}
                  />
                </div>
              ))}
            </div>
            {slides.length === 0 && <p className="text-white/30">Brief sem slides.</p>}
          </>
        )}
      </main>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-[#0a0a12] text-white flex items-center justify-center text-white/40">
          Carregando editor…
        </div>
      }
    >
      <EditorContent />
    </Suspense>
  );
}
