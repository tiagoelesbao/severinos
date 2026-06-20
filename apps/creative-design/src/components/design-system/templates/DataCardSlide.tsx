import React from 'react';
import {
  Backdrop, GlowOrb, GradientText, GlassPanel, FilmGrain, resolvePalette, rgba,
} from '../fx';

/**
 * DataCardSlide — arquétipo "tiago-data": single post com NÚMERO-HERÓI.
 * v2 (MED-DS-01): número em gradiente com glow, encapsulado num card de vidro
 * (glassmorphism) sobre cena premium mood="data". Profundidade e luz fazem o
 * número "saltar" como num asset editado a mão.
 */

export interface DataCardSlideProps {
  kicker?: string;
  subHeadline?: string;
  number?: string;
  unitSuffix?: string;
  headline: string;
  bodyText?: string;
  callToThink?: string;
  backgroundImage?: string;
  accentColor?: string;
  handle?: string;
  numberFontSize?: number;
  headlineFontSize?: number;
  bodyFontSize?: number;
  imageZoom?: number;
  imagePosX?: number;
  imagePosY?: number;
  textMetrics?: Record<string, unknown>;
  primaryColor?: string;
  secondaryColor?: string;
  accentAlt?: string;
  accentAurora?: string;
  signatureHandle?: string;
  footerText?: string;
}

const headlineSize = (text: string) => {
  const len = (text || '').length;
  if (len < 30) return 'text-[52px]';
  if (len < 60) return 'text-[44px]';
  if (len < 100) return 'text-[36px]';
  return 'text-[30px]';
};

const bodySize = (text: string) => {
  const len = (text || '').length;
  if (len < 120) return 'text-[28px]';
  if (len < 220) return 'text-[24px]';
  return 'text-[20px]';
};

const numberAutoSize = (text: string) => {
  const len = (text || '').length;
  if (len <= 2) return 320;
  if (len === 3) return 280;
  if (len <= 5) return 220;
  if (len <= 7) return 180;
  return 140;
};

const Signature: React.FC<{ handle: string; accent: string }> = ({ handle, accent }) => (
  <span
    className="font-black tracking-[0.18em] uppercase text-[14px]"
    style={{ color: accent, opacity: 0.85 }}
  >
    {handle}
  </span>
);

export const DataCardSlide: React.FC<DataCardSlideProps> = ({
  kicker,
  subHeadline,
  number,
  unitSuffix,
  headline,
  bodyText,
  callToThink,
  backgroundImage,
  accentColor,
  handle = '@tiagoelesbao',
  numberFontSize,
  headlineFontSize,
  bodyFontSize,
  primaryColor,
  secondaryColor,
  accentAlt,
  accentAurora,
}) => {
  const palette = resolvePalette({
    primaryColor, secondaryColor, accentColor, accentAlt, accentAurora,
  });
  const accent = palette.accent;
  const effectiveKicker = (kicker || subHeadline || '').trim();
  const hasNumber = Boolean(number && number.trim());
  const numSize = numberFontSize ?? numberAutoSize(number || '');
  const hStyle = headlineFontSize ? { fontSize: `${headlineFontSize}px` } : undefined;
  const bStyle = bodyFontSize ? { fontSize: `${bodyFontSize}px` } : undefined;

  return (
    <div className="relative w-[1080px] h-[1350px] overflow-hidden flex flex-col font-sans bg-[#0B0B0F] text-white">
      <Backdrop palette={palette} mood="data" image={backgroundImage} />

      {/* Glow protagonista atrás do card */}
      <GlowOrb color={accent} x="50%" y="46%" size={760} opacity={0.28} blur={190} />

      {/* Bloco central — card de vidro */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-[70px]">
        <GlassPanel className="w-full max-w-[900px] px-[70px] py-[80px] text-center" radius={44}>
          {effectiveKicker && (
            <div className="flex items-center justify-center gap-3 mb-10">
              <div className="h-[3px] w-12 rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 16px ${rgba(accent, 0.8)}` }} />
              <span className="text-[14px] font-black tracking-[0.5em] uppercase" style={{ color: accent }}>
                {effectiveKicker}
              </span>
            </div>
          )}

          {hasNumber && (
            <div
              className="flex items-end justify-center gap-3 mb-10"
              style={{ filter: `drop-shadow(0 18px 50px ${rgba(accent, 0.45)})` }}
            >
              <GradientText
                colors={[palette.accentAurora, accent, palette.accentAlt]}
                angle={150}
                className="font-black leading-[0.82] tracking-tight"
                style={{ fontSize: `${numSize}px` }}
              >
                {number}
              </GradientText>
              {unitSuffix && (
                <span
                  className="font-black tracking-tight"
                  style={{
                    color: accent,
                    fontSize: `${Math.max(48, Math.round(numSize * 0.32))}px`,
                    lineHeight: 1.05, opacity: 0.9,
                    paddingBottom: `${Math.round(numSize * 0.08)}px`,
                  }}
                >
                  {unitSuffix}
                </span>
              )}
            </div>
          )}

          {/* Divisor de acento */}
          <div
            className="h-[3px] w-24 rounded-full mx-auto mb-9"
            style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
          />

          <h1
            className={`${headlineSize(headline)} font-black uppercase leading-[1.08] tracking-tight max-w-[760px] mx-auto`}
            style={{ ...hStyle, textShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
          >
            {headline}
          </h1>

          {bodyText && (
            <p className={`${bodySize(bodyText)} text-white/75 font-medium leading-[1.45] mt-6 max-w-[700px] mx-auto`} style={bStyle}>
              {bodyText}
            </p>
          )}
        </GlassPanel>
      </div>

      {/* Footer — call-to-think + assinatura */}
      <div className="relative z-10 px-[70px] pb-[64px] flex items-center justify-between gap-6">
        {callToThink ? (
          <div className="flex items-start gap-3 max-w-[760px]">
            <div className="h-[24px] w-[3px] rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: accent }} />
            <p className="text-[22px] font-semibold leading-[1.35]" style={{ color: accent, opacity: 0.95 }}>
              {callToThink}
            </p>
          </div>
        ) : (
          <span />
        )}
        <Signature handle={handle} accent={accent} />
      </div>

      <FilmGrain opacity={0.05} blend="soft-light" />
    </div>
  );
};
