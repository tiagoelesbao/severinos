import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, useCurrentFrame, useVideoConfig, Video } from "remotion";
import type { ClipRole } from "../../lib/timeline";
import { cameraTransform, cameraDoKenBurns, type CameraMove } from "../../lib/fxCatalog";

/**
 * A espinha nem sempre é vídeo. No dark-room ela é IMAGEM PARADA: a narração é o
 * eixo temporal e cada still cobre uma janela de fala, ganhando vida pelo Ken
 * Burns. Antes disto, um PNG na faixa de vídeo caía no `<Video>` e o Player
 * devolvia "Mídia incompatível neste clipe (formato/codec)" — a peça inteira
 * ficava preta.
 */
const EXT_IMAGEM = /\.(png|jpe?g|webp|gif|avif|bmp)(\?|#|$)/i;

export function ehImagem(src: string): boolean {
  return EXT_IMAGEM.test(src);
}

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
  // Imagem parada não tem playbackRate, startFrom, volume nem buffering — passar
  // qualquer um deles ao <Img> é erro de tipo e ruído. O Ken Burns fica por conta
  // do wrapper, que é o mesmo para os dois casos.
  if (ehImagem(src)) {
    return <Img src={src} style={style} onError={() => {}} />;
  }
  const Comp = preview ? Video : OffthreadVideo;
  // onError evita o MediaPlaybackError não tratado (codec/formato), que dispara
  // re-render storm da Remotion → "Maximum update depth". Degrada em silêncio.
  //
  // `pauseWhenBuffering` (só no Player): se o elemento ainda não tem o primeiro quadro
  // na virada de take, o Player ESPERA em vez de mostrar preto. Trocar uma piscada preta
  // por uma pausa de milissegundos é o certo num preview de edição — o export não é
  // afetado, lá o quadro é extraído fora da linha do tempo.
  return (
    <Comp
      src={src}
      muted={muted}
      playbackRate={playbackRate}
      startFrom={startFrom}
      style={style}
      {...(preview ? { pauseWhenBuffering: true } : {})}
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
  /** LEGADO: zoom lento como número único. `camera` tem precedência. */
  kenBurns?: number;
  /** Movimento de câmera do grupo CÂMERA do catálogo (zoom/pan/tilt/deriva). */
  camera?: CameraMove;
  /** Volume do áudio próprio (número ou envelope por frame). VEX-05. */
  volume?: number | ((f: number) => number);
}> = ({ src, mode, muted = true, playbackRate = 1, aspect = 16 / 9, preview = false, startFrom = 0, kenBurns = 0, camera, volume }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // TODO movimento de quadro passa por aqui — inclusive o kenBurns legado, que é
  // convertido para o mesmo vocabulário. Um caminho só significa que zoom e pan
  // não podem divergir de comportamento, que era o risco de manter os dois.
  const mv = camera ?? cameraDoKenBurns(kenBurns);
  const cam = cameraTransform(mv, frame, Math.max(1, durationInFrames));
  // Ordem importa: escala primeiro, translação depois — invertida, o
  // deslocamento seria multiplicado pela escala e o pan andaria mais do que o
  // pedido justamente nos clipes com mais zoom.
  const transform = `scale(${cam.scale}) translate(${cam.x}%, ${cam.y}%)`;

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
            style={{ width: "100%", height: "100%", objectFit: "contain", transform }}
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
      style={{ width: "100%", height: "100%", objectFit: "cover", transform }}
    />
  );
};
