import React from 'react';
import { BrandingLogo } from '../atoms/BrandingLogo';
import {
  Backdrop, GhostNumeral, GlowOrb, FilmGrain, resolvePalette, rgba,
} from '../fx';

interface ModeledCarouselSlideProps {
  slideNumber: number;
  totalSlides: number;
  headline: string;
  subHeadline?: string;
  bodyText?: string;
  backgroundImage?: string;
  mainObjectImage?: string;
  theme?: 'dark' | 'light';
  variant?: 'HOOK' | 'CONTENT' | 'IMAGE_FOCUS' | 'CTA';
  accentColor?: string;
  headlineFontSize?: number;
  bodyFontSize?: number;
  imageZoom?: number;
  imagePosX?: number;
  imagePosY?: number;
  textMetrics?: Record<string, unknown>;
  signatureHandle?: string;
  footerText?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentAlt?: string;
  accentAurora?: string;
}

const SignatureMark: React.FC<{ handle: string; accent: string; size: 'md' | 'xl' }> = ({
  handle, accent, size,
}) => {
  const fontSize = size === 'xl' ? 'text-[44px]' : 'text-[22px]';
  const tracking = size === 'xl' ? 'tracking-tight' : 'tracking-[0.18em]';
  return (
    <span
      className={`${fontSize} ${tracking} font-black uppercase`}
      style={{ color: accent, opacity: 0.95 }}
    >
      {handle}
    </span>
  );
};

interface ImageFraming { zoom?: number; posX?: number; posY?: number; }

const SAFE_X = 'px-20';

const headlineSize = (text: string, mode: 'hero' | 'content') => {
  const len = (text || '').length;
  if (mode === 'hero') {
    if (len < 25) return 'text-[100px]';
    if (len < 45) return 'text-[76px]';
    if (len < 70) return 'text-[58px]';
    return 'text-[46px]';
  }
  if (len < 30) return 'text-[60px]';
  if (len < 55) return 'text-[50px]';
  if (len < 80) return 'text-[42px]';
  return 'text-[36px]';
};

const bodySize = (text: string) => {
  const len = (text || '').length;
  if (len < 90) return 'text-[30px]';
  if (len < 190) return 'text-[26px]';
  if (len < 290) return 'text-[22px]';
  return 'text-[19px]';
};

// Kicker editorial — barra de acento com glow + rótulo espaçado.
const renderKicker = (accent: string, label?: string) => {
  if (!label) return null;
  return (
    <div className="flex items-center gap-4 mb-7">
      <div
        className="h-[3px] w-14 rounded-full"
        style={{ backgroundColor: accent, boxShadow: `0 0 18px ${rgba(accent, 0.8)}` }}
      />
      <span
        className="text-[13px] font-black tracking-[0.42em] uppercase"
        style={{ color: accent, textShadow: `0 0 22px ${rgba(accent, 0.45)}` }}
      >
        {label}
      </span>
    </div>
  );
};

// Painel de imagem premium: ring, sombra profunda, duotone sutil, grain e
// barra de acento inferior — caracteriza o objeto como recorte editado.
const renderImagePanel = (
  src: string, sizeClasses: string, accent: string, framing?: ImageFraming,
) => {
  const f = framing ?? {};
  const imgStyle: React.CSSProperties = {
    objectPosition: `${f.posX ?? 50}% ${f.posY ?? 50}%`,
    transform: f.zoom && f.zoom !== 1 ? `scale(${f.zoom})` : undefined,
  };
  return (
    <div
      className={`relative rounded-[34px] overflow-hidden ${sizeClasses}`}
      style={{
        boxShadow: `0 50px 90px -30px rgba(0,0,0,0.85), 0 0 0 1px ${rgba('#ffffff', 0.12)}, inset 0 0 0 6px ${rgba('#000000', 0.0)}`,
      }}
    >
      <img src={src} alt="" className="w-full h-full object-cover" style={imgStyle} />
      {/* Profundidade: gradientes topo/baixo + leve duotone de acento */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
      <div
        className="absolute inset-0 mix-blend-soft-light"
        style={{ background: `linear-gradient(135deg, ${rgba(accent, 0.45)}, transparent 60%)` }}
      />
      <FilmGrain opacity={0.08} />
      {/* Barra de acento inferior */}
      <div
        className="absolute left-0 bottom-0 h-[6px] w-full"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
      />
    </div>
  );
};

export const ModeledCarouselSlide: React.FC<ModeledCarouselSlideProps> = ({
  slideNumber,
  totalSlides,
  headline,
  subHeadline,
  bodyText,
  backgroundImage,
  mainObjectImage,
  theme = 'dark',
  variant = 'CONTENT',
  accentColor,
  headlineFontSize,
  bodyFontSize,
  imageZoom,
  imagePosX,
  imagePosY,
  signatureHandle,
  footerText = 'Virals Intelligence Engine',
  primaryColor,
  secondaryColor,
  accentAlt,
  accentAurora,
}) => {
  const palette = resolvePalette({
    primaryColor, secondaryColor, accentColor, accentAlt, accentAurora,
  });
  const accent = palette.accent;
  const progressWidth = `${(slideNumber / totalSlides) * 100}%`;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const hStyle = headlineFontSize ? { fontSize: `${headlineFontSize}px` } : undefined;
  const bStyle = bodyFontSize ? { fontSize: `${bodyFontSize}px` } : undefined;
  const framing: ImageFraming = { zoom: imageZoom, posX: imagePosX, posY: imagePosY };
  const headlineShadow = { textShadow: '0 10px 50px rgba(0,0,0,0.55)' };

  const bodyBlock = (text: string) => (
    <div
      className="pl-7 border-l-[4px] py-1"
      style={{ borderColor: accent, boxShadow: `-1px 0 24px -8px ${rgba(accent, 0.7)}` }}
    >
      <p className={`${bodySize(text)} text-white/80 font-medium leading-[1.45]`} style={bStyle}>
        {text}
      </p>
    </div>
  );

  return (
    <div className="relative w-[1080px] h-[1350px] overflow-hidden flex flex-col font-sans bg-black text-white">
      {/* Cena de fundo premium (mood editorial) */}
      <Backdrop palette={palette} mood="editorial" image={backgroundImage} />

      {/* Numeral-fantasma de índice — assinatura editorial */}
      {totalSlides > 1 && (
        <GhostNumeral
          value={pad(slideNumber)}
          color="#ffffff"
          opacity={0.045}
          className="text-[640px] -right-12 -bottom-40 z-0"
        />
      )}

      {/* Luz de leitura atrás do bloco de texto */}
      <GlowOrb color={accent} x="22%" y="62%" size={520} opacity={0.14} blur={170} />

      {/* Proteção de leitura suave */}
      <div className="absolute inset-0 z-10 bg-gradient-to-tr from-black/70 via-black/10 to-transparent pointer-events-none" />

      {/* HEADER */}
      <div className={`relative z-50 w-full ${SAFE_X} pt-14 flex justify-between items-start h-[120px]`}>
        {signatureHandle
          ? <SignatureMark handle={signatureHandle} accent={accent} size="md" />
          : <BrandingLogo variant="v-star" color="white" size="md" />}
        {totalSlides > 1 && (
          <div className="flex flex-col items-end gap-2">
            <span className="font-mono text-base font-bold tracking-[0.4em] opacity-45">
              {pad(slideNumber)} / {pad(totalSlides)}
            </span>
            <div className="w-32 h-[3px] bg-white/10 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full"
                style={{ width: progressWidth, background: `linear-gradient(90deg, ${accent}, ${palette.accentAlt})` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className={`relative z-40 flex-1 flex flex-col w-full ${SAFE_X} pb-4`}>
        {variant === 'HOOK' && (
          <div className="flex-1 flex items-center gap-10">
            <div className={mainObjectImage ? 'w-[56%]' : 'w-full max-w-[880px]'}>
              {renderKicker(accent, subHeadline)}
              <h1
                className={`${headlineSize(headline, 'hero')} font-black uppercase leading-[0.95] tracking-tight`}
                style={{ ...hStyle, ...headlineShadow }}
              >
                {headline}
              </h1>
              {bodyText && <div className="mt-8">{bodyBlock(bodyText)}</div>}
            </div>
            {mainObjectImage && (
              <div className="w-[44%] flex justify-end">
                {renderImagePanel(mainObjectImage, 'w-[400px] h-[640px]', accent, framing)}
              </div>
            )}
          </div>
        )}

        {variant === 'CONTENT' && (
          <div className="flex-1 flex flex-col justify-center gap-8">
            <div>
              {renderKicker(accent, subHeadline)}
              <h2
                className={`${headlineSize(headline, 'content')} font-black uppercase leading-[1.02] tracking-tight`}
                style={{ ...hStyle, ...headlineShadow }}
              >
                {headline}
              </h2>
            </div>
            {bodyText && bodyBlock(bodyText)}
            {mainObjectImage && renderImagePanel(mainObjectImage, 'w-full h-[500px]', accent, framing)}
          </div>
        )}

        {variant === 'IMAGE_FOCUS' && (
          <div className="flex-1 flex flex-col justify-center">
            {renderKicker(accent, subHeadline)}
            <h1
              className={`${headlineSize(headline, 'hero')} font-black uppercase leading-[0.95] tracking-tight`}
              style={{ ...hStyle, ...headlineShadow }}
            >
              {headline}
            </h1>
            {bodyText && <div className="mt-6">{bodyBlock(bodyText)}</div>}
            {mainObjectImage && (
              <div className="mt-10">{renderImagePanel(mainObjectImage, 'w-full h-[600px]', accent, framing)}</div>
            )}
          </div>
        )}

        {variant === 'CTA' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="mb-10">
              {signatureHandle
                ? <SignatureMark handle={signatureHandle} accent={accent} size="xl" />
                : <BrandingLogo variant="v-star" color="white" size="xl" />}
            </div>
            <h1
              className={`${headlineSize(headline, 'hero')} font-black uppercase leading-[0.95] tracking-tight mb-8`}
              style={{ ...hStyle, ...headlineShadow }}
            >
              {headline}
            </h1>
            {bodyText && (
              <p className="text-[26px] text-white/70 font-medium leading-[1.4] max-w-[700px] mb-12" style={bStyle}>
                {bodyText}
              </p>
            )}
            <div
              className="relative px-14 py-6 rounded-2xl flex items-center gap-5"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${palette.accentAlt})`,
                boxShadow: `0 24px 60px -16px ${rgba(accent, 0.7)}`,
              }}
            >
              <span className="text-xl font-black uppercase tracking-[0.18em] text-black">Salvar Post</span>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className={`relative z-50 ${SAFE_X} flex justify-between items-center h-[96px]`}>
        <span className="text-xs tracking-[0.45em] uppercase opacity-30 font-black">
          {footerText}
        </span>
        {variant !== 'CTA' && totalSlides > 1 && (
          <div className="flex items-center gap-5 opacity-45">
            <span className="text-base font-black uppercase tracking-[0.2em]">Deslize</span>
            <div className="w-9 h-9 flex items-center justify-center border-2 border-white/20 rounded-full">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Grão final sobre tudo — coesão de textura */}
      <FilmGrain opacity={0.05} blend="soft-light" />
    </div>
  );
};
