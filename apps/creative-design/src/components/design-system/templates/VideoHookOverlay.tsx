import React from 'react';

interface VideoHookOverlayProps {
  headline: string;
  subHeadline?: string;
  accentColor?: string;
  viewport?: { width: number; height: number };
}

/**
 * Template para o Hook Visual inicial de vídeos (Reels/YouTube).
 * Foca em impacto máximo e tipografia agressiva.
 */
export const VideoHookOverlay: React.FC<VideoHookOverlayProps> = ({
  headline,
  subHeadline,
  accentColor = '#E94560',
  viewport = { width: 1080, height: 1920 }
}) => {
  return (
    <div 
      className="relative overflow-hidden flex flex-col justify-center items-center px-12 bg-transparent text-white font-sans"
      style={{ width: viewport.width, height: viewport.height }}
    >
      <div className="flex flex-col items-center text-center max-w-4xl">
        {subHeadline && (
          <span className="text-3xl font-bold tracking-[0.5em] uppercase opacity-90 mb-8 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
            {subHeadline}
          </span>
        )}
        
        <h1 className="text-[140px] leading-[0.8] font-black uppercase mb-16 tracking-tighter drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)]">
          {headline.split(' ').map((word, i) => (
            <span key={i} className="block">{word}</span>
          ))}
        </h1>
        
        <div 
          className="w-48 h-3 bg-virals-accent shadow-[0_0_40px_rgba(233,69,96,0.8)]" 
          style={{ backgroundColor: accentColor }} 
        />
      </div>
    </div>
  );
};
