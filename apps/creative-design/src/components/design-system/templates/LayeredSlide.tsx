import React from 'react';
import { Backdrop, AtmosphereOverlay, FilmGrain, resolvePalette } from '../fx';
import { LayerView } from '../../studio/LayerView';
import {
  CANVAS_W, CANVAS_H, sortedVisibleLayers,
  type Layer, type SlideBackground,
} from '@/lib/layers';

interface LayeredSlideProps {
  layers?: Layer[];
  background?: SlideBackground;
  /** Brand-agnostic palette (MKT-MC4-05) — alimenta o PremiumBackground. */
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  accentAlt?: string;
  accentAurora?: string;
}

/**
 * LayeredSlide — template de EXPORT do Creative Studio (MED-05).
 * Reconstrói um slide a partir do modelo de camadas serializado pelo /studio,
 * usando o MESMO LayerView do canvas interativo → o PNG é fiel ao que foi
 * editado. templateId de render: "layered".
 */
export const LayeredSlide: React.FC<LayeredSlideProps> = ({
  layers = [],
  background = { type: 'brand' },
  primaryColor,
  secondaryColor,
  accentColor = '#FFB800',
  accentAlt,
  accentAurora,
}) => {
  const ordered = sortedVisibleLayers(layers);
  const palette = resolvePalette({
    primaryColor, secondaryColor, accentColor, accentAlt, accentAurora,
  });
  const imgStyle: React.CSSProperties = {
    objectPosition: `${background.imagePosX ?? 50}% ${background.imagePosY ?? 50}%`,
    transform: background.imageZoom && background.imageZoom !== 1
      ? `scale(${background.imageZoom})` : undefined,
  };

  return (
    <div
      className="relative overflow-hidden font-sans bg-black"
      style={{ width: CANVAS_W, height: CANVAS_H }}
    >
      {/* Fundo */}
      {background.type === 'image' && background.image ? (
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={background.image} alt="" className="w-full h-full object-cover" style={imgStyle} />
          {background.overlayMood && background.overlayMood !== 'none' && (
            <AtmosphereOverlay palette={palette} mood={background.overlayMood} strength={background.overlayStrength ?? 0.65} />
          )}
        </div>
      ) : background.type === 'solid' ? (
        <div className="absolute inset-0 z-0" style={{ backgroundColor: background.color || '#0B0B0F' }} />
      ) : (
        <Backdrop palette={palette} mood={background.mood || 'editorial'} />
      )}

      {/* Camadas */}
      <div className="absolute inset-0 z-10">
        {ordered.map((layer) => (
          <LayerView key={layer.id} layer={layer} />
        ))}
      </div>

      {/* Grão de coesão por cima de tudo (MED-06/G2) — textura tipo filme. */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <FilmGrain opacity={0.05} blend="soft-light" />
      </div>
    </div>
  );
};
