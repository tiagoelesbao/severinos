import React from "react";

/**
 * Brasão do Império — coroa vetorial de verdade (Rota A do `ae-spec.md`:
 * recriar em vetor, não usar o PNG 288×243 em upscale). Geometria construída
 * em código a partir do `logo.png` de referência (5 pontas com esfera, faixa
 * com 5 estrelas, base dupla em swoosh), não um círculo+estrela genérico.
 *
 * Tudo gerado por fórmula (pontas, vale, estrelas) a partir de um punhado de
 * constantes — reescalável sem perder proporção, e ajustável sem redesenhar
 * path à mão.
 */

const VIEW_W = 400;
const VIEW_H = 340;

// 5 pontas (a do centro mais alta, como na referência da marca).
const TIP_X = [40, 130, 200, 270, 360];
const TIP_Y = [128, 92, 60, 92, 128];
const BALL_R = [12, 13, 15, 13, 12];
const BASE_Y = 272;
const BASE_L = 20;
const BASE_R = 380;

// Vale entre pontas consecutivas — X no meio do caminho, Y mais baixo (dip).
const VALLEY_X = TIP_X.slice(0, -1).map((x, i) => (x + TIP_X[i + 1]) / 2);
const VALLEY_Y = [196, 176, 176, 196];

/** Corpo da coroa: subida reta até cada ponta (pico vivo), vale arredondado
 * (curva quadrática) entre pontas — não um zigue-zague genérico. */
function buildCrownBody(): string {
  let d = `M ${BASE_L} ${BASE_Y} L ${TIP_X[0]} ${TIP_Y[0]} `;
  for (let i = 0; i < VALLEY_X.length; i++) {
    d += `Q ${VALLEY_X[i]} ${VALLEY_Y[i]} ${TIP_X[i + 1]} ${TIP_Y[i + 1]} `;
  }
  d += `L ${BASE_R} ${BASE_Y} Z`;
  return d;
}

/** Estrela de 5 pontas clássica, path próprio (não "circulo+estrela" — aqui a
 * estrela É a estrela, usada em miniatura na faixa). */
function starPath(cx: number, cy: number, outerR: number, innerR: number): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    // -90° (topo) como ponto inicial, 10 vértices (5 pontas).
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `${points.join(" ")} Z`;
}

const BAND_Y = BASE_Y;
const BAND_H = 46;
const STAR_COUNT = 5;
const STAR_OUTER = 13;
const STAR_INNER = 5.2;

const CROWN_BODY_D = buildCrownBody();

/** Base dupla ("swoosh"): duas faixas curvas finas, levemente defasadas —
 * mesma leitura do `logo.png` original (duas linhas onduladas na base). */
function swooshPath(yOffset: number, dip: number): string {
  const y = BAND_Y + BAND_H + yOffset;
  const midY = y + dip;
  return `M ${BASE_L + 6} ${y} C ${BASE_L + 100} ${midY}, ${BASE_R - 100} ${midY}, ${BASE_R - 6} ${y}`;
}

export interface CrownProps {
  /** Largura final em px (a altura segue a proporção do viewBox). */
  width: number;
  /** Opcional: id único do gradiente, para não colidir se houver 2 coroas na tela. */
  gradientId?: string;
  goldDark?: string;
  goldLight?: string;
  /** Glow (drop-shadow) por baixo da coroa — desligável. */
  glow?: boolean;
}

export const Crown: React.FC<CrownProps> = ({
  width,
  gradientId = "crownGold",
  goldDark = "#e3a73e",
  goldLight = "#f4c869",
  glow = true,
}) => {
  const height = (width * VIEW_H) / VIEW_W;
  const gid = gradientId;
  const starXs = Array.from({ length: STAR_COUNT }, (_, i) => {
    const t = (i + 1) / (STAR_COUNT + 1);
    return BASE_L + 18 + t * (BASE_R - BASE_L - 36);
  });
  const starY = BAND_Y + BAND_H / 2;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      style={glow ? { filter: `drop-shadow(0 18px 34px rgba(227,167,62,0.55))` } : undefined}
    >
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={goldDark} />
          <stop offset="100%" stopColor={goldLight} />
        </linearGradient>
        <linearGradient id={`${gid}-band`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={goldLight} />
          <stop offset="100%" stopColor={goldDark} />
        </linearGradient>
        <radialGradient id={`${gid}-ball`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fff7e0" />
          <stop offset="45%" stopColor={goldLight} />
          <stop offset="100%" stopColor={goldDark} />
        </radialGradient>
      </defs>

      {/* Corpo (5 pontas) */}
      <path d={CROWN_BODY_D} fill={`url(#${gid})`} stroke={goldDark} strokeWidth={2} strokeLinejoin="round" />

      {/* Esferas no topo de cada ponta */}
      {TIP_X.map((x, i) => (
        <circle key={`ball-${i}`} cx={x} cy={TIP_Y[i] - 4} r={BALL_R[i]} fill={`url(#${gid}-ball)`} stroke={goldDark} strokeWidth={1} />
      ))}

      {/* Faixa com as 5 estrelas */}
      <rect
        x={BASE_L}
        y={BAND_Y}
        width={BASE_R - BASE_L}
        height={BAND_H}
        rx={BAND_H / 2}
        fill={`url(#${gid}-band)`}
        stroke={goldDark}
        strokeWidth={1.5}
      />
      {starXs.map((x, i) => (
        <path key={`star-${i}`} d={starPath(x, starY, STAR_OUTER, STAR_INNER)} fill="#fdf6e6" />
      ))}

      {/* Base dupla (swoosh) */}
      <path d={swooshPath(6, 16)} fill="none" stroke={`url(#${gid})`} strokeWidth={9} strokeLinecap="round" />
      <path d={swooshPath(20, 12)} fill="none" stroke={goldDark} strokeWidth={6} strokeLinecap="round" opacity={0.85} />
    </svg>
  );
};
