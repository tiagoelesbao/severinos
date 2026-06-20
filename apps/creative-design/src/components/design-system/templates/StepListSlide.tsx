import React from 'react';
import { PremiumBackground } from '../molecules/PremiumBackground';
import { GrainOverlay } from '../molecules/GrainOverlay';

/**
 * StepListSlide V2 — arquétipo "tiago-step": carrossel numerado estilo Hormozi.
 * Spec: design-system-v2.md (TIAGO-V2-01) · Implementação: TIAGO-V2-03.
 *
 * 3 variants:
 *   - HOOK       : 3 zonas (foto color-graded 50% / headline 35% / body 15%)
 *                  com kicker badge no TOPO (não mais "tudo no rodapé")
 *   - STEP       : número GIGANTE (Geist Mono 240px) + separador 3-níveis +
 *                  dots de progresso (substituem "1 / 4" linear)
 *   - CTA_THINK  : quote marks decorativos + headline em accent_alt (URGÊNCIA)
 *                  + underline gradient
 *
 * Tudo com GrainOverlay (textura sutil 2026). 1080x1350.
 *
 * Compat: aceita variants do brief legado (HOOK/CONTENT/IMAGE_FOCUS/CTA).
 * `designVersion='v1'` resgata o layout antigo (rollback emergencial).
 */

const ALARM_RE = /\b(perdido|errado|atraso|morto|quebrei|fracassei|matei|destru[íi])\b/i;
const ACCENT_ALT_DEFAULT = '#FF4D2E';

export interface StepListSlideProps {
  slideNumber: number;
  totalSlides: number;
  variant?: 'HOOK' | 'STEP' | 'CTA_THINK' | 'CONTENT' | 'IMAGE_FOCUS' | 'CTA';
  stepNumber?: number;
  headline: string;
  bodyText?: string;
  backgroundImage?: string;
  mainObjectImage?: string;
  accentColor?: string;
  accentAlt?: string;
  handle?: string;
  headlineFontSize?: number;
  bodyFontSize?: number;
  imageZoom?: number;
  imagePosX?: number;
  imagePosY?: number;
  textMetrics?: Record<string, unknown>;
  primaryColor?: string;
  secondaryColor?: string;
  accentAurora?: string;
  signatureHandle?: string;
  footerText?: string;
  /** V1 = layout legado (rollback). V2 = default (spec atual). */
  designVersion?: 'v1' | 'v2';
}

// ── Escala tipográfica ────────────────────────────────────────────────────────
const headlineSize = (text: string, ctx: 'hook' | 'step' | 'cta') => {
  const len = (text || '').length;
  if (ctx === 'hook') {
    if (len < 30) return 'text-[110px]';
    if (len < 55) return 'text-[88px]';
    if (len < 85) return 'text-[66px]';
    return 'text-[50px]';
  }
  if (ctx === 'cta') {
    if (len < 30) return 'text-[120px]';
    if (len < 55) return 'text-[96px]';
    if (len < 85) return 'text-[72px]';
    return 'text-[56px]';
  }
  if (len < 30) return 'text-[68px]';
  if (len < 55) return 'text-[58px]';
  if (len < 85) return 'text-[46px]';
  return 'text-[38px]';
};

const bodySize = (text: string) => {
  const len = (text || '').length;
  if (len < 100) return 'text-[30px]';
  if (len < 200) return 'text-[26px]';
  return 'text-[22px]';
};

// ── Átomos compartilhados ─────────────────────────────────────────────────────

const ProgressDots: React.FC<{ current: number; total: number; accent: string }> = ({
  current, total, accent,
}) => (
  <div className="flex items-center gap-1.5">
    {Array.from({ length: total }).map((_, i) => {
      const isCurrent = i + 1 === current;
      const isPast = i + 1 < current;
      return (
        <div
          key={i}
          className="h-1.5 rounded-full transition-all"
          style={{
            width: isCurrent ? '24px' : '6px',
            backgroundColor: isCurrent
              ? accent
              : isPast
              ? `${accent}66`
              : 'rgba(255,255,255,0.20)',
          }}
        />
      );
    })}
  </div>
);

const VerticalSeparator3: React.FC<{ accent: string }> = ({ accent }) => (
  <div className="flex flex-col items-center gap-2 mx-2 mt-2">
    <div className="w-[2px] h-14 rounded-full" style={{ backgroundColor: `${accent}CC` }} />
    <div className="w-[2px] h-7 rounded-full" style={{ backgroundColor: `${accent}66` }} />
    <div className="w-[2px] h-3 rounded-full" style={{ backgroundColor: `${accent}33` }} />
  </div>
);

const KickerBadge: React.FC<{ label: string; accent: string }> = ({ label, accent }) => (
  <div
    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border backdrop-blur-sm"
    style={{
      borderColor: `${accent}4D`,
      backgroundColor: `${accent}14`,
    }}
  >
    <div
      className="h-1.5 w-1.5 rounded-full"
      style={{ backgroundColor: accent }}
    />
    <span
      className="text-[11px] font-bold tracking-[0.32em] uppercase"
      style={{ color: accent, fontFamily: 'var(--font-geist-mono), monospace' }}
    >
      {label}
    </span>
  </div>
);

const Signature: React.FC<{ handle: string; accent: string }> = ({ handle, accent }) => (
  <span
    className="font-bold tracking-[0.18em] uppercase text-[14px]"
    style={{ color: accent, opacity: 0.85, fontFamily: 'var(--font-geist-mono), monospace' }}
  >
    {handle}
  </span>
);

// ── Componente principal ─────────────────────────────────────────────────────

export const StepListSlide: React.FC<StepListSlideProps> = ({
  slideNumber,
  totalSlides,
  variant = 'STEP',
  stepNumber,
  headline,
  bodyText,
  backgroundImage,
  mainObjectImage,
  accentColor = '#FFB800',
  accentAlt = ACCENT_ALT_DEFAULT,
  handle = '@tiagoelesbao',
  headlineFontSize,
  bodyFontSize,
  imageZoom,
  imagePosX,
  imagePosY,
  primaryColor,
  secondaryColor,
  accentAurora,
  designVersion = 'v2',
}) => {
  const normalizedVariant: 'HOOK' | 'STEP' | 'CTA_THINK' =
    variant === 'HOOK' ? 'HOOK'
    : variant === 'CTA' || variant === 'CTA_THINK' ? 'CTA_THINK'
    : 'STEP';

  // V1 rollback — preserva o layout antigo idêntico.
  if (designVersion === 'v1') {
    return (
      <StepListSlideV1
        slideNumber={slideNumber}
        totalSlides={totalSlides}
        normalizedVariant={normalizedVariant}
        stepNumber={stepNumber}
        headline={headline}
        bodyText={bodyText}
        backgroundImage={backgroundImage}
        mainObjectImage={mainObjectImage}
        accentColor={accentColor}
        handle={handle}
        headlineFontSize={headlineFontSize}
        bodyFontSize={bodyFontSize}
        imageZoom={imageZoom}
        imagePosX={imagePosX}
        imagePosY={imagePosY}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        accentAurora={accentAurora}
      />
    );
  }

  const hStyle = headlineFontSize ? { fontSize: `${headlineFontSize}px` } : undefined;
  const bStyle = bodyFontSize ? { fontSize: `${bodyFontSize}px` } : undefined;
  const imgStyle: React.CSSProperties = {
    objectPosition: `${imagePosX ?? 50}% ${imagePosY ?? 50}%`,
    transform: imageZoom && imageZoom !== 1 ? `scale(${imageZoom})` : undefined,
    filter: 'brightness(0.62) contrast(1.12)',
  };

  const hasAlarm = ALARM_RE.test(bodyText || '') || ALARM_RE.test(headline || '');
  const stepNumberColor = hasAlarm ? accentAlt : accentColor;

  // ─── HOOK (3 zonas: foto 50% / headline 35% / body 15%) ────────────────────
  if (normalizedVariant === 'HOOK') {
    const hookBg = backgroundImage || mainObjectImage;
    return (
      <div className="relative w-[1080px] h-[1350px] overflow-hidden flex flex-col font-sans bg-[#0B0B0F] text-white">
        {/* Zona 1: Foto 50% (675px) — color-graded escuro */}
        <div className="relative w-full h-[675px] overflow-hidden">
          {hookBg ? (
            <>
              <img src={hookBg} alt="" className="w-full h-full object-cover" style={imgStyle} />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[#0B0B0F]" />
            </>
          ) : (
            <PremiumBackground
              theme="dark"
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              accentColor={accentColor}
              accentAurora={accentAurora}
            />
          )}
          <GrainOverlay opacity={0.08} blendMode="overlay" />

          {/* Kicker badge no TOPO da foto */}
          <div className="absolute top-[40px] left-[60px] z-10">
            <KickerBadge
              label={`Bastidor · ${String(slideNumber).padStart(2, '0')}/${String(totalSlides).padStart(2, '0')}`}
              accent={accentColor}
            />
          </div>

          {/* Vinheta radial sobre a foto */}
          <div
            className="absolute inset-0 pointer-events-none z-[6]"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.45) 100%)',
            }}
          />
        </div>

        {/* Zona 2: Headline 35% (475px) */}
        <div className="relative flex-1 flex flex-col justify-start px-[60px] pt-[50px] pb-[20px]">
          <GrainOverlay opacity={0.05} blendMode="soft-light" />
          <div
            className="absolute -bottom-[8%] -right-[14%] w-[440px] h-[440px] rounded-full blur-[180px] opacity-25 z-0"
            style={{ backgroundColor: accentColor }}
          />
          <h1
            className={`relative z-10 ${headlineSize(headline, 'hook')} font-black uppercase leading-[1.02] tracking-tight`}
            style={{ ...hStyle, color: accentColor }}
          >
            {headline}
          </h1>
        </div>

        {/* Zona 3: Body 15% (200px) com signature */}
        <div className="relative px-[60px] pb-[40px] pt-[10px]">
          {bodyText && (
            <p
              className={`${bodySize(bodyText)} text-white/75 font-medium leading-[1.4] max-w-[860px]`}
              style={bStyle}
            >
              {bodyText}
            </p>
          )}
          <div className="absolute bottom-[40px] right-[60px]">
            <Signature handle={handle} accent={accentColor} />
          </div>
        </div>
      </div>
    );
  }

  // ─── CTA_THINK ────────────────────────────────────────────────────────────
  if (normalizedVariant === 'CTA_THINK') {
    return (
      <div className="relative w-[1080px] h-[1350px] overflow-hidden flex flex-col items-center justify-center font-sans bg-[#0B0B0F] text-white">
        <PremiumBackground
          theme="dark"
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          accentColor={accentColor}
          accentAurora={accentAurora}
        />
        <GrainOverlay opacity={0.07} blendMode="overlay" />

        {/* Dot grid sutil */}
        <div
          className="absolute inset-0 pointer-events-none z-[3]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,184,0,0.10) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)',
          }}
        />

        <div
          className="absolute -top-[16%] -left-[12%] w-[560px] h-[560px] rounded-full blur-[180px] opacity-25 z-0"
          style={{ backgroundColor: accentAlt }}
        />

        {/* Quote marks decorativos */}
        <div
          className="absolute top-[150px] left-[70px] text-[200px] leading-none font-black opacity-[0.12] pointer-events-none select-none"
          style={{ color: accentColor }}
        >
          &ldquo;
        </div>

        <div className="relative z-10 flex flex-col items-center text-center px-[80px] max-w-[940px]">
          <h1
            className={`${headlineSize(headline, 'cta')} font-black uppercase leading-[1.04] tracking-tight`}
            style={{ ...hStyle, color: accentAlt }}
          >
            {headline}
          </h1>
          {/* Underline com gradiente âmbar→transparente */}
          <div
            className="h-[5px] w-32 rounded-full mt-12"
            style={{
              background: `linear-gradient(90deg, ${accentColor} 0%, transparent 100%)`,
            }}
          />
          {bodyText && (
            <p
              className="text-[26px] text-white/65 font-medium leading-snug max-w-[680px] mt-8"
              style={bStyle}
            >
              {bodyText}
            </p>
          )}
        </div>

        <div className="absolute bottom-[40px] right-[60px] z-20">
          <Signature handle={handle} accent={accentColor} />
        </div>
      </div>
    );
  }

  // ─── STEP (default) ───────────────────────────────────────────────────────
  const stepLabel = String(stepNumber ?? slideNumber).padStart(2, '0');

  return (
    <div className="relative w-[1080px] h-[1350px] overflow-hidden flex flex-col font-sans bg-[#0B0B0F] text-white">
      <PremiumBackground
        theme="dark"
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        accentColor={accentColor}
        accentAurora={accentAurora}
      />
      <GrainOverlay opacity={0.07} blendMode="overlay" />

      <div
        className="absolute -bottom-[20%] -right-[14%] w-[600px] h-[600px] rounded-full blur-[200px] opacity-20 z-0"
        style={{ backgroundColor: accentColor }}
      />

      {/* Header — Framework Tiago + Progress Dots */}
      <div className="relative z-10 flex items-center justify-between px-[60px] pt-[60px]">
        <span
          className="text-[12px] font-bold tracking-[0.42em] uppercase"
          style={{ color: accentColor, opacity: 0.85, fontFamily: 'var(--font-geist-mono), monospace' }}
        >
          Framework Tiago
        </span>
        <ProgressDots current={slideNumber} total={totalSlides} accent={accentColor} />
      </div>

      {/* Conteúdo central — número gigante + step body */}
      <div className="relative z-10 flex-1 flex items-center px-[60px]">
        <div className="flex items-start gap-8 w-full">
          <div className="flex-shrink-0 flex items-start">
            <div className="flex flex-col items-start">
              <div
                className="text-[240px] font-black leading-[0.85] tracking-[-0.04em]"
                style={{
                  color: stepNumberColor,
                  fontFamily: 'var(--font-geist-mono), monospace',
                }}
              >
                {stepLabel}
              </div>
              <div
                className="h-[6px] w-24 rounded-full mt-4"
                style={{ backgroundColor: stepNumberColor }}
              />
            </div>
            <VerticalSeparator3 accent={accentColor} />
          </div>

          <div className="flex-1 pt-8">
            <h2
              className={`${headlineSize(headline, 'step')} font-black uppercase leading-[1.05] tracking-tight`}
              style={hStyle}
            >
              {headline}
            </h2>
            {bodyText && (
              <p
                className={`${bodySize(bodyText)} text-white/75 font-medium leading-[1.45] mt-6`}
                style={bStyle}
              >
                {bodyText}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center justify-between px-[60px] pb-[40px]">
        <span
          className="text-[11px] tracking-[0.4em] uppercase opacity-30 font-bold"
          style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
        >
          Bastidor de quem está construindo
        </span>
        <Signature handle={handle} accent={accentColor} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// V1 — layout legado preservado para rollback (designVersion='v1')
// ─────────────────────────────────────────────────────────────────────────────
interface V1Props {
  slideNumber: number;
  totalSlides: number;
  normalizedVariant: 'HOOK' | 'STEP' | 'CTA_THINK';
  stepNumber?: number;
  headline: string;
  bodyText?: string;
  backgroundImage?: string;
  mainObjectImage?: string;
  accentColor: string;
  handle: string;
  headlineFontSize?: number;
  bodyFontSize?: number;
  imageZoom?: number;
  imagePosX?: number;
  imagePosY?: number;
  primaryColor?: string;
  secondaryColor?: string;
  accentAurora?: string;
}

const StepListSlideV1: React.FC<V1Props> = (props) => {
  const {
    slideNumber, totalSlides, normalizedVariant, stepNumber, headline, bodyText,
    backgroundImage, mainObjectImage, accentColor, handle,
    headlineFontSize, bodyFontSize, imageZoom, imagePosX, imagePosY,
    primaryColor, secondaryColor, accentAurora,
  } = props;
  const hStyle = headlineFontSize ? { fontSize: `${headlineFontSize}px` } : undefined;
  const bStyle = bodyFontSize ? { fontSize: `${bodyFontSize}px` } : undefined;
  const imgStyle: React.CSSProperties = {
    objectPosition: `${imagePosX ?? 50}% ${imagePosY ?? 50}%`,
    transform: imageZoom && imageZoom !== 1 ? `scale(${imageZoom})` : undefined,
  };

  if (normalizedVariant === 'HOOK') {
    const hookBg = backgroundImage || mainObjectImage;
    return (
      <div className="relative w-[1080px] h-[1350px] overflow-hidden flex flex-col font-sans bg-[#0B0B0F] text-white">
        {hookBg ? (
          <div className="absolute inset-0 z-0">
            <img src={hookBg} alt="" className="w-full h-full object-cover" style={imgStyle} />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
          </div>
        ) : (
          <PremiumBackground theme="dark" primaryColor={primaryColor} secondaryColor={secondaryColor} accentColor={accentColor} accentAurora={accentAurora} />
        )}
        <div className="absolute -bottom-[18%] -right-[14%] w-[560px] h-[560px] rounded-full blur-[180px] opacity-30 z-0" style={{ backgroundColor: accentColor }} />
        <div className="relative z-10 flex-1 flex flex-col justify-end px-[60px] pb-[60px]">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-[3px] w-12 rounded-full" style={{ backgroundColor: accentColor }} />
            <span className="text-[12px] font-black tracking-[0.42em] uppercase" style={{ color: accentColor }}>
              Bastidor · 0{slideNumber}/{totalSlides}
            </span>
          </div>
          <h1 className="text-[80px] font-black uppercase leading-[1.02] tracking-tight" style={{ ...hStyle, color: accentColor }}>
            {headline}
          </h1>
          {bodyText && (
            <p className="text-[26px] text-white/75 font-medium leading-[1.4] mt-6 max-w-[860px]" style={bStyle}>
              {bodyText}
            </p>
          )}
        </div>
        <div className="absolute bottom-[40px] right-[60px] z-20">
          <Signature handle={handle} accent={accentColor} />
        </div>
      </div>
    );
  }
  if (normalizedVariant === 'CTA_THINK') {
    return (
      <div className="relative w-[1080px] h-[1350px] overflow-hidden flex flex-col items-center justify-center font-sans bg-[#0B0B0F] text-white">
        <PremiumBackground theme="dark" primaryColor={primaryColor} secondaryColor={secondaryColor} accentColor={accentColor} accentAurora={accentAurora} />
        <h1 className="text-[90px] font-black uppercase text-center px-[80px] tracking-tight leading-[1.04]" style={hStyle}>
          {headline}
        </h1>
        {bodyText && <p className="text-[26px] text-white/65 font-medium text-center max-w-[680px] mt-8 px-[80px]" style={bStyle}>{bodyText}</p>}
        <div className="absolute bottom-[40px] right-[60px]"><Signature handle={handle} accent={accentColor} /></div>
      </div>
    );
  }
  // STEP V1
  const stepLabel = String(stepNumber ?? slideNumber).padStart(2, '0');
  return (
    <div className="relative w-[1080px] h-[1350px] overflow-hidden flex flex-col font-sans bg-[#0B0B0F] text-white">
      <PremiumBackground theme="dark" primaryColor={primaryColor} secondaryColor={secondaryColor} accentColor={accentColor} accentAurora={accentAurora} />
      <div className="relative z-10 flex items-center justify-between px-[60px] pt-[60px]">
        <span className="text-[12px] font-black tracking-[0.42em] uppercase" style={{ color: accentColor, opacity: 0.8 }}>Framework Tiago</span>
        <span className="text-[14px] text-white/40 tracking-[0.18em] font-bold">{slideNumber} / {totalSlides}</span>
      </div>
      <div className="relative z-10 flex-1 flex items-center px-[60px]">
        <div className="flex items-start gap-12 w-full">
          <div className="flex-shrink-0">
            <div className="text-[210px] font-black leading-[0.85] tracking-tight" style={{ color: accentColor }}>{stepLabel}</div>
            <div className="h-[6px] w-24 rounded-full mt-4" style={{ backgroundColor: accentColor }} />
          </div>
          <div className="flex-1 pt-6 pl-2 border-l-[4px] border-white/15">
            <div className="pl-8">
              <h2 className="text-[54px] font-black uppercase leading-[1.05] tracking-tight" style={hStyle}>{headline}</h2>
              {bodyText && <p className="text-[26px] text-white/75 font-medium leading-[1.45] mt-6" style={bStyle}>{bodyText}</p>}
            </div>
          </div>
        </div>
      </div>
      <div className="relative z-10 flex items-center justify-between px-[60px] pb-[40px]">
        <span className="text-[11px] tracking-[0.4em] uppercase opacity-25 font-black">Bastidor de quem está construindo</span>
        <Signature handle={handle} accent={accentColor} />
      </div>
    </div>
  );
};
