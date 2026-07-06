import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Caption } from "@remotion/captions";
import { buildCues, activeCueIndex, type CueOptions } from "../../lib/cues";
import type { CaptionRenderer } from "../../lib/fxRegistry";
import type { CaptionTheme } from "../../lib/fxPlan";
import { SAFE_CAPTION_BOTTOM } from "../../lib/safeZones";
import { FONT_SANS, FONT_SERIF } from "../fonts";

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
// Hook serifado (dourado): contorno FINO sem blur grande — os traços finos da
// serifada somem sob blur pesado, então usamos só um outline escuro de 1.5px.
const STROKE_THIN =
  "-1px -1px 0 rgba(30,18,0,.9), 1px 1px 0 rgba(30,18,0,.9), 1px -1px 0 rgba(30,18,0,.9), " +
  "-1px 1px 0 rgba(30,18,0,.9), 0 3px 10px rgba(0,0,0,.85), 0 0 3px rgba(0,0,0,.9)";

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
  /** VEX-caption: fim do hook (frames) — legenda performática vale só até aqui. */
  hookEndFrame?: number;
}> = ({
  captions,
  accentColor,
  fontFamily = "system-ui, sans-serif",
  renderer = "word-pop",
  cueOptions,
  keywords,
  theme,
  hookEndFrame = 0,
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

  // ── Tema + fontes REAIS (identificadas nos benchmarks) ────────────────────
  const isHook = theme?.hookStyle === "serif-gold" && frame < hookEndFrame; // Playfair dourado
  const isTogi = renderer === "gradient"; // Montserrat branco + wipe azul (karaokê)
  const base = theme?.baseColor ?? "#fff";
  const active = theme?.activeColor ?? accentColor;
  const fontSize = theme?.fontSize ?? 64;
  const upper = theme?.uppercase ?? true;
  const boxed = theme?.boxed ?? !(renderer === "clean" || isTogi);
  const togiBlue = theme?.gradientFrom ?? "#2E86F0"; // azul do preenchimento karaokê
  const HOOK_GOLD = "#F4D06A";
  // Família por estilo: hook → Playfair; clean/togi/word-pop → Montserrat; senão brand.
  const blockFont = isHook
    ? FONT_SERIF
    : renderer === "clean" || isTogi || renderer === "word-pop"
      ? FONT_SANS
      : fontFamily;

  let wordCounter = 0;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: captionPadBottom }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isHook ? 2 : 6,
          maxWidth: "92%",
          fontFamily: blockFont,
          ...(boxed
            ? { background: "rgba(8,8,16,0.55)", padding: "16px 28px", borderRadius: 22, backdropFilter: "blur(2px)", boxShadow: "0 12px 50px rgba(0,0,0,.45)" }
            : {}),
        }}
      >
        {cue.lines.map((line, li) => (
          <div key={li} style={{ display: "flex", flexWrap: "nowrap", justifyContent: "center", alignItems: "flex-end", gap: isHook ? 18 : 14 }}>
            {line.map((w) => {
              const k = wordCounter++;
              const isActive = k === activeWord;
              const isKeyword = kwSet.has(norm(w.text));
              const highlight = isActive || isKeyword;
              const isNumber = /[0-9%]/.test(w.text);

              // Entrada dinâmica por palavra (motion design): spring do início da
              // própria palavra → as palavras "pulam" à medida que são ditas.
              const enter = spring({
                frame: frame - (w.startMs / 1000) * fps, fps,
                config: { damping: isHook ? 11 : 13, mass: 0.55 },
                durationInFrames: isHook ? 16 : 9,
              });

              let fill: React.CSSProperties;
              let wShadow = STROKE;
              let wScale = 1;
              let wSize = fontSize;
              let wFamily: string | undefined;

              if (isHook) {
                // Talis v1: Playfair dourado, número/keyword ENORME, entrada dramática.
                fill = { color: HOOK_GOLD };
                wFamily = FONT_SERIF;
                wSize = Math.round(fontSize * (isNumber ? 1.9 : highlight ? 1.35 : 1.15));
                wShadow = STROKE_THIN;
                wScale = 0.55 + enter * 0.45;
              } else if (isTogi) {
                // togi: Montserrat branco, palavra JÁ falada em AZUL (karaokê) —
                // cor SÓLIDA (background-clip:text é instável no Player) + stroke
                // forte = alto contraste branco/azul sobre o vídeo.
                const spoken = k < activeWord || (isActive && ms >= (w.startMs + w.endMs) / 2);
                fill = { color: spoken ? togiBlue : "#ffffff" };
                wShadow = STROKE;
                wScale = isActive ? 0.96 + enter * 0.12 : 1;
              } else {
                const solid = renderer === "clean" || renderer === "mono-bold" ? base : highlight ? active : base;
                fill = { color: solid };
                wScale = isActive && renderer === "word-pop" ? 0.9 + pop * 0.24 : 1;
              }

              return (
                <span
                  key={`${w.startMs}-${k}`}
                  style={{
                    fontSize: wSize,
                    fontFamily: wFamily,
                    fontWeight: isHook ? 800 : 900,
                    letterSpacing: isHook ? 0.5 : isTogi ? 0 : -1,
                    textTransform: upper ? "uppercase" : "none",
                    textShadow: wShadow,
                    transform: `scale(${wScale})`,
                    transformOrigin: "center bottom",
                    opacity: isHook ? enter : 1,
                    borderBottom:
                      !isHook && !isTogi && isActive && renderer === "underline" ? `8px solid ${active}` : "none",
                    lineHeight: isHook ? 0.96 : 1.04,
                    display: "inline-block",
                    whiteSpace: "nowrap",
                    ...fill,
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
