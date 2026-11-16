import React, { type ReactNode } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { HookRenderer } from "../../lib/fxRegistry";

/**
 * FX de hook (MVC-09 · AC1): aplicados sobre o 1º clip para maximizar a atenção
 * nos primeiros segundos (pesquisa-âncora 0–3s).
 *  - snap-zoom: entra com zoom abrupto que assenta;
 *  - whip: entra com deslize + blur (whip-pan);
 *  - hard-cut: sem efeito (corte seco).
 */
export const HookFx: React.FC<{ renderer: HookRenderer; children: ReactNode }> = ({
  renderer,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let transform = "none";
  let filter = "none";

  if (renderer === "snap-zoom") {
    const s = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 12 });
    transform = `scale(${interpolate(s, [0, 1], [1.4, 1])})`;
  } else if (renderer === "whip") {
    const p = interpolate(frame, [0, 8], [1, 0], { extrapolateRight: "clamp" });
    transform = `translateX(${p * 140}px)`;
    filter = `blur(${p * 14}px)`;
  }

  return <AbsoluteFill style={{ transform, filter }}>{children}</AbsoluteFill>;
};
