import React from 'react';
import { PremiumBackground } from '../molecules/PremiumBackground';
import { GrainOverlay as SharedGrainOverlay } from '../molecules/GrainOverlay';

/**
 * FounderDiarySlide — arquétipo "tiago-diary": carrossel polaroid-digital.
 * Foto raw bastidor em frame arredondado (NÃO full-bleed) + frase curta da
 * lição daquele momento + data. Grain sutil + vinheta simulam câmera de celular.
 *
 * Inspirado em "Photo dump" trend 2026 — mistura raw + polido gera 3× mais saves.
 * 1080x1350, paleta preto-âmbar (Tiago Elesbão), tipografia Outfit.
 */

export interface FounderDiarySlideProps {
  slideNumber: number;
  totalSlides: number;
  /** URL da foto raw. Aceita `mainObjectImage` (do orquestrador) como fallback. */
  photo?: string;
  /** Fallback do orquestrador genérico (Pexels/IA gravam aqui). */
  mainObjectImage?: string;
  /** Frase principal da lição/observação. Aceita `headline` como fallback. */
  caption?: string;
  /** Fallback do orquestrador (recast_engine grava em headline). */
  headline?: string;
  /** Etiqueta de data (ex.: "23/05 · bastidor da reunião"). */
  dateLabel?: string;
  accentColor?: string;
  handle?: string;

  /** Override do enquadramento. */
  imageZoom?: number;
  imagePosX?: number;
  imagePosY?: number;
  /** Intensidade do grain (overlay de noise). */
  grainIntensity?: 'none' | 'subtle' | 'strong';

  captionFontSize?: number;
  textMetrics?: Record<string, unknown>;
  /** Brand-agnostic palette (MKT-MC4-05). */
  primaryColor?: string;
  secondaryColor?: string;
  accentAlt?: string;
  accentAurora?: string;
  /** Compat. */
  signatureHandle?: string;
  footerText?: string;
}

const captionSize = (text: string) => {
  const len = (text || '').length;
  if (len < 40) return 'text-[52px]';
  if (len < 80) return 'text-[44px]';
  if (len < 140) return 'text-[36px]';
  return 'text-[30px]';
};

const Signature: React.FC<{ handle: string; accent: string }> = ({ handle, accent }) => (
  <span
    className="font-bold tracking-[0.18em] uppercase text-[14px]"
    style={{
      color: accent,
      opacity: 0.85,
      fontFamily: 'var(--font-geist-mono), monospace',
    }}
  >
    {handle}
  </span>
);

/**
 * MCI-V2-04: Local grain wrapper que delega ao SharedGrainOverlay (V2-01 spec).
 * Mantém a interface `intensity` para back-compat com instâncias existentes.
 */
const GrainOverlay: React.FC<{ intensity: 'none' | 'subtle' | 'strong' }> = ({ intensity }) => {
  if (intensity === 'none') return null;
  const opacity = intensity === 'strong' ? 0.18 : 0.08;
  return <SharedGrainOverlay opacity={opacity} blendMode="overlay" />;
};

export const FounderDiarySlide: React.FC<FounderDiarySlideProps> = ({
  slideNumber,
  totalSlides,
  photo,
  mainObjectImage,
  caption,
  headline,
  dateLabel,
  accentColor = '#FFB800',
  handle = '@tiagoelesbao',
  imageZoom,
  imagePosX,
  imagePosY,
  grainIntensity = 'subtle',
  captionFontSize,
  primaryColor,
  secondaryColor,
  accentAlt,
  accentAurora,
}) => {
  // Resolve fontes finais (fallback do orquestrador genérico)
  const finalPhoto = photo || mainObjectImage || '';
  const finalCaption = caption || headline || '';
  const cStyle = captionFontSize ? { fontSize: `${captionFontSize}px` } : undefined;
  const imgStyle: React.CSSProperties = {
    objectPosition: `${imagePosX ?? 50}% ${imagePosY ?? 50}%`,
    transform: imageZoom && imageZoom !== 1 ? `scale(${imageZoom})` : undefined,
  };

  return (
    <div className="relative w-[1080px] h-[1350px] overflow-hidden flex flex-col font-sans bg-[#0B0B0F] text-white">
      <PremiumBackground
        theme="dark"
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        accentColor={accentColor}
        accentAlt={accentAlt}
        accentAurora={accentAurora}
      />
      <div
        className="absolute -top-[14%] -left-[12%] w-[460px] h-[460px] rounded-full blur-[170px] opacity-20 z-0"
        style={{ backgroundColor: accentColor }}
      />

      {/* Header — slide counter (Geist Mono · MCI-V2-04) */}
      <div className="relative z-10 flex items-center justify-between px-[60px] pt-[60px]">
        <span
          className="text-[12px] font-bold tracking-[0.42em] uppercase"
          style={{
            color: accentColor,
            opacity: 0.85,
            fontFamily: 'var(--font-geist-mono), monospace',
          }}
        >
          Diário do founder
        </span>
        <span
          className="text-[14px] text-white/40 tracking-[0.18em] font-bold"
          style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
        >
          {String(slideNumber).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}
        </span>
      </div>

      {/* Polaroid digital — foto com frame arredondado, grain + vinheta */}
      <div className="relative z-10 px-[80px] mt-12">
        <div className="relative w-full aspect-[4/5] rounded-[28px] overflow-hidden border border-white/15 shadow-2xl shadow-black/70">
          {finalPhoto && <img src={finalPhoto} alt="" className="w-full h-full object-cover" style={imgStyle} />}

          {/* Vinheta nas bordas (radial gradient escurecendo as quinas) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.65) 100%)',
            }}
          />

          {/* Grain analógico */}
          <GrainOverlay intensity={grainIntensity} />
        </div>
      </div>

      {/* Caption + data */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-[80px] pb-[40px]">
        <h2
          className={`${captionSize(finalCaption)} font-bold leading-[1.18] tracking-tight text-white max-w-[920px]`}
          style={cStyle}
        >
          {finalCaption}
        </h2>
        {dateLabel && (
          <div className="flex items-center gap-3 mt-6">
            <div
              className="h-[2px] w-8 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
            <span
              className="text-[16px] font-semibold tracking-[0.18em] uppercase"
              style={{
                color: accentColor,
                opacity: 0.85,
                fontFamily: 'var(--font-geist-mono), monospace',
              }}
            >
              {dateLabel}
            </span>
          </div>
        )}
      </div>

      {/* Footer — assinatura */}
      <div className="absolute bottom-[40px] right-[60px] z-20">
        <Signature handle={handle} accent={accentColor} />
      </div>
    </div>
  );
};
