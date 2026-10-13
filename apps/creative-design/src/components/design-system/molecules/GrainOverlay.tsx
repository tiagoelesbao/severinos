import React from 'react';

/**
 * GrainOverlay — textura noise sutil sobre qualquer background.
 *
 * Implementação: SVG feTurbulence inline (data URI) para zero asset externo.
 * Use sempre logo após o background base (PremiumBackground ou <img>) e antes
 * do content layer. z-index 5 garante essa ordem.
 *
 * Spec: TIAGO-V2-01 (design-system-v2.md seção 4.1).
 */
export interface GrainOverlayProps {
  opacity?: number;                                         // default 0.06
  blendMode?: 'overlay' | 'soft-light' | 'multiply';       // default overlay
  baseFrequency?: number;                                   // default 0.95
}

export const GrainOverlay: React.FC<GrainOverlayProps> = ({
  opacity = 0.06,
  blendMode = 'overlay',
  baseFrequency = 0.95,
}) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${baseFrequency}' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.85'/></svg>`;
  return (
    <div
      className="absolute inset-0 pointer-events-none z-[5]"
      style={{
        opacity,
        mixBlendMode: blendMode,
        backgroundImage: `url("data:image/svg+xml;utf8,${svg}")`,
        backgroundSize: '256px 256px',
      }}
    />
  );
};
