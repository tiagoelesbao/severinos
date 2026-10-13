import React from 'react';
import { PremiumBackground } from '../molecules/PremiumBackground';

/**
 * ProvocationHeroSlide — arquétipo "tiago-provocation": single post com QUOTE
 * provocativo em fonte gigante + assinatura formal (nome + role).
 *
 * Diferenciação vs QuoteSlide:
 *   - QuoteSlide: aspiracional, centralizado, estilo GaryVee
 *   - ProvocationHero: call-to-think direto, texto à esquerda, traço-divisor
 *     + assinatura formal "Tiago Elesbão · Founder · Virals"
 *
 * 1080x1350, paleta preto-âmbar (Tiago Elesbão), tipografia Outfit.
 */

export interface ProvocationHeroSlideProps {
  /** A provocação — quote principal. Aceita também `headline` (fallback do orquestrador). */
  quote?: string;
  /** Fallback do orquestrador genérico (orchestrate_post_single envia `headline`). */
  headline?: string;
  /** Nome do autor (default 'Tiago Elesbão'). */
  authorName?: string;
  /** Papel / atribuição (default 'Founder · Virals'). */
  authorRole?: string;
  /** Foto bastidor opcional com overlay denso (0.80). */
  backgroundImage?: string;
  accentColor?: string;
  handle?: string;

  quoteFontSize?: number;
  imageZoom?: number;
  imagePosX?: number;
  imagePosY?: number;
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

// Texto responsivo ao length — provocações curtas merecem fonte maior.
const quoteSize = (text: string) => {
  const len = (text || '').length;
  if (len < 35) return 'text-[130px]';
  if (len < 70) return 'text-[110px]';
  if (len < 120) return 'text-[86px]';
  if (len < 180) return 'text-[66px]';
  return 'text-[52px]';
};

const Signature: React.FC<{ handle: string; accent: string }> = ({ handle, accent }) => (
  <span
    className="font-black tracking-[0.18em] uppercase text-[14px]"
    style={{ color: accent, opacity: 0.85 }}
  >
    {handle}
  </span>
);

export const ProvocationHeroSlide: React.FC<ProvocationHeroSlideProps> = ({
  quote,
  headline,
  authorName = 'Tiago Elesbão',
  authorRole = 'Founder · Virals',
  backgroundImage,
  accentColor = '#FFB800',
  handle = '@tiagoelesbao',
  quoteFontSize,
  imageZoom,
  imagePosX,
  imagePosY,
  primaryColor,
  secondaryColor,
  accentAlt,
  accentAurora,
}) => {
  // Resolve a quote final: prop direta > headline (fallback do orquestrador genérico)
  const finalQuote = (quote || headline || '').trim();
  const qStyle = quoteFontSize ? { fontSize: `${quoteFontSize}px` } : undefined;
  const imgStyle: React.CSSProperties = {
    objectPosition: `${imagePosX ?? 50}% ${imagePosY ?? 50}%`,
    transform: imageZoom && imageZoom !== 1 ? `scale(${imageZoom})` : undefined,
  };

  return (
    <div className="relative w-[1080px] h-[1350px] overflow-hidden flex flex-col font-sans bg-[#0B0B0F] text-white">
      {/* Fundo */}
      {backgroundImage ? (
        <div className="absolute inset-0 z-0">
          <img src={backgroundImage} alt="" className="w-full h-full object-cover" style={imgStyle} />
          {/* Overlay mais denso que o padrão (0.80) para legibilidade do quote gigante */}
          <div className="absolute inset-0 bg-black/80" />
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
        className="absolute -top-[18%] -right-[14%] w-[560px] h-[560px] rounded-full blur-[180px] opacity-25 z-0"
        style={{ backgroundColor: accentColor }}
      />

      {/* Header — kicker discreto */}
      <div className="relative z-10 px-[60px] pt-[60px]">
        <div className="flex items-center gap-3">
          <div
            className="h-[3px] w-12 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <span
            className="text-[12px] font-black tracking-[0.5em] uppercase"
            style={{ color: accentColor, opacity: 0.9 }}
          >
            Provocação
          </span>
        </div>
      </div>

      {/* Quote principal — alinhado à esquerda, NÃO centralizado (diferente do QuoteSlide) */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-[60px]">
        <h1
          className={`${quoteSize(finalQuote)} font-black leading-[1.04] tracking-tight max-w-[920px]`}
          style={qStyle}
        >
          {finalQuote.startsWith('"') ? finalQuote : `"${finalQuote}"`}
        </h1>
      </div>

      {/* Assinatura formal — traço-divisor + nome + role */}
      <div className="relative z-10 px-[60px] pb-[60px]">
        <div className="flex items-end justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className="h-[58px] w-[5px] rounded-full flex-shrink-0"
              style={{ backgroundColor: accentColor }}
            />
            <div>
              <div className="text-[28px] font-black uppercase tracking-tight leading-tight">
                {authorName}
              </div>
              {authorRole && (
                <div className="text-[18px] font-semibold text-white/55 mt-1 tracking-wider uppercase">
                  {authorRole}
                </div>
              )}
            </div>
          </div>
          <Signature handle={handle} accent={accentColor} />
        </div>
      </div>
    </div>
  );
};
