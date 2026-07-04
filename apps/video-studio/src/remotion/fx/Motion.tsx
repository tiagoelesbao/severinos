import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { isRenderableNumber } from "../../lib/fxRegistry";

/** Barra de progresso de retenção no topo (com brilho + ponta). */
export const ProgressBar: React.FC<{ accentColor: string }> = ({ accentColor }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  const w = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, width], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start" }}>
      <div style={{ position: "relative", height: 10, width: w, background: accentColor, boxShadow: `0 0 16px ${accentColor}aa` }}>
        <div style={{ position: "absolute", right: -4, top: -3, width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: `0 0 12px ${accentColor}` }} />
      </div>
    </AbsoluteFill>
  );
};

/**
 * Número-herói gigante. GUARD (AC5): só renderiza se `value` for um número REAL
 * e não-vazio (isRenderableNumber) — preset de número não inventa dado.
 */
export const BigNumber: React.FC<{
  value: unknown;
  unit?: string;
  accentColor: string;
  fontFamily?: string;
}> = ({ value, unit, accentColor, fontFamily = "system-ui, sans-serif" }) => {
  if (!isRenderableNumber(value)) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, fontFamily }}>
        <span style={{ fontSize: 280, fontWeight: 900, color: accentColor, lineHeight: 1 }}>
          {String(value)}
        </span>
        {unit ? <span style={{ fontSize: 80, fontWeight: 800, color: "#fff" }}>{unit}</span> : null}
      </div>
    </AbsoluteFill>
  );
};
