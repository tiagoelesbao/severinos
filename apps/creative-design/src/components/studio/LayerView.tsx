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

type Segment = { text: string; struck: boolean; emphasis: boolean };

/** Divide `content` em trechos normais, riscados (`~~x~~`) e enfatizados (`**x**`). */
function splitInlineSegments(content: string): Segment[] {
  const parts = content.split(/(~~[^~]+~~|\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p) => {
    const strike = /^~~([^~]+)~~$/.exec(p);
    if (strike) return { text: strike[1], struck: true, emphasis: false };
    const emph = /^\*\*([^*]+)\*\*$/.exec(p);
    if (emph) return { text: emph[1], struck: false, emphasis: true };
    return { text: p, struck: false, emphasis: false };
  });
}

function TextLayerView({ layer, style }: { layer: TextLayer; style: React.CSSProperties }) {
  // Numeral-fantasma (role 'ghost') é decorativo e gigante: NÃO pode quebrar
  // linha, senão um número de 2 dígitos ("01") empilha na vertical quando a
  // largura da caixa < largura do glifo. Espelha o <span> do template automático.
  const isGhost = layer.role === 'ghost';
  const hasInline = layer.content.includes('~~') || layer.content.includes('**');
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
        // Contorno da thumb: `paint-order: stroke fill` é obrigatório junto do
        // `-webkit-text-stroke`. Sem ele o contorno é pintado POR CIMA do
        // preenchimento e consome metade do peso do glifo — a letra afina em
        // vez de engrossar, que é o oposto do que o contorno existe para fazer.
        WebkitTextStroke: layer.outlineWidth
          ? `${layer.outlineWidth}px ${layer.outlineColor || '#0C0C0C'}`
          : undefined,
        paintOrder: layer.outlineWidth ? 'stroke fill' : undefined,
        textShadow: [
          layer.shadow ? '0 4px 24px rgba(0,0,0,0.45)' : '',
          layer.glow ? `0 0 22px ${layer.color}` : '',
          layer.hardShadow
            ? `${layer.hardShadowX ?? 5}px ${layer.hardShadowY ?? 6}px 0 rgba(0,0,0,0.9)`
            : '',
        ].filter(Boolean).join(', ') || 'none',
        whiteSpace: isGhost ? 'nowrap' : 'pre-wrap',
        overflowWrap: isGhost ? 'normal' : 'break-word',
        wordBreak: isGhost ? 'keep-all' : 'break-word',
        overflow: isGhost ? 'visible' : undefined,
      }}
    >
      {/*
        Os trechos inline vivem dentro de UM bloco. A caixa de texto é um
        container flex em coluna (para centrar verticalmente), e num flex column
        cada filho vira um item empilhado — os `<span>` de realce/riscado
        quebravam linha sozinhos, partindo "ABSOLVIÇÃO VIROU {CONDENAÇÃO}" em
        duas linhas e estourando a faixa. Envolver num único bloco devolve o
        fluxo inline; a quebra explícita continua funcionando via `white-space`.
      */}
      {hasInline
        ? (
          <span style={{ display: 'block' }}>
            {splitInlineSegments(layer.content).map((seg, i) => {
            if (seg.struck) {
              return (
                <span
                  key={i}
                  style={{
                    color: layer.strikeColor || rgba(layer.color, 0.55),
                    textDecoration: 'line-through',
                    textDecorationColor: layer.strikeAccent || layer.color,
                    textDecorationThickness: '0.06em',
                  }}
                >
                  {seg.text}
                </span>
              );
            }
            if (seg.emphasis) {
              return (
                <span key={i} style={{ color: layer.emphasisColor || layer.color }}>
                  {seg.text}
                </span>
              );
            }
            return <React.Fragment key={i}>{seg.text}</React.Fragment>;
            })}
          </span>
        )
        : layer.content}
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
              objectPosition: `${layer.posX ?? 50}% ${layer.posY ?? 50}%`,
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
        // `background` (shorthand) quando há gradiente — é o que permite véu,
        // gramado e faixa em degradê existirem como CAMADA editável em vez de
        // ficarem assados dentro do componente de template.
        background: layer.fillGradient || undefined,
        backgroundColor: layer.fillGradient ? undefined : layer.fill,
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
