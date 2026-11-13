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
  const coreGlow = accentColor || '#7B5BFF';
  const altGlow = accentAlt || '#7B5BFF';
  const auroraGlow = accentAurora || '#2DE2C8';

  // Grade de pontos técnica (mesma linguagem do site: dot-grid tingido com o
  // accent do cliente, bem sutil — reforça a leitura "tech/engineered" sem
  // competir com o texto).
  const dotGridDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28'><circle cx='1' cy='1' r='1' fill='${altGlow}'/></svg>`
  )}`;

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
          {/* Dot-grid técnico — mesma textura do site, tingida com o accent alt */}
          <div
            className="absolute inset-0 opacity-[0.16]"
            style={{ backgroundImage: `url("${dotGridDataUri}")`, backgroundSize: '28px 28px' }}
          />
          {/* Glow central atrás do conteúdo — dá profundidade de "atmosfera" sem virar mancha */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[55%] rounded-full blur-[180px]"
            style={{ backgroundColor: coreGlow, opacity: 0.14 }}
          />
          {/* Mesh de 3 blobs em profundidades/blur distintos — substitui o glow duplo achatado por uma atmosfera em camadas */}
          <div
            className="absolute -top-[18%] -right-[12%] w-[62%] h-[62%] rounded-full blur-[150px]"
            style={{ backgroundColor: altGlow, opacity: 0.4 }}
          />
          <div
            className="absolute -bottom-[20%] -left-[14%] w-[56%] h-[56%] rounded-full blur-[150px]"
            style={{ backgroundColor: auroraGlow, opacity: 0.28 }}
          />
          <div
            className="absolute top-[8%] left-[6%] w-[30%] h-[30%] rounded-full blur-[110px]"
            style={{ backgroundColor: coreGlow, opacity: 0.18 }}
          />
          {/* "Boolean rings" — dois anéis finos sobrepostos, motivo geométrico tech/IA sutil no canto, sem competir com o texto */}
          <svg
            className="absolute -bottom-[6%] -right-[6%] w-[46%] h-[46%] opacity-[0.22] mix-blend-screen"
            viewBox="0 0 400 400"
            fill="none"
          >
            <circle cx="240" cy="220" r="150" stroke={altGlow} strokeWidth="1.5" />
            <circle cx="180" cy="160" r="110" stroke={auroraGlow} strokeWidth="1.5" />
          </svg>
        </>
      )}
      {image && (
        <div className="absolute inset-0">
          <img src={image} alt="Background" className="w-full h-full object-cover mix-blend-luminosity opacity-40" />
          <div
            className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full blur-[120px] animate-pulse"
            style={{ backgroundColor: accentColor || '#FF5B3F', opacity: 0.2 }}
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
