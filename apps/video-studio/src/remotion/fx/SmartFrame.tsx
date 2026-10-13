import React from "react";
import { AbsoluteFill, interpolate, OffthreadVideo, useCurrentFrame, useVideoConfig, Video } from "remotion";
import type { ClipRole } from "../../lib/timeline";

/**
 * Enquadramento inteligente. Screen captures landscape entram num "painel de
 * tela" no ASPECT REAL (contain, sem corte); talking-heads usam cover.
 *
 * Reprodução vs render (B1): `OffthreadVideo` é ideal para RENDER headless mas
 * engasga/repete nas fronteiras de clipe no PLAYER. Então no preview (`preview`)
 * usamos `<Video>` (suave em tempo real) e no render `<OffthreadVideo>`.
 */
export type FrameMode = "cover" | "contain-blur";

export function roleToFrameMode(role: ClipRole): FrameMode {
  return role === "hook" || role === "cta" ? "cover" : "contain-blur";
}

const Media: React.FC<{
  src: string;
  muted: boolean;
  playbackRate: number;
  preview: boolean;
  startFrom: number;
  style: React.CSSProperties;
  /** Volume do áudio próprio (número ou envelope por frame). VEX-05. */
  volume?: number | ((f: number) => number);
}> = ({ src, muted, playbackRate, preview, startFrom, style, volume }) => {
  const Comp = preview ? Video : OffthreadVideo;
  // onError evita o MediaPlaybackError não tratado (codec/formato), que dispara
  // re-render storm da Remotion → "Maximum update depth". Degrada em silêncio.
  return (
    <Comp
      src={src}
      muted={muted}
      playbackRate={playbackRate}
      startFrom={startFrom}
      style={style}
      {...(volume !== undefined && !muted ? { volume } : {})}
      onError={() => {}}
    />
  );
};

export const SmartFrame: React.FC<{
  src: string;
  mode: FrameMode;
  muted?: boolean;
  playbackRate?: number;
  aspect?: number;
  /** true no Player (usa <Video>); false no render (usa <OffthreadVideo>). */
  preview?: boolean;
  /** In-point de origem (split/trim pela esquerda). */
  startFrom?: number;
  /** Zoom lento (Ken Burns) 0..0.2. */
  kenBurns?: number;
  /** Volume do áudio próprio (número ou envelope por frame). VEX-05. */
  volume?: number | ((f: number) => number);
}> = ({ src, mode, muted = true, playbackRate = 1, aspect = 16 / 9, preview = false, startFrom = 0, kenBurns = 0, volume }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const kb =
    kenBurns > 0
      ? interpolate(frame, [0, Math.max(1, durationInFrames)], [1, 1 + kenBurns], { extrapolateRight: "clamp" })
      : 1;

  if (mode === "contain-blur") {
    const W = 1010;
    const FRAME_W = 1080;
    const ar = aspect > 0 ? aspect : 16 / 9;
    let panelW = W;
    let panelH = panelW / ar;
    const MAX_H = 1180;
    if (panelH > MAX_H) {
      panelH = MAX_H;
      panelW = Math.min(W, panelH * ar);
    }
    const left = (FRAME_W - panelW) / 2;
    const top = Math.max(120, (1300 - panelH) / 2);
    return (
      <AbsoluteFill style={{ backgroundColor: "#06060c" }}>
        <Media
          src={src}
          muted
          playbackRate={playbackRate}
          preview={preview}
          startFrom={startFrom}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "blur(60px) brightness(0.32) saturate(1.1)",
            transform: "scale(1.3)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top,
            left,
            width: panelW,
            height: panelH,
            borderRadius: 18,
            overflow: "hidden",
            boxShadow: "0 30px 90px rgba(0,0,0,.6)",
            border: "1px solid rgba(255,255,255,.12)",
            background: "#000",
          }}
        >
          <Media
            src={src}
            muted={muted}
            playbackRate={playbackRate}
            preview={preview}
            startFrom={startFrom}
            volume={volume}
            style={{ width: "100%", height: "100%", objectFit: "contain", transform: `scale(${kb})` }}
          />
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <Media
      src={src}
      muted={muted}
      playbackRate={playbackRate}
      preview={preview}
      startFrom={startFrom}
      volume={volume}
      style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${kb})` }}
    />
  );
};
