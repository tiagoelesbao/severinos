import React from 'react';

interface PremiumBackgroundProps {
  image?: string;
  theme?: 'dark' | 'light';
  overlayOpacity?: number;
  noise?: boolean;
  /**
   * Brand-agnostic palette overrides (MKT-MC4-05). Quando omitidos, mantém o
   * comportamento Virals (CSS vars --virals-*). Quando preenchidos pelo
   * orquestrador a partir de `brand_tokens.palette` do brief, o background
   * adota a paleta canônica do cliente (ex.: Tiago preto profundo + âmbar).
   */
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  accentAlt?: string;
  accentAurora?: string;
}

export const PremiumBackground: React.FC<PremiumBackgroundProps> = ({
  image,
  theme = 'dark',
  noise = true,
  primaryColor,
  secondaryColor,
  accentColor,
  accentAlt,
  accentAurora,
}) => {
  const isDark = theme === 'dark';
  const hasCustomPalette = Boolean(primaryColor || secondaryColor || accentAlt || accentAurora);

  // Modo back-compat (Virals): mantém classes CSS originais com CSS vars do tema.
  if (!hasCustomPalette) {
    return (
      <div className="absolute inset-0 z-0 overflow-hidden bg-virals-primary">
        <div
          className={`absolute inset-0 transition-colors duration-500 ${
            isDark
              ? 'bg-gradient-to-br from-virals-primary via-virals-secondary to-black'
              : 'bg-gradient-to-br from-white via-gray-100 to-gray-200'
          }`}
        />
        {isDark && (
          <>
            <div className="absolute -top-[18%] -right-[12%] w-[62%] h-[62%] rounded-full blur-[150px] opacity-40 bg-virals-accent-alt" />
            <div className="absolute -bottom-[20%] -left-[14%] w-[56%] h-[56%] rounded-full blur-[150px] opacity-30 bg-virals-aurora" />
          </>
        )}
        {image && (
          <div className="absolute inset-0">
            <img src={image} alt="Background" className="w-full h-full object-cover mix-blend-luminosity opacity-40" />
            <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-virals-accent/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-virals-accent-alt/20 rounded-full blur-[100px]" />
          </div>
        )}
        {noise && (
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
            style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.85'/></svg>")` }}
          />
        )}
        <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.4)]" />
      </div>
    );
  }

  // Modo brand-agnostic: paleta do cliente vinda do brief.
  const primary = primaryColor || '#0C0A1F';
  const secondary = secondaryColor || '#181436';
  const altGlow = accentAlt || '#7B5BFF';
  const auroraGlow = accentAurora || '#2DE2C8';

  return (
    <div
      className="absolute inset-0 z-0 overflow-hidden"
      style={{ backgroundColor: primary }}
    >
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{
          background: isDark
            ? `linear-gradient(135deg, ${primary} 0%, ${secondary} 60%, #000000 100%)`
            : `linear-gradient(135deg, #ffffff 0%, #f3f4f6 60%, #e5e7eb 100%)`,
        }}
      />
      {isDark && (
        <>
          <div
            className="absolute -top-[18%] -right-[12%] w-[62%] h-[62%] rounded-full blur-[150px]"
            style={{ backgroundColor: altGlow, opacity: 0.4 }}
          />
          <div
            className="absolute -bottom-[20%] -left-[14%] w-[56%] h-[56%] rounded-full blur-[150px]"
            style={{ backgroundColor: auroraGlow, opacity: 0.3 }}
          />
        </>
      )}
      {image && (
        <div className="absolute inset-0">
          <img src={image} alt="Background" className="w-full h-full object-cover mix-blend-luminosity opacity-40" />
          <div
            className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full blur-[120px] animate-pulse"
            style={{ backgroundColor: accentColor || '#FF3D68', opacity: 0.2 }}
          />
          <div
            className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full blur-[100px]"
            style={{ backgroundColor: altGlow, opacity: 0.2 }}
          />
        </div>
      )}
      {noise && (
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
          style={{ backgroundImage: `url('https://grainy-gradients.vercel.app/noise.svg')` }}
        />
      )}
      <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.4)]" />
    </div>
  );
};
