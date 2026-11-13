import React from 'react';
import { ModeledCarouselSlide } from './templates/ModeledCarouselSlide';
import { QuoteSlide } from './templates/QuoteSlide';
import { SinglePostSlide } from './templates/SinglePostSlide';
import { VideoHookOverlay } from './templates/VideoHookOverlay';
import { VideoBrandOverlay } from './templates/VideoBrandOverlay';
import { StepListSlide } from './templates/StepListSlide';
import { DataCardSlide } from './templates/DataCardSlide';
import { FounderDiarySlide } from './templates/FounderDiarySlide';
import { ProvocationHeroSlide } from './templates/ProvocationHeroSlide';
import { BenchmarkDerivedSlide } from './templates/BenchmarkDerivedSlide';
import { LayeredSlide } from './templates/LayeredSlide';
import { LayerView } from '../studio/LayerView';
import { canvasOf, sortedVisibleLayers, type Layer } from '@/lib/layers';
import {
  buildPreset, formatOfTemplate,
  type PresetContent, type PresetPalette, type PresetMeta,
} from '@/lib/templatePresets';

/**
 * Modo `preset` (MED-07): o `*design-creative` (auto) passa a renderizar pelos
 * MESMOS presets do Studio. Recebe { presetTemplate, content, palette, meta } e
 * constrói as camadas via `buildPreset` (fonte única) → `LayeredSlide`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PresetRender(props: any) {
  const presetTemplate: string = props.presetTemplate || 'carousel-slide';
  const content: PresetContent = props.content || {};
  const palette: PresetPalette = props.palette || {
    primary: '#0B0B0F', secondary: '#1A1A24', accent: '#FFB800',
    accentAlt: '#FF4D2E', accentAurora: '#FFD86B',
  };
  const meta: PresetMeta = props.meta || { slideNumber: 1, totalSlides: 1 };
  const { background, layers, format } = buildPreset(presetTemplate, content, palette, meta);
  return (
    <LayeredSlide
      layers={layers}
      background={background}
      format={format}
      primaryColor={palette.primary}
      secondaryColor={palette.secondary}
      accentColor={palette.accent}
      accentAlt={palette.accentAlt}
      accentAurora={palette.accentAurora}
    />
  );
}

/**
 * TemplateSwitch — fonte ÚNICA do mapeamento templateId → componente.
 * Usado tanto pelo /render (export Playwright) quanto pelo Creative Studio
 * (preview do template real como base do canvas). Garante que o Studio mostre
 * EXATAMENTE o template que será exportado (fim do desencontro seed↔template).
 *
 * `overlayLayers` (opcional) compõe camadas editáveis do Studio POR CIMA do
 * template — um único screenshot captura template + sobreposições.
 */
export interface TemplateProps {
  templateId?: string;
  overlayLayers?: Layer[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// Switch dinâmico: cada template tem props próprios — `any` é intencional aqui.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BaseTemplate(props: any) {
  switch (props.templateId) {
    case 'preset': return <PresetRender {...props} />;
    case 'video-hook': return <VideoHookOverlay {...props} />;
    case 'video-brand': return <VideoBrandOverlay {...props} />;
    case 'quote-slide': return <QuoteSlide {...props} />;
    case 'single-post': return <SinglePostSlide {...props} />;
    case 'tiago-step': return <StepListSlide {...props} />;
    case 'tiago-data': return <DataCardSlide {...props} />;
    case 'tiago-diary': return <FounderDiarySlide {...props} />;
    case 'tiago-provocation': return <ProvocationHeroSlide {...props} />;
    case 'benchmark-derived': return <BenchmarkDerivedSlide {...props} />;
    case 'layered': return <LayeredSlide {...props} />;
    case 'carousel-slide':
    default: return <ModeledCarouselSlide {...props} />;
  }
}

export function TemplateSwitch(props: TemplateProps) {
  const overlays = props.overlayLayers ?? [];
  if (!overlays.length) return <BaseTemplate {...props} />;
  // O wrapper de sobreposicoes precisa ter o tamanho do DOCUMENTO, nao 1080x1350
  // fixo: com o canvas por formato, uma thumb com overlays era recortada em
  // 1080x1350. `format` explicito ganha do inferido pelo template.
  const { w, h } = canvasOf(
    props.format ?? formatOfTemplate(props.presetTemplate ?? props.templateId),
  );
  return (
    <div className="relative" style={{ width: w, height: h }}>
      <BaseTemplate {...props} />
      <div className="absolute inset-0">
        {sortedVisibleLayers(overlays).map((l) => (
          <LayerView key={l.id} layer={l} />
        ))}
      </div>
    </div>
  );
}
