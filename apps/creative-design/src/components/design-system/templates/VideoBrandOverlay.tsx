import React from 'react';
import { BrandingLogo } from '../atoms/BrandingLogo';

interface VideoBrandOverlayProps {
  name?: string;
  role?: string;
  accentColor?: string;
  showWatermark?: boolean;
  viewport?: { width: number; height: number };
}

/**
 * Template para branding contínuo em vídeos (Lower Thirds e Watermark).
 * Mantém consistência de marca sem obstruir o conteúdo principal.
 */
export const VideoBrandOverlay: React.FC<VideoBrandOverlayProps> = ({
  name,
  role,
  accentColor = '#E94560',
  showWatermark = true,
  viewport = { width: 1080, height: 1920 }
}) => {
  return (
    <div 
      className="relative overflow-hidden flex flex-col justify-end bg-transparent text-white font-sans"
      style={{ width: viewport.width, height: viewport.height }}
    >
      {/* Watermark Top Right */}
      {showWatermark && (
        <div className="absolute top-20 right-20 opacity-30 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          <BrandingLogo variant="v-star" color="white" size="md" />
        </div>
      )}

      {/* Lower Third (Bottom Left) */}
      {name && (
        <div className="mb-32 ml-20 flex flex-col gap-3">
           <div className="flex items-center gap-6">
              <div 
                className="w-2 h-16 bg-virals-accent shadow-[0_0_20px_rgba(233,69,96,0.5)]" 
                style={{ backgroundColor: accentColor }} 
              />
              <div className="flex flex-col justify-center">
                <span className="text-5xl font-black uppercase tracking-tight drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
                  {name}
                </span>
                {role && (
                  <span className="text-2xl font-bold uppercase tracking-[0.4em] opacity-70 drop-shadow-md">
                    {role}
                  </span>
                )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
