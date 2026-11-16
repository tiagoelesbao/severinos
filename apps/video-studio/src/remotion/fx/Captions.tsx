import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Caption } from "@remotion/captions";
import { buildCues, activeCueIndex, type CueOptions } from "../../lib/cues";
import type { CaptionRenderer } from "../../lib/fxRegistry";
import type { CaptionTheme } from "../../lib/fxPlan";
import { SAFE_CAPTION_BOTTOM } from "../../lib/safeZones";
import { FONT_SANS, FONT_SERIF, fontFamilyById } from "../fonts";

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
  const captionPadBottom = Math.round(height * (theme?.bottomPct ?? SAFE_CAPTION_BOTTOM));

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
  const togiBlue = theme?.gradientFrom ?? "#2E86F0"; // cor quente da cena azul (togi)
  const HOOK_GOLD = "#F4D06A";
  // ── Personalização universal (vale em QUALQUER estilo) ─────────────────────
  // Realce da palavra falada (karaokê): default liga em word-pop/underline e
  // desliga em clean/mono-bold; o toggle do usuário sobrepõe.
  const emphasisDefault = !(renderer === "clean" || renderer === "mono-bold");
  const emphasis = theme?.highlight ?? emphasisDefault;
  // Fonte escolhida sobrepõe o default do estilo.
  const fontOverride = theme?.fontFamily ? fontFamilyById(theme.fontFamily) : undefined;
  // Família padrão por estilo: hook → Playfair; clean/togi/word-pop → Montserrat; senão brand.
  const styleDefaultFont = isHook
    ? FONT_SERIF
    : renderer === "clean" || isTogi || renderer === "word-pop"
      ? FONT_SANS
      : fontFamily;
  const blockFont = fontOverride ?? styleDefaultFont;

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
              // Realce só quando a ênfase está ligada (universal, por estilo).
              const highlight = emphasis && (isActive || isKeyword);
              const isNumber = /[0-9%]/.test(w.text);

              // Entrada dinâmica por palavra (motion design): spring do início da
              // própria palavra → as palavras "pulam" à medida que são ditas.
              const enter = spring({
                frame: frame - (w.startMs / 1000) * fps, fps,
                config: { damping: isHook ? 11 : 13, mass: 0.55 },
                durationInFrames: isHook ? 16 : 9,
              });

              let fill: React.CSSProperties;
              let wShadow: string = STROKE;
              let wScale = 1;
              let wSize = fontSize;
              let wFamily: string | undefined;
              let wStroke: string | undefined; // -webkit-text-stroke (detalhe branco togi)
              let wFilter: string | undefined; // blur do hook / drop-shadow do togi
              // Motion extra do hook: cai de cima e "foca" (blur→0).
              let wTranslate = 0;

              if (isHook) {
                // Talis v1: Playfair dourado, número/keyword ENORME, entrada
                // dramática (motion design: overshoot de escala + drop + focus).
                fill = { color: theme?.activeColor ?? HOOK_GOLD };
                wFamily = fontOverride ?? FONT_SERIF;
                wSize = Math.round(fontSize * (isNumber ? 1.9 : highlight ? 1.35 : 1.15));
                wShadow = STROKE_THIN;
                // overshoot: passa de 1 e assenta (spring já dá o embalo).
                wScale = 0.5 + enter * 0.5;
                wTranslate = (1 - enter) * 36; // px, cai de cima
                const hb = (1 - enter) * 7; // px, entra desfocado e foca
                if (hb > 0.15) wFilter = `blur(${hb}px)`;
              } else if (isTogi) {
                // togi "MÁSCARA": as letras são uma JANELA pra uma cena AZUL em
                // MOVIMENTO — um gradiente azul desliza e é revelado só dentro do
                // texto (background-clip:text). O "detalhe branco"/alto contraste
                // vem de um traço branco em volta das letras. Caixa-alta, bleed.
                const shift = (frame * 1.7) % 200; // desliza a cena azul (loop)
                const tf = togiBlue; // ponto quente do gradiente (cor do destaque)
                fill = {
                  backgroundImage:
                    `linear-gradient(100deg, #04205f 0%, #1656c4 20%, ${tf} 38%, #cfe6ff 50%, ${tf} 62%, #1656c4 80%, #04205f 100%)`,
                  backgroundSize: "230% 100%",
                  backgroundPosition: `${shift}% 50%`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  WebkitTextFillColor: "transparent",
                } as React.CSSProperties;
                wShadow = "none"; // sombra escura sujaria o gradiente
                wStroke = `1.5px rgba(255,255,255,.92)`; // detalhe branco / contraste
                wFilter = "drop-shadow(0 4px 12px rgba(0,10,40,.65))"; // profundidade
                wSize = Math.round(fontSize * 1.12); // "bleed" maior
                wScale = emphasis && isActive ? 0.97 + enter * 0.08 : 1;
              } else {
                // Cor universal: com ênfase, a palavra falada/keyword ganha a cor
                // de destaque e vai avançando; sem ênfase, tudo na cor base.
                fill = { color: highlight ? active : base };
                wScale = emphasis && isActive && renderer === "word-pop" ? 0.9 + pop * 0.24 : 1;
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
                    WebkitTextStroke: wStroke,
                    // Traço ATRÁS do preenchimento (não "come" o miolo das letras).
                    paintOrder: wStroke ? "stroke" : undefined,
                    transform: `translateY(${wTranslate}px) scale(${wScale})`,
                    transformOrigin: "center bottom",
                    filter: wFilter,
                    opacity: isHook ? enter : 1,
                    borderBottom:
                      !isHook && !isTogi && emphasis && isActive && renderer === "underline" ? `8px solid ${active}` : "none",
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
