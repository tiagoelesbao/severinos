import React from 'react';
import type { Layer, ImageLayer, TextLayer, ShapeLayer } from '@/lib/layers';
import { FilmGrain, rgba } from '../design-system/fx';

/**
 * LayerView — renderiza UMA camada posicionada absolutamente no canvas
 * 1080×1350. Compartilhado entre o canvas interativo (/studio) e o componente
 * de export (LayeredSlide) — é o que garante WYSIWYG: o mesmo código desenha a
 * camada na tela e no PNG final.
 *
 * `interactive` desliga pointer-events do conteúdo para o react-moveable poder
 * capturar o gesto no wrapper (o /studio passa true).
 */
export function LayerView({
  layer,
  interactive = false,
}: {
  layer: Layer;
  interactive?: boolean;
}) {
  const base: React.CSSProperties = {
    position: 'absolute',
    left: layer.x,
    top: layer.y,
    width: layer.w,
    height: layer.h,
    transform: `rotate(${layer.rotation}deg)`,
    opacity: layer.opacity,
    pointerEvents: interactive ? 'none' : undefined,
  };

  if (layer.type === 'text') return <TextLayerView layer={layer} style={base} />;
  if (layer.type === 'image') return <ImageLayerView layer={layer} style={base} />;
  return <ShapeLayerView layer={layer} style={base} />;
}

function TextLayerView({ layer, style }: { layer: TextLayer; style: React.CSSProperties }) {
  // Numeral-fantasma (role 'ghost') é decorativo e gigante: NÃO pode quebrar
  // linha, senão um número de 2 dígitos ("01") empilha na vertical quando a
  // largura da caixa < largura do glifo. Espelha o <span> do template automático.
  const isGhost = layer.role === 'ghost';
  return (
    <div
      style={{
        ...style,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        fontFamily: layer.fontFamily,
        fontSize: `${layer.fontSize}px`,
        fontWeight: layer.fontWeight,
        fontStyle: layer.italic ? 'italic' : 'normal',
        color: layer.color,
        textAlign: layer.align,
        lineHeight: layer.lineHeight,
        letterSpacing: `${layer.letterSpacing}px`,
        textTransform: layer.uppercase ? 'uppercase' : 'none',
        textShadow: [
          layer.shadow ? '0 4px 24px rgba(0,0,0,0.45)' : '',
          layer.glow ? `0 0 22px ${layer.color}` : '',
        ].filter(Boolean).join(', ') || 'none',
        whiteSpace: isGhost ? 'nowrap' : 'pre-wrap',
        overflowWrap: isGhost ? 'normal' : 'break-word',
        wordBreak: isGhost ? 'keep-all' : 'break-word',
        overflow: isGhost ? 'visible' : undefined,
      }}
    >
      {layer.content}
    </div>
  );
}

function ImageLayerView({ layer, style }: { layer: ImageLayer; style: React.CSSProperties }) {
  const scaleX = layer.flipX ? -1 : 1;
  const scaleY = layer.flipY ? -1 : 1;
  const isCard = layer.frame === 'card';
  const accent = layer.frameAccent || '#FFB800';

  const containerStyle: React.CSSProperties = {
    ...style,
    overflow: 'hidden',
    borderRadius: layer.radius,
    ...(isCard
      ? {
          boxShadow: `0 50px 90px -30px rgba(0,0,0,0.85), 0 0 0 1px ${rgba('#ffffff', 0.12)}`,
        }
      : {}),
  };

  return (
    <div style={containerStyle}>
      {layer.src ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={layer.src}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: layer.objectFit,
              transform: `scale(${scaleX}, ${scaleY})`,
              filter: `brightness(${layer.brightness}%) contrast(${layer.contrast}%) `
                + `saturate(${layer.saturate}%) blur(${layer.blur}px)`,
            }}
          />
          {/* Frame premium "card" — profundidade, duotone, grão, barra de acento */}
          {isCard && (
            <>
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent 50%, rgba(0,0,0,0.2))',
              }} />
              <div style={{
                position: 'absolute', inset: 0, mixBlendMode: 'soft-light',
                background: `linear-gradient(135deg, ${rgba(accent, 0.45)}, transparent 60%)`,
              }} />
              <FilmGrain opacity={0.08} />
              <div style={{
                position: 'absolute', left: 0, bottom: 0, height: 6, width: '100%',
                background: `linear-gradient(90deg, ${accent}, transparent)`,
              }} />
            </>
          )}
        </>
      ) : (
        <div
          style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.06)',
            border: '2px dashed rgba(255,255,255,0.25)',
            color: 'rgba(255,255,255,0.4)', fontSize: 20,
          }}
        >
          sem imagem
        </div>
      )}
    </div>
  );
}

function ShapeLayerView({ layer, style }: { layer: ShapeLayer; style: React.CSSProperties }) {
  if (layer.kind === 'line') {
    return (
      <div
        style={{
          ...style,
          height: layer.strokeWidth || 4,
          backgroundColor: layer.stroke !== 'transparent' ? layer.stroke : layer.fill,
        }}
      />
    );
  }
  return (
    <div
      style={{
        ...style,
        backgroundColor: layer.fill,
        border: layer.strokeWidth > 0 ? `${layer.strokeWidth}px solid ${layer.stroke}` : undefined,
        borderRadius: layer.kind === 'ellipse' ? '50%' : layer.radius,
        boxShadow: layer.glow ? `0 0 26px ${layer.fill}, 0 0 8px ${layer.fill}` : undefined,
        ...(layer.glass ? {
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 24px 60px -24px rgba(0,0,0,0.6)',
        } : {}),
      }}
    />
  );
}
