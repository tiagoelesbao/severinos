import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * Composição base 1080×1920 (9:16) on-brand. Prova o pipeline Next+Remotion da
 * Fase B: recebe os tokens de marca do cliente (cores/tipografia) e renderiza
 * um "hello world" animado. As composições reais (timeline + FX) entram nas
 * MVC-08/09.
 */
export interface BaseCompositionProps {
  title: string;
  displayName: string;
  primary: string;
  secondary: string;
  accent: string;
  textPrimary: string;
  fontFamily: string;
}

export const BaseComposition: React.FC<BaseCompositionProps> = ({
  title,
  displayName,
  primary,
  secondary,
  accent,
  textPrimary,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200 } });
  const titleY = interpolate(enter, [0, 1], [60, 0]);
  const barW = interpolate(enter, [0, 1], [0, width * 0.32]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${secondary} 0%, ${primary} 100%)`,
        fontFamily,
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
      }}
    >
      <div
        style={{
          height: 12,
          width: barW,
          background: accent,
          borderRadius: 8,
          marginBottom: 48,
        }}
      />
      <h1
        style={{
          color: textPrimary,
          fontSize: 96,
          fontWeight: 800,
          letterSpacing: -2,
          textTransform: "uppercase",
          textAlign: "center",
          margin: 0,
          transform: `translateY(${titleY}px)`,
          opacity: enter,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          color: accent,
          fontSize: 44,
          fontWeight: 700,
          marginTop: 24,
          opacity: enter,
        }}
      >
        {displayName}
      </p>
    </AbsoluteFill>
  );
};
