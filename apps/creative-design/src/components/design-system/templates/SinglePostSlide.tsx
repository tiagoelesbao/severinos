import React from 'react';
import { BrandingLogo } from '../atoms/BrandingLogo';
import { PremiumBackground } from '../molecules/PremiumBackground';

interface SinglePostSlideProps {
  headline: string;
  subHeadline?: string;
  bodyText?: string;
  mainObjectImage?: string;
  accentColor?: string;
  /** Override manual do tamanho da fonte (px) — vindo do Editor. */
  headlineFontSize?: number;
  bodyFontSize?: number;
  /** Enquadramento da imagem — vindo do Editor. */
  imageZoom?: number;
  imagePosX?: number;
  imagePosY?: number;
  /** Aceito por compatibilidade de props com os demais templates. */
  textMetrics?: Record<string, unknown>;
  /** Brand-agnostic signature (MKT-MC4-04). Vazio = BrandingLogo V+ (Virals). */
  signatureHandle?: string;
  /** Footer text — default Virals; passe '' para suprimir. */
  footerText?: string;
  /** Brand-agnostic palette (MKT-MC4-05). Vazio = paleta Virals. */
  primaryColor?: string;
  secondaryColor?: string;
  accentAlt?: string;
  accentAurora?: string;
}

const headlineSize = (text: string) => {
  const len = (text || '').length;
  if (len < 30) return 'text-[64px]';
  if (len < 55) return 'text-[52px]';
  if (len < 85) return 'text-[42px]';
  return 'text-[34px]';
};

const bodySize = (text: string) => {
  const len = (text || '').length;
  if (len < 120) return 'text-[28px]';
  if (len < 240) return 'text-[24px]';
  return 'text-[20px]';
};

/**
 * SinglePostSlide — arquétipo "single": post único de insight/notícia.
 * Imagem em destaque no topo + headline e corpo abaixo.
 */
export const SinglePostSlide: React.FC<SinglePostSlideProps> = ({
  headline,
  subHeadline,
  bodyText,
  mainObjectImage,
  accentColor = '#FF3D68',
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
  const hStyle = headlineFontSize ? { fontSize: `${headlineFontSize}px` } : undefined;
  const bStyle = bodyFontSize ? { fontSize: `${bodyFontSize}px` } : undefined;
  const imgStyle: React.CSSProperties = {
    objectPosition: `${imagePosX ?? 50}% ${imagePosY ?? 50}%`,
    transform: imageZoom && imageZoom !== 1 ? `scale(${imageZoom})` : undefined,
  };

  return (
    <div className="relative w-[1080px] h-[1350px] overflow-hidden flex flex-col font-sans bg-black text-white">

      <PremiumBackground
        theme="dark"
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        accentColor={accentColor}
        accentAlt={accentAlt}
        accentAurora={accentAurora}
      />
      <div
        className="absolute -top-[12%] -right-[10%] w-[460px] h-[460px] rounded-full blur-[150px] opacity-25 z-0"
        style={{ backgroundColor: accentColor }}
      />

      {/* Header — altura acomoda o logo + respiro antes da imagem */}
      <div className="relative z-30 px-20 pt-16 h-[176px]">
        {signatureHandle ? (
          <span
            className="text-[22px] font-black tracking-[0.18em] uppercase"
            style={{ color: accentColor, opacity: 0.95 }}
          >
            {signatureHandle}
          </span>
        ) : (
          <BrandingLogo variant="v-star" color="white" size="md" />
        )}
      </div>

      {/* Imagem em destaque (contida, sem corte por offset) */}
      {mainObjectImage && (
        <div className="relative z-20 px-20 pt-2">
          <div className="w-full h-[640px] rounded-[36px] overflow-hidden border border-white/10 shadow-2xl shadow-black/60 relative">
            <img src={mainObjectImage} alt="" className="w-full h-full object-cover" style={imgStyle} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          </div>
        </div>
      )}

      {/* Texto */}
      <div className="relative z-20 flex-1 flex flex-col justify-center px-20">
        {subHeadline && (
          <div className="flex items-center gap-4 mb-5">
            <div className="h-[3px] w-12 rounded-full" style={{ backgroundColor: accentColor }} />
            <span
              className="text-[13px] font-black tracking-[0.42em] uppercase"
              style={{ color: accentColor }}
            >
              {subHeadline}
            </span>
          </div>
        )}
        <h1
          className={`${headlineSize(headline)} font-black uppercase leading-[1.04] tracking-tight`}
          style={hStyle}
        >
          {headline}
        </h1>
        {bodyText && (
          <div className="pl-7 border-l-[4px] mt-6" style={{ borderColor: `${accentColor}66` }}>
            <p
              className={`${bodySize(bodyText)} text-white/75 font-medium leading-[1.4]`}
              style={bStyle}
            >
              {bodyText}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative z-20 px-20 pb-12 h-[96px] flex items-center">
        <span className="text-xs tracking-[0.45em] uppercase opacity-25 font-black">
          {footerText}
        </span>
      </div>
    </div>
  );
};
