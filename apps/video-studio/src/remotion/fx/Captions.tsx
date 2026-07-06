import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Caption } from "@remotion/captions";
import { buildCues, activeCueIndex, type CueOptions } from "../../lib/cues";
import type { CaptionRenderer } from "../../lib/fxRegistry";
import type { CaptionTheme } from "../../lib/fxPlan";
import { SAFE_CAPTION_BOTTOM } from "../../lib/safeZones";

/**
 * Legendas por CUE (bloco estável de 1–2 linhas), padrão Netflix adaptado ao
 * 9:16 viral. A cue entra e sai inteira; o destaque "karaokê" anda só dentro
 * dela — sem a repetição/interrupção da antiga janela deslizante. Mantém scrim
 * (legibilidade sobre fundo claro), contorno e destaque de keywords on-brand.
 */

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

const STROKE =
  "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, " +
  "0 2px 0 #000, 2px 0 0 #000, 0 -2px 0 #000, -2px 0 0 #000, 0 6px 22px rgba(0,0,0,.9)";
// togi/gradient: contorno LEVE para não abafar o fill do gradiente (alto
// contraste vem do bold caixa-alta + sombra suave), preservando legibilidade.
const STROKE_SOFT =
  "-1px -1px 0 rgba(0,0,0,.55), 1px 1px 0 rgba(0,0,0,.55), 0 3px 16px rgba(0,0,0,.7)";

export const CaptionsOverlay: React.FC<{
  captions: Caption[];
  accentColor: string;
  fontFamily?: string;
  renderer?: CaptionRenderer;
  /** Calibração do chunking (estilo: nº de linhas/palavras, etc.). */
  cueOptions?: CueOptions;
  /** Keywords do LÉXICO do cliente (VEX-05) — substitui o Set hardcoded. */
  keywords?: string[];
  /** Personalização visual (cor/tamanho/caixa/gradiente). */
  theme?: CaptionTheme;
}> = ({
  captions,
  accentColor,
  fontFamily = "system-ui, sans-serif",
  renderer = "word-pop",
  cueOptions,
  keywords,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  // VEX-10: padding derivado das safe-zones (era o número mágico 430 @1920px).
  const captionPadBottom = Math.round(height * SAFE_CAPTION_BOTTOM);

  const kwSet = React.useMemo(
    () => new Set((keywords ?? []).map(norm).filter(Boolean)),
    [keywords],
  );
  const cues = React.useMemo(() => buildCues(captions, cueOptions), [captions, cueOptions]);
  const idx = activeCueIndex(cues, ms);
  if (idx < 0) return null;
  const cue = cues[idx];

  // Palavra ativa (karaokê) dentro da cue.
  let activeWord = -1;
  for (let k = 0; k < cue.words.length; k++) {
    if (ms >= cue.words[k].startMs) activeWord = k;
    else break;
  }
  const activeStartMs = activeWord >= 0 ? cue.words[activeWord].startMs : cue.startMs;
  const pop = spring({
    frame: frame - (activeStartMs / 1000) * fps,
    fps,
    config: { damping: 13, mass: 0.5 },
    durationInFrames: 9,
  });

  // ── Tema (customização + defaults on-brand / extraídos de benchmark) ──────
  const base = theme?.baseColor ?? "#fff";
  const active = theme?.activeColor ?? accentColor;
  const fontSize = theme?.fontSize ?? 64;
  const upper = theme?.uppercase ?? true;
  // `clean` (Talis miolo) e `gradient` (togi) não usam a caixa por padrão.
  const boxed = theme?.boxed ?? !(renderer === "clean" || renderer === "gradient");
  const gFrom = theme?.gradientFrom ?? "#4AA3F0"; // togi: azul vibrante → branco
  const gTo = theme?.gradientTo ?? "#FFFFFF";

  let wordCounter = 0;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: captionPadBottom }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          maxWidth: "90%",
          fontFamily,
          ...(boxed
            ? { background: "rgba(8,8,16,0.55)", padding: "16px 28px", borderRadius: 22, backdropFilter: "blur(2px)", boxShadow: "0 12px 50px rgba(0,0,0,.45)" }
            : {}),
        }}
      >
        {cue.lines.map((line, li) => (
          <div key={li} style={{ display: "flex", flexWrap: "nowrap", justifyContent: "center", alignItems: "center", gap: 14 }}>
            {line.map((w) => {
              const k = wordCounter++;
              const isActive = k === activeWord;
              const isKeyword = kwSet.has(norm(w.text));
              const highlight = isActive || isKeyword;

              // Estilo por renderer ────────────────────────────────────────
              const gradient = renderer === "gradient";
              // cor: gradient = fill via background-clip; clean/mono = base;
              // word-pop/underline = base, destaque na palavra ativa/keyword.
              const solidColor =
                renderer === "clean" || renderer === "mono-bold"
                  ? base
                  : highlight ? active : base;
              const scale = isActive && (renderer === "word-pop" || renderer === "gradient")
                ? 0.9 + pop * 0.24 : 1;

              const gradientStyle: React.CSSProperties = gradient
                ? { backgroundImage: `linear-gradient(100deg, ${gFrom} 0%, ${gTo} 100%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent" }
                : { color: solidColor };

              return (
                <span
                  key={`${w.startMs}-${k}`}
                  style={{
                    fontSize,
                    fontWeight: 900,
                    letterSpacing: -1,
                    textTransform: upper ? "uppercase" : "none",
                    textShadow: gradient ? STROKE_SOFT : STROKE,
                    transform: `scale(${scale})`,
                    transformOrigin: "center bottom",
                    borderBottom:
                      isActive && renderer === "underline" ? `8px solid ${active}` : "none",
                    lineHeight: 1.04,
                    display: "inline-block",
                    whiteSpace: "nowrap",
                    ...gradientStyle,
                  }}
                >
                  {w.text}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
