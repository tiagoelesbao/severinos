import React from 'react';

/**
 * fx — Biblioteca de primitivos visuais "grau Photoshop" (MED-DS-01).
 *
 * Tudo aqui é render-safe no Chromium/Playwright (sem dependência de rede):
 * mix-blend-mode, filtros, gradientes radiais/cônicos, máscaras, grain SVG inline,
 * backdrop-blur. São os "ajustes/efeitos" que dão profundidade, luz, sombra e
 * textura — o que separa um asset chapado de um editado por profissional.
 *
 * Cada template compõe estes primitivos via <Backdrop mood=...> + decorações.
 */

export type Mood = 'editorial' | 'cinematic' | 'technical' | 'data' | 'diary';

export interface Palette {
  primary: string;
  secondary: string;
  accent: string;
  accentAlt: string;
  accentAurora: string;
}

// Default = paleta Virals (navy/coral). Clientes não-Virals (ex.: Tiago âmbar)
// passam sua paleta explicitamente via props → resolvePalette.
export const DEFAULT_PALETTE: Palette = {
  primary: '#0C0A1F',
  secondary: '#181436',
  accent: '#FF3D68',
  accentAlt: '#7B5BFF',
  accentAurora: '#2DE2C8',
};

/** Normaliza props soltas de paleta (vindas dos templates) num Palette completo. */
export function resolvePalette(p: Partial<Palette> & {
  primaryColor?: string; secondaryColor?: string; accentColor?: string;
  accentAlt?: string; accentAurora?: string;
}): Palette {
  return {
    primary: p.primary || p.primaryColor || DEFAULT_PALETTE.primary,
    secondary: p.secondary || p.secondaryColor || DEFAULT_PALETTE.secondary,
    accent: p.accent || p.accentColor || DEFAULT_PALETTE.accent,
    accentAlt: p.accentAlt || DEFAULT_PALETTE.accentAlt,
    accentAurora: p.accentAurora || DEFAULT_PALETTE.accentAurora,
  };
}

/** Converte #RRGGBB → rgba(r,g,b,a). */
export function rgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h.padEnd(6, '0').slice(0, 6);
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Film grain — textura analógica via SVG fractalNoise inline (zero rede).
// ─────────────────────────────────────────────────────────────────────────────
export function FilmGrain({
  opacity = 0.07,
  blend = 'overlay',
  frequency = 0.9,
}: {
  opacity?: number;
  blend?: React.CSSProperties['mixBlendMode'];
  frequency?: number;
}) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${frequency}' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.9'/></svg>`;
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        opacity,
        mixBlendMode: blend,
        backgroundImage: `url("data:image/svg+xml;utf8,${svg}")`,
        backgroundSize: '220px 220px',
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vinheta — escurece bordas, foca o centro (inner shadow + radial).
// ─────────────────────────────────────────────────────────────────────────────
export function Vignette({ strength = 0.55 }: { strength?: number }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `radial-gradient(120% 90% at 50% 42%, transparent 45%, rgba(0,0,0,${strength}) 100%)`,
        boxShadow: `inset 0 0 200px rgba(0,0,0,${strength * 0.9})`,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Glow orb — esfera de luz desfocada (a "luz" que caracteriza os objetos).
// ─────────────────────────────────────────────────────────────────────────────
export function GlowOrb({
  color, x = '50%', y = '50%', size = 600, opacity = 0.4, blur = 150, blend,
}: {
  color: string; x?: string; y?: string; size?: number;
  opacity?: number; blur?: number; blend?: React.CSSProperties['mixBlendMode'];
}) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x, top: y, width: size, height: size,
        transform: 'translate(-50%, -50%)',
        backgroundColor: color, opacity, filter: `blur(${blur}px)`,
        mixBlendMode: blend,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Light leak — faixa de luz diagonal (blend screen) — vazamento de luz de filme.
// ─────────────────────────────────────────────────────────────────────────────
export function LightLeak({
  color, opacity = 0.5, angle = 120,
}: {
  color: string; opacity?: number; angle?: number;
}) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        opacity,
        mixBlendMode: 'screen',
        background: `linear-gradient(${angle}deg, transparent 30%, ${rgba(color, 0.55)} 50%, transparent 70%)`,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Grid pontilhado / linhas — textura técnica (didático/blueprint).
// ─────────────────────────────────────────────────────────────────────────────
export function DottedGrid({
  color = 'rgba(255,255,255,0.08)', gap = 40, kind = 'dot', opacity = 1,
}: {
  color?: string; gap?: number; kind?: 'dot' | 'line'; opacity?: number;
}) {
  const bg = kind === 'dot'
    ? `radial-gradient(${color} 1.5px, transparent 1.6px)`
    : `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`;
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ opacity, backgroundImage: bg, backgroundSize: `${gap}px ${gap}px` }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Texto com preenchimento em gradiente (bg-clip-text).
// ─────────────────────────────────────────────────────────────────────────────
export function GradientText({
  colors, angle = 135, className = '', style, children,
}: {
  colors: string[]; angle?: number; className?: string;
  style?: React.CSSProperties; children: React.ReactNode;
}) {
  return (
    <span
      className={className}
      style={{
        backgroundImage: `linear-gradient(${angle}deg, ${colors.join(', ')})`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Painel de vidro — glassmorphism (backdrop-blur + borda + highlight interno).
// ─────────────────────────────────────────────────────────────────────────────
export function GlassPanel({
  className = '', style, children, tint = 'rgba(255,255,255,0.06)', radius = 32,
}: {
  className?: string; style?: React.CSSProperties; children?: React.ReactNode;
  tint?: string; radius?: number;
}) {
  return (
    <div
      className={`relative ${className}`}
      style={{
        background: tint,
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderRadius: radius,
        border: '1px solid rgba(255,255,255,0.14)',
        boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.18)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Numeral-fantasma — número gigante translúcido ao fundo (editorial/data).
// ─────────────────────────────────────────────────────────────────────────────
export function GhostNumeral({
  value, color = '#FFFFFF', opacity = 0.05, className = '', style,
}: {
  value: React.ReactNode; color?: string; opacity?: number;
  className?: string; style?: React.CSSProperties;
}) {
  return (
    <span
      className={`absolute font-black leading-none pointer-events-none select-none ${className}`}
      style={{ color, opacity, ...style }}
    >
      {value}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AtmosphereOverlay — atmosfera da marca SOBRE uma imagem de fundo.
// Mesma linguagem de luz/cor/grão do Backdrop, porém TRANSLÚCIDA (sem o
// gradiente-base opaco) — a foto continua visível, mas ganha a "cara" da marca
// e legibilidade para o texto. Parametrizado por mood + intensidade.
// ─────────────────────────────────────────────────────────────────────────────
export function AtmosphereOverlay({
  palette,
  mood = 'editorial',
  strength = 0.65,
  className = 'absolute inset-0',
}: {
  palette: Palette;
  mood?: Mood;
  strength?: number;
  className?: string;
}) {
  const p = palette;
  const s = Math.max(0, Math.min(1, strength));

  // Lavagem de cor da marca por mood (rgba → a imagem aparece por baixo).
  const wash: Record<Mood, string> = {
    editorial: `linear-gradient(160deg, ${rgba(p.primary, 0.85)} 0%, ${rgba(p.secondary, 0.4)} 50%, ${rgba('#000000', 0.85)} 100%)`,
    cinematic: `radial-gradient(120% 100% at 30% 22%, ${rgba(p.secondary, 0.55)} 0%, ${rgba(p.primary, 0.78)} 55%, ${rgba('#000000', 0.92)} 100%)`,
    technical: `linear-gradient(180deg, ${rgba(p.primary, 0.7)} 0%, ${rgba(p.secondary, 0.68)} 100%)`,
    data: `radial-gradient(100% 85% at 50% 36%, ${rgba(p.secondary, 0.5)} 0%, ${rgba(p.primary, 0.8)} 60%, ${rgba('#000000', 0.9)} 100%)`,
    diary: `linear-gradient(155deg, ${rgba(p.secondary, 0.55)} 0%, ${rgba(p.primary, 0.78)} 70%, ${rgba('#000000', 0.88)} 100%)`,
  };

  return (
    <div className={`${className} overflow-hidden pointer-events-none`}>
      {/* Lavagem de marca */}
      <div className="absolute inset-0" style={{ background: wash[mood], opacity: s }} />
      {/* Scrim inferior — garante leitura do texto sobre a foto */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(0deg, ${rgba('#000000', 0.82)} 0%, transparent 44%)`,
          opacity: 0.45 + 0.55 * s,
        }}
      />
      {/* Luzes por mood (blend com a imagem) */}
      {mood === 'editorial' && (
        <>
          <GlowOrb color={p.accent} x="86%" y="8%" size={620} opacity={0.3 * s} blur={170} blend="screen" />
          <GlowOrb color={p.accentAlt} x="6%" y="100%" size={520} opacity={0.2 * s} blur={170} blend="screen" />
        </>
      )}
      {mood === 'cinematic' && (
        <>
          <GlowOrb color={p.accent} x="50%" y="32%" size={760} opacity={0.24 * s} blur={200} blend="screen" />
          <LightLeak color={p.accentAurora} opacity={0.4 * s} angle={115} />
          <LightLeak color={p.accentAlt} opacity={0.22 * s} angle={300} />
        </>
      )}
      {mood === 'technical' && (
        <>
          <DottedGrid color={rgba(p.accent, 0.14)} gap={54} kind="line" opacity={0.5 * s} />
          <GlowOrb color={p.accent} x="100%" y="0%" size={520} opacity={0.18 * s} blur={180} blend="screen" />
        </>
      )}
      {mood === 'data' && (
        <>
          <GlowOrb color={p.accent} x="50%" y="40%" size={680} opacity={0.34 * s} blur={180} blend="screen" />
          <GlowOrb color={p.accentAlt} x="14%" y="92%" size={420} opacity={0.18 * s} blur={160} blend="screen" />
        </>
      )}
      {mood === 'diary' && (
        <>
          <GlowOrb color={p.accentAurora} x="30%" y="18%" size={560} opacity={0.22 * s} blur={190} blend="screen" />
          <LightLeak color={p.accent} opacity={0.26 * s} angle={130} />
        </>
      )}
      <Vignette strength={(mood === 'cinematic' ? 0.6 : 0.46) * (0.6 + 0.4 * s)} />
      <FilmGrain opacity={(mood === 'cinematic' || mood === 'diary' ? 0.1 : 0.06) * s} frequency={0.9} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Backdrop — cena de fundo composta, parametrizada por "mood" (tipo de conteúdo).
// É a base premium que cada template usa no lugar do PremiumBackground chapado.
// ─────────────────────────────────────────────────────────────────────────────
export function Backdrop({
  palette,
  mood = 'editorial',
  image,
}: {
  palette: Palette;
  mood?: Mood;
  image?: string;
}) {
  const p = palette;

  // Gradiente-base por mood.
  const base: Record<Mood, string> = {
    editorial: `linear-gradient(160deg, ${p.primary} 0%, ${p.secondary} 55%, #000 100%)`,
    cinematic: `radial-gradient(120% 100% at 30% 20%, ${p.secondary} 0%, ${p.primary} 55%, #000 100%)`,
    technical: `linear-gradient(180deg, ${p.primary} 0%, ${p.secondary} 100%)`,
    data: `radial-gradient(100% 80% at 50% 38%, ${p.secondary} 0%, ${p.primary} 60%, #000 100%)`,
    diary: `linear-gradient(155deg, ${p.secondary} 0%, ${p.primary} 70%, #000 100%)`,
  };

  return (
    <div className="absolute inset-0 z-0 overflow-hidden" style={{ backgroundColor: p.primary }}>
      <div className="absolute inset-0" style={{ background: base[mood] }} />

      {/* Imagem de fundo opcional, dessaturada e fundida (luminosity). */}
      {image && (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt=""
            className="w-full h-full object-cover"
            style={{ mixBlendMode: 'luminosity', opacity: 0.35 }}
          />
        </div>
      )}

      {/* Luzes por mood */}
      {mood === 'editorial' && (
        <>
          <GlowOrb color={p.accent} x="88%" y="6%" size={620} opacity={0.28} blur={170} />
          <GlowOrb color={p.accentAlt} x="6%" y="100%" size={520} opacity={0.18} blur={170} />
          {/* Luz de leitura atrás do bloco de texto (espelha o ModeledCarouselSlide). */}
          <GlowOrb color={p.accent} x="22%" y="64%" size={520} opacity={0.12} blur={180} />
          <DottedGrid color={rgba('#ffffff', 0.05)} gap={46} opacity={0.5} />
        </>
      )}
      {mood === 'cinematic' && (
        <>
          <GlowOrb color={p.accent} x="50%" y="34%" size={760} opacity={0.22} blur={200} />
          <LightLeak color={p.accentAurora} opacity={0.4} angle={115} />
          <LightLeak color={p.accentAlt} opacity={0.22} angle={300} />
        </>
      )}
      {mood === 'technical' && (
        <>
          <DottedGrid color={rgba(p.accent, 0.12)} gap={54} kind="line" opacity={0.5} />
          <GlowOrb color={p.accent} x="100%" y="0%" size={520} opacity={0.16} blur={180} />
          {/* Luz de leitura atrás do conteúdo (paridade de brilho — MED-06/G2). */}
          <GlowOrb color={p.accent} x="28%" y="60%" size={480} opacity={0.1} blur={180} />
        </>
      )}
      {mood === 'data' && (
        <>
          <GlowOrb color={p.accent} x="50%" y="42%" size={680} opacity={0.32} blur={180} />
          <GlowOrb color={p.accentAlt} x="14%" y="92%" size={420} opacity={0.16} blur={160} />
        </>
      )}
      {mood === 'diary' && (
        <>
          <GlowOrb color={p.accentAurora} x="30%" y="18%" size={560} opacity={0.2} blur={190} />
          <LightLeak color={p.accent} opacity={0.25} angle={130} />
        </>
      )}

      <Vignette strength={mood === 'cinematic' ? 0.62 : 0.48} />
      <FilmGrain
        opacity={mood === 'cinematic' || mood === 'diary' ? 0.1 : 0.06}
        frequency={0.9}
      />
    </div>
  );
}
