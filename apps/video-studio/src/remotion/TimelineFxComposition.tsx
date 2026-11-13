import React from "react";
import { AbsoluteFill, Audio, Freeze, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, Video } from "remotion";
import type { Timeline, TransitionType, ElementAnim, KeyframeTracks, ExtraClip } from "../lib/timeline";
import { Transicao, duracaoTransicao } from "./fx/Transicoes";
import { cameraDoKenBurns } from "../lib/fxCatalog";
import { deltaAnimacao } from "../lib/animacoes";
import { duckingGain, segmentEnvelope, speechIntervals, tailGain } from "../lib/audioEnvelopes";
import { resolveAudible } from "../lib/trackMix";
import { sampleTrack, fadeGain } from "../lib/keyframes";
import type { FxPlan } from "../lib/fxPlan";
import { roleToFrameMode, SmartFrame } from "./fx/SmartFrame";
import { HookFx } from "./fx/HookFx";
import { CaptionsOverlay } from "./fx/Captions";
import { ensureFonts, fontFamilyById, FONT_SANS, FONT_SERIF } from "./fonts";
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

/**
 * Quadros de PRÉ-MONTAGEM de cada clipe (1s a 30fps) — SÓ NO PLAYER.
 *
 * Sem isto o `<video>` do próximo take só nasce no frame em que ele começa: o elemento
 * ainda está carregando e o preview pisca PRETO na virada. Medido na gravação do
 * navegador, no criativo de 14 clipes: piscadas de 80 a 120ms em TODAS as viradas, nos
 * tempos exatos das trocas de take.
 *
 * No render headless não entra: lá o quadro é extraído fora da linha do tempo
 * (`OffthreadVideo`), montar duas mídias por quadro só custaria tempo — e o estilo de
 * pré-montagem abaixo, por menor que seja, sujaria o arquivo final.
 */
const PREMOUNT = 30;

/**
 * A Remotion pré-monta com `opacity: 0`, e o Chrome não pinta o que é totalmente
 * transparente: o elemento existe, tem dados, mas o primeiro quadro só é composto
 * quando fica visível — e aí sobra um quadro preto na troca. Medido: mesmo com a
 * mídia em `readyState=4` antes de entrar, três das cinco viradas ainda piscavam.
 * Um milésimo de opacidade é invisível a olho nu e obriga o compositor a desenhar.
 */
const ESTILO_PRE_MONTAGEM: React.CSSProperties = { opacity: 0.001 };

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
  // `p` = 1 significa ASSENTADO. Sem animacao, ja nasce assentado. A checagem
  // de "sem animacao" mora no catalogo (`nenhuma` e o legado `none`), e nao
  // aqui — senao um id novo passaria batido e a animacao nunca rodaria.
  const pIn = inA && inA.durationInFrames > 0 ? clamp01(f / inA.durationInFrames) : 1;
  const pOut = outA && outA.durationInFrames > 0
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
  // Grupo ANIMACOES do catalogo. A tabela e a mesma para entrada e saida — o
  // que muda e o SENTIDO, e por isso as duas ficam simetricas por construcao.
  // Antes cada uma tinha seu `if` e "slide" entrava por um lado e saia pelo
  // outro com a mesma amplitude, o que ninguem decidiu.
  const dIn = deltaAnimacao(inA?.type, pIn, 1);
  const dOut = deltaAnimacao(outA?.type, pOut, -1);
  op *= dIn.opacidade * dOut.opacidade;
  tx += dIn.dx + dOut.dx;
  ty += dIn.dy + dOut.dy;
  sc *= dIn.escala * dOut.escala;
  const desfoque = Math.max(dIn.desfoque, dOut.desfoque);
  return (
    <AbsoluteFill>
      <div style={{
        position: "absolute", inset: 0, opacity: op,
        transform: `translate(${tx}%, ${ty}%) scale(${sc})`, transformOrigin: "center",
        ...(desfoque > 0 ? { filter: `blur(${desfoque.toFixed(2)}px)` } : {}),
      }}>
        {children}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Elemento de TEXTO — desenhado com a mesma convenção do libass (o motor de
 * legenda do export), para que editor e arquivo final sejam o mesmo desenho:
 *
 *  · `white-space: pre-wrap` — as quebras (e as linhas em branco entre
 *    parágrafos) do texto são respeitadas. Sem isto, o layout decidido no
 *    export virava um parágrafo corrido re-quebrado pela largura do editor.
 *  · CONTORNO de verdade, não sombra. No ASS o `Outline` cresce PARA FORA da
 *    letra; `-webkit-text-stroke` cresce metade para dentro. Por isso o traço
 *    vai numa cópia ATRÁS, com o dobro da espessura: a metade interna fica
 *    coberta pelo preenchimento e sobra exatamente a espessura pedida.
 *    (Desenhar em duas camadas também dispensa `paint-order`, que nem toda
 *    versão do Chrome aplica a texto HTML.)
 *  · `fontWeight` por clipe: o export usa o bold real da família (700); fixar
 *    800 aqui engrossava o traço e mudava a largura das linhas.
 *  · LINHA EM BRANCO entre parágrafos vale MEIA entrelinha, não uma. É o que o
 *    libass faz, e foi medido no material: dentro do parágrafo as linhas andam
 *    76px; na virada de parágrafo, 114px — exatamente 1,5 passo. Em CSS, uma
 *    linha vazia ocuparia um passo inteiro e o bloco crescia ~76px, empurrando
 *    o texto para fora de posição (o topo subia 42px num bloco de 3 parágrafos).
 */
const TextElement: React.FC<{ clip: ExtraClip; fontFamily: string }> = ({ clip, fontFamily }) => {
  const texto = clip.text ?? "";
  const stroke = Number(clip.strokeWidth) || 0;
  const sombra = Number(clip.shadowOffset) || 0;
  // Parágrafos viram blocos próprios: é o que permite dar meia entrelinha ao
  // respiro entre eles (uma linha vazia no meio do texto valeria um passo cheio).
  const paragrafos = texto.split(/\n[ \t]*\n+/);
  const respiro = `${0.5 * (Number(clip.lineHeight) || 1.2)}em`;
  const Bloco: React.FC<{ style: React.CSSProperties; oculto?: boolean }> = ({ style, oculto }) => (
    <div aria-hidden={oculto} style={style}>
      {paragrafos.map((p, i) => (
        <div key={i} style={i ? { marginTop: respiro } : undefined}>{p}</div>
      ))}
    </div>
  );
  const base: React.CSSProperties = {
    fontFamily: clip.fontFamily || fontFamily,
    fontWeight: clip.fontWeight ?? 800,
    fontSize: clip.fontSize ?? 64,
    lineHeight: clip.lineHeight ?? 1.2,
    whiteSpace: clip.noWrap ? "pre" : "pre-wrap",
    maxWidth: clip.noWrap ? "none" : `${clip.maxWidthPct ?? 86}%`,
    textAlign: "center",
  };
  const preenchimento: React.CSSProperties = {
    ...base,
    color: clip.color ?? "#fff",
    // Sem contorno explícito preserva-se a sombra suave de antes (compatível
    // com textos criados na mão no editor).
    textShadow: stroke
      ? (sombra ? `${sombra}px ${sombra}px 0 rgba(0,0,0,.85)` : undefined)
      : "0 2px 12px rgba(0,0,0,.6)",
  };
  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex",
      alignItems: "center", justifyContent: "center",
      padding: clip.maxWidthPct ? 0 : 64,
    }}>
      {stroke ? (
        <div style={{ position: "relative", maxWidth: base.maxWidth }}>
          <Bloco
            oculto
            style={{
              ...base, maxWidth: "100%",
              position: "absolute", left: 0, top: 0, width: "100%",
              color: clip.strokeColor ?? "#000",
              WebkitTextStroke: `${stroke * 2}px ${clip.strokeColor ?? "#000"}`,
            }}
          />
          <Bloco style={{ ...preenchimento, maxWidth: "100%", position: "relative" }} />
        </div>
      ) : (
        <Bloco style={preenchimento} />
      )}
    </div>
  );
};

export const TimelineFxComposition: React.FC<TimelineFxProps> = ({
  timeline,
  fxPlan,
  mediaBaseUrl,
  forceTagVideo,
}) => {
  const { brand } = fxPlan;
  // Registra só as famílias desta composição (ver fonts.ts: no render, carregar as
  // seis a cada recarga de aba derrubava exports longos). No corpo, não em efeito —
  // o delayRender de dentro precisa existir antes do 1º frame.
  ensureFonts([
    brand.fontFamily,
    FONT_SANS,
    fxPlan.captions?.length ? FONT_SERIF : null,
    fxPlan.captionTheme?.fontFamily ? fontFamilyById(fxPlan.captionTheme.fontFamily) : null,
    ...(timeline.extraLayers ?? []).flatMap((l) => (l.clips ?? []).map((c) => c.fontFamily)),
  ]);
  const mediaSrc = useMediaSrc(mediaBaseUrl);
  // Player → <Video>; render → <OffthreadVideo> (ou <Video> com forceTagVideo).
  const preview = Boolean(mediaBaseUrl) || Boolean(forceTagVideo);
  // Só o Player serve mídia por URL da API; o render usa staticFile. É por aqui que a
  // pré-montagem fica restrita ao preview (ver PREMOUNT) — `preview` acima não serve,
  // porque o export final também pode usar a tag <Video> (`forceTagVideo`).
  const noPlayer = Boolean(mediaBaseUrl);
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
        // A duracao passa pelo catalogo: `durationInFrames` explicito vence, e
        // na ausencia dele o PESO decide (agressivo e mais curto, nao so mais
        // forte). "corte" — e o legado "none" — zera, e sem o pre-roll a
        // Sequence nao se sobrepoe: e assim que o corte seco fica seco.
        const F = tr ? duracaoTransicao(tr, TRANSITION) : 0;
        const mode =
          clip.frameMode === "cover"
            ? "cover"
            : clip.frameMode === "panel"
              ? "contain-blur"
              : roleToFrameMode(clip.role);
        // A MÍDIA PODE ACABAR ANTES DO CLIPE. A montagem estende o take clonando o
        // último quadro (`tpad` do ffmpeg); no Player, o <video> passa do fim do
        // arquivo e o Chrome pinta PRETO por um quadro na virada. Congelar no último
        // quadro disponível reproduz o que o export faz. Só no Player: no render o
        // OffthreadVideo já entrega o último quadro, e mexer ali mudaria o arquivo.
        const nativo = Number(clip.nativeDurationInFrames) || 0;
        // A JANELA REAL DO CLIPE INCLUI O PRE-ROLL DA TRANSICAO. A Sequence comeca
        // F quadros ANTES (`from={clip.startFrame - F}`) e dura `durationInFrames + F`,
        // entao a midia precisa cobrir isso — e nao so `durationInFrames`. Comparando
        // sem o F, um clipe cuja midia acaba exatamente no fim da janela nominal
        // passava do arquivo durante a dissolvencia e o Chrome repetia o ultimo
        // quadro ou pintava preto: e o "travamento" na virada de take.
        const janela = clip.durationInFrames + F;
        const congelaEm = noPlayer && nativo > 0 && nativo < janela ? nativo - 1 : null;
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
            // CAMERA vence o kenBurns legado. Timeline antiga sem `camera` e
            // convertida preservando a amplitude exata, para o preview de uma
            // peca ja aprovada nao mudar sozinho.
            camera={clip.camera ?? cameraDoKenBurns(clip.kenBurns)}
            // VEX-05: ganho por clipe + fade-out global (f local inclui o pre-roll F).
            volume={clip.audioEnabled
              ? (f: number) =>
                  (clip.volume ?? 1) *
                  fadeGain(f, clip.durationInFrames + F, clip.fadeIn, clip.fadeOut) *
                  tailGain(clip.startFrame - F + f, totalFrames)
              : undefined}
          />
        );
        // O congelamento envolve a mídia já enquadrada: nada muda no desenho, só o
        // tempo da mídia para no último quadro que existe.
        const conteudo = congelaEm === null
          ? inner
          : <Freeze frame={congelaEm} active={(f) => f >= congelaEm}>{inner}</Freeze>;
        return (
          <Sequence
            key={`${clip.file}-${clip.startFrame}`}
            from={clip.startFrame - F}
            durationInFrames={clip.durationInFrames + F}
            premountFor={noPlayer ? PREMOUNT : 0}
            styleWhilePremounted={noPlayer ? ESTILO_PRE_MONTAGEM : undefined}
          >
            <FadeWrap fadeIn={clip.fadeIn} fadeOut={clip.fadeOut} durationInFrames={clip.durationInFrames + F}>
              {idx === 0 ? (
                <HookFx renderer={fxPlan.hookRenderer}>{conteudo}</HookFx>
              ) : (
                <Transicao type={tr!.type} frames={F} peso={tr!.peso}>{conteudo}</Transicao>
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
                // A mesclagem vai no CONTAINER, e não na mídia: aplicada no <Video>
                // ela não atravessa o `overflow:hidden` do quadro e o efeito some.
                mixBlendMode: clip.blend && clip.blend !== "normal" ? clip.blend : undefined,
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
              inner = <TextElement clip={clip} fontFamily={brand.fontFamily} />;
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
            <Sequence
              key={clip.id}
              from={clip.startFrame}
              durationInFrames={clip.durationInFrames}
              // Overlay de mídia também entra montado: um vídeo/áudio de camada extra
              // que nasce no próprio frame de entrada pisca igual ao take. Texto não
              // precisa, mas pré-montar um <div> não custa nada. (Só no Player.)
              premountFor={noPlayer ? PREMOUNT : 0}
            >
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
        hookEndFrame={timeline.videoTrack[0]?.role === "hook" ? timeline.videoTrack[0].durationInFrames : 0}
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
    accent: "#FF5B3F",
    primary: "#0C0A1F",
    displayName: "Virals",
    fontFamily: "Outfit, system-ui, sans-serif",
  },
  hookRenderer: "hard-cut",
  captionRenderer: "word-pop",
  motionRenderers: ["lower-third", "progress-bar"],
  captions: [],
};
