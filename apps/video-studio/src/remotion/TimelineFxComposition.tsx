import React from "react";
import { AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, Video } from "remotion";
import type { Timeline, TransitionType, ElementAnim, KeyframeTracks } from "../lib/timeline";
import { duckingGain, segmentEnvelope, speechIntervals, tailGain } from "../lib/audioEnvelopes";
import { resolveAudible } from "../lib/trackMix";
import { sampleTrack, fadeGain } from "../lib/keyframes";
import type { FxPlan } from "../lib/fxPlan";
import { roleToFrameMode, SmartFrame } from "./fx/SmartFrame";
import { HookFx } from "./fx/HookFx";
import { CaptionsOverlay } from "./fx/Captions";
import { ProgressBar } from "./fx/Motion";

/**
 * Composição com FX (MVC-09): a timeline auto-montada (MVC-08) recebe o
 * tratamento viral — enquadramento inteligente por papel, hook FX no 1º clip,
 * legendas word-by-word on-brand, narração e motion graphics. Tudo dirigido pelo
 * FxPlan (presets do video-templates.yaml resolvidos + captions do roteiro).
 */
export interface TimelineFxProps {
  timeline: Timeline;
  fxPlan: FxPlan;
  /** Base URL para servir os clips no Player (browser). Ausente → staticFile (render headless). */
  mediaBaseUrl?: string;
  /**
   * Render headless com <Video> (tag do browser) em vez de OffthreadVideo.
   * Paridade 1:1 com o Player e robustez a fontes que o extractor Rust rejeita
   * ("No frame found at position") — default do export final (VEX-01).
   */
  forceTagVideo?: boolean;
}

/** Resolve o src de um arquivo: API URL (Player) ou staticFile (render). */
function useMediaSrc(mediaBaseUrl?: string) {
  return (file: string) =>
    mediaBaseUrl ? `${mediaBaseUrl}/${encodeURIComponent(file)}` : staticFile(file);
}

const GapCard: React.FC<{ file: string }> = ({ file }) => (
  <AbsoluteFill
    style={{
      backgroundColor: "#1A1A24",
      color: "#FF4D2E",
      justifyContent: "center",
      alignItems: "center",
      fontSize: 40,
      fontWeight: 800,
      textAlign: "center",
      padding: 60,
    }}
  >
    <div>
      [GAP]
      <div style={{ fontSize: 28, color: "#B5B5C0", marginTop: 16 }}>{file}</div>
    </div>
  </AbsoluteFill>
);

// Duração default da transição (frames) — suaviza o corte SEM mexer nas âncoras
// de tempo (sync com narração/legendas preservado).
const TRANSITION = 6;

/** Transição de entrada por tipo (dissolve/slide/zoom), por cima do anterior. */
const Transition: React.FC<{ type: TransitionType; frames: number; children: React.ReactNode }> = ({
  type,
  frames,
  children,
}) => {
  const f = useCurrentFrame();
  if (frames <= 0 || type === "none") return <AbsoluteFill>{children}</AbsoluteFill>;
  const p = interpolate(f, [0, frames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const style: React.CSSProperties = { opacity: p };
  if (type === "slide") style.transform = `translateX(${(1 - p) * 140}px)`;
  if (type === "zoom") style.transform = `scale(${interpolate(p, [0, 1], [1.12, 1])})`;
  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * VEX-09: fade visual por clipe (opacidade → revela o preto do palco = fade to
 * black). `durationInFrames` inclui o pre-roll da transição (frame local).
 */
const FadeWrap: React.FC<{
  fadeIn?: number;
  fadeOut?: number;
  durationInFrames: number;
  children: React.ReactNode;
}> = ({ fadeIn, fadeOut, durationInFrames, children }) => {
  const f = useCurrentFrame();
  const g = fadeGain(f, durationInFrames, fadeIn, fadeOut);
  if (g >= 1) return <>{children}</>;
  return <AbsoluteFill style={{ opacity: g }}>{children}</AbsoluteFill>;
};

/**
 * Wrapper de elemento visual (overlay/imagem/texto): aplica transform
 * (posição x/y em %, escala) + animações de ENTRADA e SAÍDA (fade/slide/zoom).
 * A entrada usa o progresso desde o frame 0; a saída, o progresso até o fim.
 */
const ElementWrap: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  opacity?: number;
  animateIn?: ElementAnim;
  animateOut?: ElementAnim;
  /** VEX-09: keyframes (têm precedência sobre os estáticos). */
  tracks?: KeyframeTracks;
  fadeIn?: number;
  fadeOut?: number;
  durationInFrames: number;
  children: React.ReactNode;
}> = ({ x = 50, y = 50, scale = 1, opacity = 1, animateIn, animateOut, tracks, fadeIn, fadeOut, durationInFrames, children }) => {
  const f = useCurrentFrame();
  const inA = animateIn;
  const outA = animateOut;
  const pIn = inA && inA.type !== "none" && inA.durationInFrames > 0 ? clamp01(f / inA.durationInFrames) : 1;
  const pOut = outA && outA.type !== "none" && outA.durationInFrames > 0
    ? clamp01((durationInFrames - f) / outA.durationInFrames)
    : 1;
  // VEX-09: valor animado = keyframes (se houver) senão o estático.
  let op = sampleTrack(tracks?.opacity, f, opacity);
  let tx = sampleTrack(tracks?.x, f, x) - 50;
  let ty = sampleTrack(tracks?.y, f, y) - 50;
  let sc = sampleTrack(tracks?.scale, f, scale);
  // Fades por clipe (opacidade nas pontas) — compõem com o resto.
  if (fadeIn && fadeIn > 0) op *= clamp01(f / fadeIn);
  if (fadeOut && fadeOut > 0) op *= clamp01((durationInFrames - f) / fadeOut);
  if (inA?.type === "fade") op *= pIn;
  if (outA?.type === "fade") op *= pOut;
  if (inA?.type === "slide") tx += (1 - pIn) * -14;
  if (outA?.type === "slide") tx += (1 - pOut) * 14;
  if (inA?.type === "zoom") sc *= 0.85 + 0.15 * pIn;
  if (outA?.type === "zoom") sc *= 0.85 + 0.15 * pOut;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, opacity: op, transform: `translate(${tx}%, ${ty}%) scale(${sc})`, transformOrigin: "center" }}>
        {children}
      </div>
    </AbsoluteFill>
  );
};

export const TimelineFxComposition: React.FC<TimelineFxProps> = ({
  timeline,
  fxPlan,
  mediaBaseUrl,
  forceTagVideo,
}) => {
  const { brand } = fxPlan;
  const mediaSrc = useMediaSrc(mediaBaseUrl);
  // Player → <Video>; render → <OffthreadVideo> (ou <Video> com forceTagVideo).
  const preview = Boolean(mediaBaseUrl) || Boolean(forceTagVideo);
  const audioGap = timeline.audioTrack
    ? timeline.meta.gaps.includes(timeline.audioTrack.file)
    : true;
  // VEX-05: intervalos de fala (ducking) + duração total (fade-out do tail).
  const speech = React.useMemo(() => speechIntervals(timeline), [timeline]);
  // VEX-08: mute/solo por faixa — aplicado aqui vale no preview E no export.
  const mix = React.useMemo(() => resolveAudible(timeline), [timeline]);
  const totalFrames = timeline.durationInFrames;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Clipes em Sequences sobrepostas: cada um (exceto o 1º) entra TRANSITION
          frames antes, com dissolve-in por cima do anterior. As âncoras de tempo
          (startFrame/duração) NÃO mudam → narração e legendas seguem sincronizadas. */}
      {timeline.videoTrack.map((clip, idx) => {
        const tr =
          idx === 0
            ? null
            : clip.transitionIn ?? { type: "dissolve" as TransitionType, durationInFrames: TRANSITION };
        const F = tr && tr.type !== "none" ? tr.durationInFrames : 0;
        const mode =
          clip.frameMode === "cover"
            ? "cover"
            : clip.frameMode === "panel"
              ? "contain-blur"
              : roleToFrameMode(clip.role);
        const inner = clip.gap ? (
          <GapCard file={clip.file} />
        ) : (
          <SmartFrame
            src={mediaSrc(clip.file)}
            mode={mode}
            muted={!clip.audioEnabled || !mix.video}
            playbackRate={clip.playbackRate}
            aspect={clip.height ? clip.width / clip.height : 16 / 9}
            preview={preview}
            startFrom={clip.trimStartFrames ?? 0}
            kenBurns={clip.kenBurns ?? 0}
            // VEX-05: ganho por clipe + fade-out global (f local inclui o pre-roll F).
            volume={clip.audioEnabled
              ? (f: number) =>
                  (clip.volume ?? 1) *
                  fadeGain(f, clip.durationInFrames + F, clip.fadeIn, clip.fadeOut) *
                  tailGain(clip.startFrame - F + f, totalFrames)
              : undefined}
          />
        );
        return (
          <Sequence
            key={`${clip.file}-${clip.startFrame}`}
            from={clip.startFrame - F}
            durationInFrames={clip.durationInFrames + F}
          >
            <FadeWrap fadeIn={clip.fadeIn} fadeOut={clip.fadeOut} durationInFrames={clip.durationInFrames + F}>
              {idx === 0 ? (
                <HookFx renderer={fxPlan.hookRenderer}>{inner}</HookFx>
              ) : (
                <Transition type={tr!.type} frames={F}>{inner}</Transition>
              )}
            </FadeWrap>
          </Sequence>
        );
      })}

      {/* Narração. Sem auto-cut: toca integral. Com auto-cut: cada segmento é um
          CLIPE INDEPENDENTE, posicionado por seu startFrame (cortes reais,
          arrastáveis isoladamente). Hook/CTA tocam o próprio áudio. */}
      {timeline.audioTrack && !audioGap ? (
        timeline.audioTrack.segments?.length ? (
          (() => {
            const at = timeline.audioTrack;
            let cum = 0;
            return at.segments!.map((seg, i) => {
              const rel = seg.startFrame ?? cum;
              cum += seg.durationInFrames;
              const segStart = at.startFrame + rel;
              return (
                <Sequence
                  key={i}
                  from={segStart}
                  durationInFrames={seg.durationInFrames}
                >
                  <Audio
                    src={mediaSrc(at.file)}
                    startFrom={seg.srcFromFrame}
                    endAt={seg.srcFromFrame + seg.durationInFrames}
                    // VEX-05: micro-crossfade anti-click + fade-out do tail.
                    // VEX-08: mute/solo da narração.
                    volume={(f) =>
                      (mix.narration ? 1 : 0) *
                      segmentEnvelope(f, seg.durationInFrames) * tailGain(segStart + f, totalFrames)
                    }
                    // Erro de mídia degrada em silêncio (evita re-render storm da
                    // Remotion → "Maximum update depth").
                    onError={() => {}}
                  />
                </Sequence>
              );
            });
          })()
        ) : (
          <Sequence
            from={timeline.audioTrack.startFrame}
            durationInFrames={timeline.audioTrack.windowFrames}
          >
            <Audio
              src={mediaSrc(timeline.audioTrack.file)}
              volume={(f) =>
                (mix.narration ? 1 : 0) *
                segmentEnvelope(f, timeline.audioTrack!.windowFrames) *
                tailGain(timeline.audioTrack!.startFrame + f, totalFrames)
              }
              onError={() => {}}
            />
          </Sequence>
        )
      ) : null}

      {/* Camadas extras (N1): elementos TIPADOS — mídia (áudio/vídeo), imagem,
          texto e lower-third (assinatura). O tipo dirige o render; legado sem
          `type` cai para mídia conforme o kind da camada. */}
      {(timeline.extraLayers ?? []).map((layer) =>
        layer.clips.map((clip) => {
          const type = clip.type ?? (layer.kind === "audio" ? "media-audio" : "media-video");
          const src = clip.src ?? (clip.file ? mediaSrc(clip.file) : "");
          // VEX-08: camada muda (por mute/solo) → áudio zerado, overlay silenciado.
          const layerAudible = mix.layers[layer.id] !== false;
          let node: React.ReactNode = null;
          if (type === "media-audio") {
            // Volume com fade de entrada/saída (animações "fade" no áudio)
            // + ducking sob a fala (VEX-05) + fade-out do tail.
            const vol = (f: number) => {
              if (!layerAudible) return 0;
              // VEX-09: volume por keyframes (senão o estático) × fades × ducking.
              let v = sampleTrack(clip.tracks?.volume, f, clip.volume ?? 1);
              const inA = clip.animateIn;
              const outA = clip.animateOut;
              if (inA?.type === "fade" && inA.durationInFrames > 0) v *= clamp01(f / inA.durationInFrames);
              if (outA?.type === "fade" && outA.durationInFrames > 0) v *= clamp01((clip.durationInFrames - f) / outA.durationInFrames);
              if (clip.fadeIn && clip.fadeIn > 0) v *= clamp01(f / clip.fadeIn);
              if (clip.fadeOut && clip.fadeOut > 0) v *= clamp01((clip.durationInFrames - f) / clip.fadeOut);
              if (clip.ducking) v *= duckingGain(clip.startFrame + f, speech);
              return v * tailGain(clip.startFrame + f, totalFrames);
            };
            // Placeholder do plano (sem arquivo ainda) não emite Audio.
            node = src ? <Audio src={src} startFrom={clip.srcFromFrame ?? 0} volume={vol} onError={() => {}} /> : null;
          } else if (!src && type !== "text") {
            // Placeholder do plano (insert sem asset ainda) — visível só na
            // timeline; o usuário arrasta um asset por cima para substituir.
            node = null;
          } else {
            // VEX-09 (PiP): moldura opcional (raio/borda/sombra estilo CapCut) +
            // objectFit. Envolve o vídeo/imagem num quadro estilizado.
            const fit = clip.fit ?? "contain";
            const framed = (media: React.ReactNode): React.ReactNode => (
              <div style={{
                position: "absolute", inset: 0, overflow: "hidden",
                borderRadius: clip.radius ? clip.radius : undefined,
                border: clip.borderW ? `${clip.borderW}px solid ${clip.borderColor ?? "#fff"}` : undefined,
                boxShadow: clip.shadow ? "0 30px 90px rgba(0,0,0,.55)" : undefined,
                boxSizing: "border-box", background: clip.shadow || clip.borderW ? "#000" : undefined,
              }}>{media}</div>
            );
            let inner: React.ReactNode;
            if (type === "image") {
              inner = framed(<Img src={src} onError={() => {}} style={{ width: "100%", height: "100%", objectFit: fit }} />);
            } else if (type === "text") {
              inner = (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 64 }}>
                  <div style={{ fontFamily: brand.fontFamily, fontWeight: 800, fontSize: clip.fontSize ?? 64, color: clip.color ?? "#fff", textShadow: "0 2px 12px rgba(0,0,0,.6)", maxWidth: "86%", textAlign: "center" }}>
                    {clip.text ?? ""}
                  </div>
                </div>
              );
            } else {
              inner = framed(preview ? (
                <Video src={src} startFrom={clip.srcFromFrame ?? 0} muted={!layerAudible} onError={() => {}} style={{ width: "100%", height: "100%", objectFit: fit }} />
              ) : (
                <OffthreadVideo src={src} startFrom={clip.srcFromFrame ?? 0} muted={!layerAudible} onError={() => {}} style={{ width: "100%", height: "100%", objectFit: fit }} />
              ));
            }
            node = (
              <ElementWrap
                x={clip.x}
                y={clip.y}
                scale={clip.scale}
                opacity={clip.opacity}
                animateIn={clip.animateIn}
                animateOut={clip.animateOut}
                tracks={clip.tracks}
                fadeIn={clip.fadeIn}
                fadeOut={clip.fadeOut}
                durationInFrames={clip.durationInFrames}
              >
                {inner}
              </ElementWrap>
            );
          }
          return (
            <Sequence key={clip.id} from={clip.startFrame} durationInFrames={clip.durationInFrames}>
              {node}
            </Sequence>
          );
        }),
      )}

      <CaptionsOverlay
        captions={fxPlan.captions}
        accentColor={brand.accent}
        fontFamily={brand.fontFamily}
        renderer={fxPlan.captionRenderer}
        cueOptions={fxPlan.captionStyle}
        keywords={brand.keywords}
        theme={fxPlan.captionTheme}
      />

      {fxPlan.motionRenderers.includes("progress-bar") ? (
        <ProgressBar accentColor={brand.accent} />
      ) : null}
    </AbsoluteFill>
  );
};

export const calculateTimelineFxMetadata = ({ props }: { props: TimelineFxProps }) => ({
  durationInFrames: Math.max(1, props.timeline.durationInFrames),
  fps: props.timeline.fps,
  width: props.timeline.width,
  height: props.timeline.height,
});

export const EMPTY_FXPLAN: FxPlan = {
  brand: {
    accent: "#FF3D68",
    primary: "#0C0A1F",
    displayName: "Virals",
    fontFamily: "Outfit, system-ui, sans-serif",
  },
  hookRenderer: "hard-cut",
  captionRenderer: "word-pop",
  motionRenderers: ["lower-third", "progress-bar"],
  captions: [],
};
