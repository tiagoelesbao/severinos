import React from 'react';
import type { Layer, SlideBackground } from '@/lib/layers';
import {
  Field, NumberField, Slider, ColorField, Segmented, ToggleChip, panelField,
} from './controls';

const FONTS = [
  { v: 'Outfit, system-ui, sans-serif', n: 'Outfit' },
  { v: 'Georgia, serif', n: 'Georgia' },
  { v: '"Courier New", monospace', n: 'Mono' },
  { v: 'Impact, sans-serif', n: 'Impact' },
  { v: 'system-ui, sans-serif', n: 'System' },
];

const WEIGHTS = [300, 400, 500, 600, 700, 800, 900];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-white/10 pt-3 mt-3 first:border-0 first:pt-0 first:mt-0">
      <div className="text-[11px] font-black uppercase tracking-widest text-white/50 mb-2">{title}</div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

export function Inspector({
  layer,
  background,
  onPatch,
  onBackground,
  onUpload,
  showBackground = true,
}: {
  layer: Layer | null;
  background: SlideBackground;
  onPatch: (patch: Partial<Layer>) => void;
  onBackground: (patch: Partial<SlideBackground>) => void;
  onUpload: (file: File) => Promise<string | null>;
  showBackground?: boolean;
}) {
  const upload = async (e: React.ChangeEvent<HTMLInputElement>, apply: (url: string) => void) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = await onUpload(f);
    if (url) apply(url);
  };

  return (
    <div className="flex flex-col">
      {/* ── Fundo do slide (opcional — oculto quando o template controla o fundo) ── */}
      {showBackground && (
        <Section title="Fundo do slide">
          <Segmented
            value={background.type}
            onChange={(v) => onBackground({ type: v })}
            options={[
              { value: 'brand', label: 'Marca' },
              { value: 'solid', label: 'Sólido' },
              { value: 'image', label: 'Imagem' },
            ]}
          />
          {background.type === 'brand' && (
            <Field label="Atmosfera (mood)">
              <select
                className={panelField}
                value={background.mood || 'editorial'}
                onChange={(e) => onBackground({ mood: e.target.value as NonNullable<SlideBackground['mood']> })}
              >
                <option value="editorial">Editorial (notícia)</option>
                <option value="data">Data (insight)</option>
                <option value="technical">Técnico (didático)</option>
                <option value="cinematic">Cinemático (inspiracional)</option>
                <option value="diary">Diário (bastidor)</option>
              </select>
            </Field>
          )}
          {background.type === 'solid' && (
            <ColorField label="Cor" value={background.color || '#0B0B0F'}
              onChange={(v) => onBackground({ color: v })} />
          )}
          {background.type === 'image' && (
            <>
              <label className="text-xs border border-white/15 rounded-md px-3 py-2 cursor-pointer hover:border-white/40 text-center block">
                {background.image ? 'Trocar imagem de fundo' : 'Enviar imagem de fundo'}
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => upload(e, (url) => onBackground({ image: url }))} />
              </label>
              {background.image && (
                <>
                  <Slider label="Zoom" value={background.imageZoom ?? 1} min={1} max={2.5} step={0.05} suffix="x"
                    onChange={(v) => onBackground({ imageZoom: v })} />
                  <Slider label="Posição X" value={background.imagePosX ?? 50} min={0} max={100} step={1} suffix="%"
                    onChange={(v) => onBackground({ imagePosX: v })} />
                  <Slider label="Posição Y" value={background.imagePosY ?? 50} min={0} max={100} step={1} suffix="%"
                    onChange={(v) => onBackground({ imagePosY: v })} />
                  <Field label="Atmosfera sobre a imagem">
                    <select
                      className={panelField}
                      value={background.overlayMood || 'none'}
                      onChange={(e) => onBackground({ overlayMood: e.target.value as NonNullable<SlideBackground['overlayMood']> })}
                    >
                      <option value="none">Nenhuma (imagem pura)</option>
                      <option value="editorial">Editorial (notícia)</option>
                      <option value="data">Data (insight)</option>
                      <option value="technical">Técnico (didático)</option>
                      <option value="cinematic">Cinemático (inspiracional)</option>
                      <option value="diary">Diário (bastidor)</option>
                    </select>
                  </Field>
                  {background.overlayMood && background.overlayMood !== 'none' && (
                    <Slider label="Intensidade da atmosfera" value={Math.round((background.overlayStrength ?? 0.65) * 100)}
                      min={10} max={100} step={5} suffix="%"
                      onChange={(v) => onBackground({ overlayStrength: v / 100 })} />
                  )}
                </>
              )}
            </>
          )}
        </Section>
      )}

      {!layer && (
        <p className="text-xs text-white/30 py-6 text-center">
          Selecione uma sobreposição para editar, ou adicione objetos pelo painel de camadas.
        </p>
      )}

      {layer && (
        <>
          {/* ── Transform comum ── */}
          <Section title={`Transform · ${layer.name}`}>
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="X" value={layer.x} onChange={(v) => onPatch({ x: v })} />
              <NumberField label="Y" value={layer.y} onChange={(v) => onPatch({ y: v })} />
              <NumberField label="Largura" value={layer.w} min={1} onChange={(v) => onPatch({ w: v })} />
              <NumberField label="Altura" value={layer.h} min={1} onChange={(v) => onPatch({ h: v })} />
            </div>
            <Slider label="Rotação" value={layer.rotation} min={-180} max={180} step={1} suffix="°"
              onChange={(v) => onPatch({ rotation: v })} />
            <Slider label="Opacidade" value={Math.round(layer.opacity * 100)} min={0} max={100} step={1} suffix="%"
              onChange={(v) => onPatch({ opacity: v / 100 })} />
          </Section>

          {/* ── Texto ── */}
          {layer.type === 'text' && (
            <Section title="Texto">
              <Field label="Conteúdo">
                <textarea className={`${panelField} resize-none`} rows={3}
                  value={layer.content} onChange={(e) => onPatch({ content: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Fonte">
                  <select className={panelField} value={layer.fontFamily}
                    onChange={(e) => onPatch({ fontFamily: e.target.value })}>
                    {FONTS.map((f) => <option key={f.v} value={f.v}>{f.n}</option>)}
                  </select>
                </Field>
                <Field label="Peso">
                  <select className={panelField} value={layer.fontWeight}
                    onChange={(e) => onPatch({ fontWeight: Number(e.target.value) })}>
                    {WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </Field>
              </div>
              <Slider label="Tamanho" value={layer.fontSize} min={10} max={260} step={1} suffix="px"
                onChange={(v) => onPatch({ fontSize: v })} />
              <ColorField label="Cor" value={layer.color} onChange={(v) => onPatch({ color: v })} />
              <Segmented
                value={layer.align}
                onChange={(v) => onPatch({ align: v })}
                options={[
                  { value: 'left', label: '⯇' }, { value: 'center', label: '≡' }, { value: 'right', label: '⯈' },
                ]}
              />
              <div className="grid grid-cols-2 gap-2">
                <Slider label="Entrelinha" value={layer.lineHeight} min={0.8} max={2} step={0.05}
                  onChange={(v) => onPatch({ lineHeight: v })} />
                <Slider label="Espaçamento" value={layer.letterSpacing} min={-5} max={20} step={0.5} suffix="px"
                  onChange={(v) => onPatch({ letterSpacing: v })} />
              </div>
              <div className="flex gap-2">
                <ToggleChip active={!!layer.uppercase} onClick={() => onPatch({ uppercase: !layer.uppercase })} title="Maiúsculas">AA</ToggleChip>
                <ToggleChip active={!!layer.italic} onClick={() => onPatch({ italic: !layer.italic })} title="Itálico"><span className="italic">I</span></ToggleChip>
                <ToggleChip active={!!layer.shadow} onClick={() => onPatch({ shadow: !layer.shadow })} title="Sombra">S</ToggleChip>
              </div>
            </Section>
          )}

          {/* ── Imagem ── */}
          {layer.type === 'image' && (
            <Section title="Imagem">
              <label className="text-xs border border-white/15 rounded-md px-3 py-2 cursor-pointer hover:border-white/40 text-center">
                {layer.src ? 'Trocar imagem' : 'Enviar imagem'}
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => upload(e, (url) => onPatch({ src: url }))} />
              </label>
              <Field label="Buscar no Pexels">
                <div className="flex gap-1.5">
                  <input className={`${panelField} flex-1`} value={layer.query || ''}
                    placeholder="ex.: soccer stadium"
                    onChange={(e) => onPatch({ query: e.target.value })} />
                  <button
                    onClick={async () => {
                      const q = (layer.query || '').trim();
                      if (!q) return;
                      try {
                        const r = await fetch(`/api/pexels?q=${encodeURIComponent(q)}&orientation=portrait`);
                        const d = await r.json();
                        if (d?.url) onPatch({ src: d.url });
                      } catch { /* ignora */ }
                    }}
                    title="Buscar foto no Pexels"
                    className="shrink-0 text-xs px-3 rounded-md bg-[#FFB800] text-black font-bold hover:bg-[#FFB800]/80">
                    🔍
                  </button>
                </div>
              </Field>
              <Segmented
                value={layer.objectFit}
                onChange={(v) => onPatch({ objectFit: v })}
                options={[{ value: 'cover', label: 'Cobrir' }, { value: 'contain', label: 'Conter' }]}
              />
              <Field label="Moldura (frame premium)">
                <Segmented
                  value={layer.frame || 'none'}
                  onChange={(v) => onPatch({ frame: v })}
                  options={[{ value: 'none', label: 'Nenhuma' }, { value: 'card', label: 'Card' }]}
                />
              </Field>
              {layer.frame === 'card' && (
                <ColorField label="Cor da moldura" value={layer.frameAccent || '#FFB800'}
                  onChange={(v) => onPatch({ frameAccent: v })} />
              )}
              <Slider label="Cantos" value={layer.radius} min={0} max={400} step={2} suffix="px"
                onChange={(v) => onPatch({ radius: v })} />
              <Slider label="Brilho" value={layer.brightness} min={0} max={200} step={1} suffix="%"
                onChange={(v) => onPatch({ brightness: v })} />
              <Slider label="Contraste" value={layer.contrast} min={0} max={200} step={1} suffix="%"
                onChange={(v) => onPatch({ contrast: v })} />
              <Slider label="Saturação" value={layer.saturate} min={0} max={300} step={1} suffix="%"
                onChange={(v) => onPatch({ saturate: v })} />
              <Slider label="Desfoque" value={layer.blur} min={0} max={40} step={0.5} suffix="px"
                onChange={(v) => onPatch({ blur: v })} />
              <div className="flex gap-2">
                <ToggleChip active={!!layer.flipX} onClick={() => onPatch({ flipX: !layer.flipX })} title="Espelhar horizontal">⇋ H</ToggleChip>
                <ToggleChip active={!!layer.flipY} onClick={() => onPatch({ flipY: !layer.flipY })} title="Espelhar vertical">⇵ V</ToggleChip>
              </div>
            </Section>
          )}

          {/* ── Forma ── */}
          {layer.type === 'shape' && (
            <Section title="Forma">
              <Segmented
                value={layer.kind}
                onChange={(v) => onPatch({ kind: v })}
                options={[
                  { value: 'rect', label: 'Retângulo' },
                  { value: 'ellipse', label: 'Elipse' },
                  { value: 'line', label: 'Linha' },
                ]}
              />
              <ColorField label="Preenchimento" value={layer.fill} onChange={(v) => onPatch({ fill: v })} />
              <ColorField label="Borda" value={layer.stroke} onChange={(v) => onPatch({ stroke: v })} />
              <Slider label="Espessura da borda" value={layer.strokeWidth} min={0} max={40} step={1} suffix="px"
                onChange={(v) => onPatch({ strokeWidth: v })} />
              {layer.kind === 'rect' && (
                <Slider label="Cantos" value={layer.radius} min={0} max={400} step={2} suffix="px"
                  onChange={(v) => onPatch({ radius: v })} />
              )}
            </Section>
          )}
        </>
      )}
    </div>
  );
}
