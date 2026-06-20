'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Backdrop, AtmosphereOverlay, FilmGrain, resolvePalette, type Palette } from '../design-system/fx';
import { LayerView } from './LayerView';
import {
  CANVAS_W, CANVAS_H, sortedVisibleLayers,
  type Layer, type SlideBackground,
} from '@/lib/layers';

const Moveable = dynamic(() => import('react-moveable'), { ssr: false });

export function StudioCanvas({
  layers,
  background,
  palette,
  scale,
  selectedId,
  onSelect,
  onChange,
  snap = true,
  grid = null,
}: {
  layers: Layer[];
  background: SlideBackground;
  palette: Partial<Palette>;
  scale: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<Layer>) => void;
  /** Guias de alinhamento + snap (aparecem só ao arrastar). */
  snap?: boolean;
  /** Grade de referência (colunas × linhas), 2..16. null = oculta. */
  grid?: { cols: number; rows: number } | null;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);

  const ordered = sortedVisibleLayers(layers);
  const selected = layers.find((l) => l.id === selectedId) || null;
  const pal = resolvePalette(palette);

  // Outros elementos viram guias de alinhamento (snap por centro/bordas).
  const elementGuidelines = snap && stageRef.current
    ? Array.from(stageRef.current.querySelectorAll<HTMLElement>('[data-layer-id]'))
      .filter((el) => el !== target)
    : [];

  const imgStyle: React.CSSProperties = {
    objectPosition: `${background.imagePosX ?? 50}% ${background.imagePosY ?? 50}%`,
    transform: background.imageZoom && background.imageZoom !== 1 ? `scale(${background.imageZoom})` : undefined,
  };

  useEffect(() => {
    if (!selectedId || !stageRef.current) { setTarget(null); return; }
    const el = stageRef.current.querySelector<HTMLElement>(`[data-layer-id="${selectedId}"]`);
    setTarget(el ?? null);
  }, [selectedId, layers]);

  return (
    <div
      className="relative shadow-2xl"
      style={{ width: CANVAS_W * scale, height: CANVAS_H * scale }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onSelect(null); }}
    >
      <div
        ref={stageRef}
        className="absolute top-0 left-0 overflow-hidden bg-black"
        style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        // Clique no fundo/área vazia desseleciona. Camadas dão stopPropagation,
        // então este handler só dispara para cliques fora de qualquer objeto.
        onMouseDown={() => onSelect(null)}
      >
        {/* Fundo (mesmo do export LayeredSlide) */}
        {background.type === 'image' && background.image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={background.image} alt="" className="absolute inset-0 w-full h-full object-cover" style={imgStyle} />
            {background.overlayMood && background.overlayMood !== 'none' && (
              <AtmosphereOverlay palette={pal} mood={background.overlayMood} strength={background.overlayStrength ?? 0.65} />
            )}
          </>
        ) : background.type === 'solid' ? (
          <div className="absolute inset-0" style={{ backgroundColor: background.color || '#0B0B0F' }} />
        ) : (
          <Backdrop palette={pal} mood={background.mood || 'editorial'} />
        )}

        {/* Camadas editáveis */}
        {ordered.map((layer) => (
          <div
            key={layer.id}
            data-layer-id={layer.id}
            onMouseDown={(e) => { e.stopPropagation(); if (!layer.locked) onSelect(layer.id); }}
            style={{
              position: 'absolute',
              left: layer.x, top: layer.y, width: layer.w, height: layer.h,
              transform: `rotate(${layer.rotation}deg)`,
              opacity: layer.opacity,
              cursor: layer.locked ? 'default' : 'move',
              outline: layer.id === selectedId ? '2px solid rgba(255,184,0,0.9)' : 'none',
              outlineOffset: 2,
            }}
          >
            <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
              <LayerView layer={{ ...layer, x: 0, y: 0, rotation: 0, opacity: 1 } as Layer} interactive />
            </div>
          </div>
        ))}

        {/* Grão de coesão por cima de tudo (MED-06/G2) — pointer-events none. */}
        <div className="absolute inset-0 pointer-events-none">
          <FilmGrain opacity={0.05} blend="soft-light" />
        </div>

      </div>

      {/* Grade de referência (colunas × linhas) — renderizada no container externo
          (resolução de tela) para que as linhas de 1px não somam no scale do stage. */}
      {grid && grid.cols >= 1 && grid.rows >= 1 && (
        <div
          className="absolute top-0 left-0 pointer-events-none"
          style={{
            width: CANVAS_W * scale,
            height: CANVAS_H * scale,
            backgroundImage:
              'linear-gradient(to right, rgba(45,226,200,0.35) 1px, transparent 1px),'
              + 'linear-gradient(to bottom, rgba(45,226,200,0.35) 1px, transparent 1px)',
            backgroundSize: `${(CANVAS_W * scale) / grid.cols}px ${(CANVAS_H * scale) / grid.rows}px`,
          }}
        />
      )}

      {target && selected && !selected.locked && (
        <Moveable
          target={target}
          draggable resizable rotatable
          throttleDrag={0} throttleResize={0} throttleRotate={0}
          origin={false} keepRatio={false}
          // Guias de alinhamento + snap — só renderizam durante o gesto.
          snappable={snap}
          snapThreshold={7}
          snapDirections={{ center: true, middle: true, left: true, right: true, top: true, bottom: true }}
          elementSnapDirections={{ center: true, middle: true, left: true, right: true, top: true, bottom: true }}
          verticalGuidelines={[90, CANVAS_W / 2, CANVAS_W - 90]}
          horizontalGuidelines={[90, CANVAS_H / 2, CANVAS_H - 90]}
          elementGuidelines={elementGuidelines}
          // Padrão Moveable: durante o gesto escrevemos direto no DOM (sem
          // setState → sem re-render → sem flicker) e só commitamos no *End.
          onDrag={({ target: t, left, top }) => {
            t.style.left = `${left}px`;
            t.style.top = `${top}px`;
          }}
          onDragEnd={({ lastEvent }) => {
            if (lastEvent) onChange(selected.id, { x: Math.round(lastEvent.left), y: Math.round(lastEvent.top) });
          }}
          onResize={({ target: t, width, height, drag }) => {
            t.style.width = `${width}px`;
            t.style.height = `${height}px`;
            t.style.left = `${drag.left}px`;
            t.style.top = `${drag.top}px`;
          }}
          onResizeEnd={({ lastEvent }) => {
            if (!lastEvent) return;
            const { width, height, drag } = lastEvent;
            const patch: Record<string, number> = {
              w: Math.round(width), h: Math.round(height),
              x: Math.round(drag.left), y: Math.round(drag.top),
            };
            if (selected.type === 'text' && selected.h > 0) {
              patch.fontSize = Math.max(8, Math.round(selected.fontSize * (height / selected.h)));
            }
            onChange(selected.id, patch as Partial<Layer>);
          }}
          onRotate={({ target: t, transform }) => { t.style.transform = transform; }}
          onRotateEnd={({ lastEvent }) => {
            if (lastEvent) onChange(selected.id, { rotation: Math.round(lastEvent.rotation) });
          }}
        />
      )}
    </div>
  );
}
