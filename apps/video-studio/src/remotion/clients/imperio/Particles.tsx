import React, { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { clamp01, easeInCubic, easeOutCubic, lerp, lerpHex, mulberry32 } from "../easing";

/**
 * Sistema de partículas "poeira vira pó de ouro" — canvas custom, não lib
 * genérica de partícula (que em geral anima por tempo real/RAF, incompatível
 * com o modelo de render da Remotion: cada frame é avaliado isoladamente e
 * precisa ser puramente função de `frame`). Pesquisa rápida confirmou que o
 * padrão recomendado pela própria Remotion para partícula é exatamente este:
 * canvas 2D redesenhado do zero a cada frame dentro de `useLayoutEffect`,
 * posição calculada analiticamente a partir do frame atual — nunca
 * acumulada/stateful.
 *
 * Determinístico: a nuvem usa um PRNG com seed fixa (mulberry32), então o
 * mesmo frame produz sempre a mesma imagem — essencial para o renderer headless,
 * que pode avaliar frames fora de ordem/paralelo.
 *
 * Duas fases, mesma partícula (não dois sistemas distintos — a continuidade é
 * o que faz a transição ler como "nasce da cena"):
 *  1) ESPALHA (ease-out cúbico) a partir do punho, ocre → dourado → dourado-claro.
 *  2) CONVERGE (ease-in cúbico) para o centro-topo (onde a coroa nasce), encolhendo
 *     o raio a 0 e migrando o centro do punho para a coroa.
 */
export interface ParticlesProps {
  width: number;
  height: number;
  mgFrame: number;
  igniteX: number;
  igniteY: number;
  crownX: number;
  crownY: number;
  count?: number;
  seed?: number;
  spreadStart?: number;
  spreadDuration?: number;
  convergeStart?: number;
  convergeDuration?: number;
}

interface Particle {
  angle: number;
  baseRadius: number;
  size: number;
  delay: number;
  convergeDelay: number;
  wobble: number;
}

function buildParticles(count: number, seed: number): Particle[] {
  const rand = mulberry32(seed);
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      angle: rand() * Math.PI * 2,
      baseRadius: 110 + rand() * 330,
      size: 2 + rand() * 5.5,
      delay: rand() * 7,
      convergeDelay: rand() * 7,
      wobble: rand() * Math.PI * 2,
    });
  }
  return particles;
}

const OCRE = "#c7823c";
const GOLD = "#e3a73e";
const GOLD_LIGHT = "#f4c869";

export const Particles: React.FC<ParticlesProps> = ({
  width,
  height,
  mgFrame,
  igniteX,
  igniteY,
  crownX,
  crownY,
  count = 180,
  seed = 7,
  spreadStart = 14,
  spreadDuration = 14,
  convergeStart = 36,
  convergeDuration = 12,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useMemo(() => buildParticles(count, seed), [count, seed]);

  const active = mgFrame >= spreadStart - 1 && mgFrame <= convergeStart + convergeDuration + 10;

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    if (!active) return;

    ctx.globalCompositeOperation = "lighter";

    for (const p of particles) {
      const tSpread = clamp01((mgFrame - spreadStart - p.delay) / spreadDuration);
      const spreadEased = easeOutCubic(tSpread);

      const tConverge = clamp01((mgFrame - convergeStart - p.convergeDelay) / convergeDuration);
      const convergeEased = easeInCubic(tConverge);

      const radius = p.baseRadius * spreadEased * (1 - convergeEased);
      const centerX = lerp(igniteX, crownX, convergeEased);
      const centerY = lerp(igniteY, crownY, convergeEased);

      // Leve deriva angular durante o "hold" (entre espalhar e convergir) —
      // sem isso a nuvem congela de forma artificial entre as duas fases.
      const drift = Math.sin(p.wobble + mgFrame * 0.025) * 0.06;
      const angle = p.angle + drift;

      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      // Cor: ocre (nasce da terra) → dourado de marca → dourado claro.
      const colorT = clamp01((mgFrame - spreadStart) / 20);
      const color =
        colorT < 0.5 ? lerpHex(OCRE, GOLD, colorT / 0.5) : lerpHex(GOLD, GOLD_LIGHT, (colorT - 0.5) / 0.5);

      // Opacidade: nasce com o espalhar, apaga ao pousar na coroa.
      const fadeIn = clamp01(tSpread * 3);
      const fadeOutLand = 1 - clamp01((tConverge - 0.82) / 0.18);
      const opacity = fadeIn * fadeOutLand;
      if (opacity <= 0.01) continue;

      const size = p.size * lerp(1, 0.4, convergeEased);

      ctx.save();
      ctx.globalAlpha = opacity;
      const glowR = size * 3.2;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, glowR);
      grad.addColorStop(0, color);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, glowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = Math.min(1, opacity * 1.3);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mgFrame, particles, active, width, height, igniteX, igniteY, crownX, crownY, spreadStart, spreadDuration, convergeStart, convergeDuration]);

  if (!active) return null;

  return (
    <AbsoluteFill>
      <canvas ref={canvasRef} width={width} height={height} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
