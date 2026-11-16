import React from "react";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Series,
  staticFile,
} from "remotion";
import type { Timeline } from "../lib/timeline";

/**
 * Composição que renderiza o timeline auto-montado (MVC-08): sequencia os clips
 * de vídeo, sobrepõe a narração e mostra placeholders para GAPs. Estilização de
 * FX/legendas é a MVC-09; aqui é a montagem crua, fiel ao timeline.
 *
 * Os clips são servidos via `staticFile` (publicDir = pasta de Materiais Brutos,
 * configurada no bundle do render).
 */
export interface TimelineCompositionProps {
  timeline: Timeline;
}

const GapCard: React.FC<{ file: string }> = ({ file }) => (
  <AbsoluteFill
    style={{
      backgroundColor: "#1A1A24",
      color: "#FF4D2E",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "system-ui, sans-serif",
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

export const TimelineComposition: React.FC<TimelineCompositionProps> = ({ timeline }) => {
  const audioGap = timeline.audioTrack
    ? timeline.meta.gaps.includes(timeline.audioTrack.file)
    : true;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Series>
        {timeline.videoTrack.map((clip) => (
          <Series.Sequence
            key={`${clip.file}-${clip.startFrame}`}
            durationInFrames={clip.durationInFrames}
          >
            {clip.gap ? (
              <GapCard file={clip.file} />
            ) : (
              <AbsoluteFill>
                {/* Clips são landscape (screen capture); cobrem o canvas 9:16. */}
                <OffthreadVideo
                  src={staticFile(clip.file)}
                  muted
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </AbsoluteFill>
            )}
          </Series.Sequence>
        ))}
      </Series>

      {timeline.audioTrack && !audioGap ? (
        <Audio src={staticFile(timeline.audioTrack.file)} />
      ) : null}
    </AbsoluteFill>
  );
};

/** Extrai fps/dimensões/duração do próprio timeline (props). */
export const calculateTimelineMetadata = ({
  props,
}: {
  props: TimelineCompositionProps;
}) => ({
  durationInFrames: Math.max(1, props.timeline.durationInFrames),
  fps: props.timeline.fps,
  width: props.timeline.width,
  height: props.timeline.height,
});

/** Timeline mínimo (1 GAP) para defaultProps — evita quebrar o Studio sem dados. */
export const EMPTY_TIMELINE: Timeline = {
  fps: 30,
  width: 1080,
  height: 1920,
  durationInFrames: 60,
  videoTrack: [
    {
      file: "(sem material)",
      absPath: "",
      role: "unknown",
      durationSeconds: 2,
      durationInFrames: 60,
      nativeDurationInFrames: 60,
      playbackRate: 1,
      width: 1080,
      height: 1920,
      startFrame: 0,
      audioEnabled: false,
      gap: true,
    },
  ],
  audioTrack: null,
  captionTrack: [],
  meta: {
    client: "",
    creative: "",
    videoSeconds: 2,
    audioSeconds: 0,
    rhythmGapSeconds: null,
    gaps: ["(sem material)"],
  },
};
