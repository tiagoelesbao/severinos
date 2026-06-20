import React from 'react';
import { BrandingLogo } from '../atoms/BrandingLogo';
import { PremiumBackground } from '../molecules/PremiumBackground';

interface QuoteSlideProps {
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
  /** Footer text — não usado no QuoteSlide; aceito para compat de props. */
  footerText?: string;
  /** Brand-agnostic palette (MKT-MC4-05). Vazio = paleta Virals. */
  primaryColor?: string;
  secondaryColor?: string;
  accentAlt?: string;
  accentAurora?: string;
}

const quoteSize = (text: string) => {
  const len = (text || '').length;
  if (len < 40) return 'text-[92px]';
  if (len < 75) return 'text-[72px]';
  if (len < 120) return 'text-[56px]';
  return 'text-[44px]';
};

/**
 * QuoteSlide — arquétipo "quote": frase motivacional em destaque sobre fundo
 * aspiracional. Sem chrome de carrossel.
 */
export const QuoteSlide: React.FC<QuoteSlideProps> = ({
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
  footerText = '',
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
    <div className="relative w-[1080px] h-[1350px] overflow-hidden flex flex-col items-center justify-center font-sans bg-black text-white">

      {/* Fundo aspiracional — foto full-bleed esmaecida, ou gradiente de marca */}
      {mainObjectImage ? (
        <div className="absolute inset-0 z-0">
          <img src={mainObjectImage} alt="" className="w-full h-full object-cover" style={imgStyle} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/65 to-black/90" />
        </div>
      ) : (
        <PremiumBackground
          theme="dark"
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          accentColor={accentColor}
          accentAlt={accentAlt}
          accentAurora={accentAurora}
        />
      )}
      <div
        className="absolute -bottom-[16%] -right-[12%] w-[540px] h-[540px] rounded-full blur-[170px] opacity-25 z-0"
        style={{ backgroundColor: accentColor }}
      />

      {/* Conteúdo central */}
      <div className="relative z-20 flex flex-col items-center text-center px-24">
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

        {subHeadline && (
          <span
            className="text-[14px] font-black tracking-[0.5em] uppercase mt-12"
            style={{ color: accentColor }}
          >
            {subHeadline}
          </span>
        )}

        <h1
          className={`${quoteSize(headline)} font-black uppercase leading-[1.05] tracking-tight max-w-[920px] mt-8`}
          style={hStyle}
        >
          {headline}
        </h1>

        <div className="h-[5px] w-28 rounded-full mt-14" style={{ backgroundColor: accentColor }} />

        {bodyText && (
          <p
            className="text-[26px] text-white/65 font-medium leading-snug max-w-[680px] mt-10"
            style={bStyle}
          >
            {bodyText}
          </p>
        )}
      </div>

      {/* Rodapé — usa footerText (brand-agnostic, MKT-MC4-04). Vazio = nada renderiza. */}
      {footerText && (
        <div className="absolute bottom-12 z-20">
          <span className="text-xs tracking-[0.5em] uppercase opacity-30 font-black">
            {footerText}
          </span>
        </div>
      )}
    </div>
  );
};
