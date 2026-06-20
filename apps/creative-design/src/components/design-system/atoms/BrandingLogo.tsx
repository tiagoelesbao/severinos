import React from 'react';

// Central de assets VVS - MAPEAMENTO CORRETO DOS ARQUIVOS
export const VVS_ASSET_LIBRARY = {
  logos: {
    full: '/assets/logos/virals-full.png',     // Logo com nome (Virals + Estrela)
    vStar: '/assets/logos/virals-v-star.png'    // Apenas o V dramático com Estrela
  }
};

interface BrandingLogoProps {
  variant?: 'full' | 'v-star';
  color?: 'original' | 'white' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Componente de Branding Virals Puro.
 * Sem fundos, sem bordas, sem sombras indevidas.
 */
export const BrandingLogo: React.FC<BrandingLogoProps> = ({
  variant = 'full',
  color = 'original',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: "h-10",
    md: "h-16",
    lg: "h-24",
    xl: "h-36",
  };

  const src = variant === 'full' ? VVS_ASSET_LIBRARY.logos.full : VVS_ASSET_LIBRARY.logos.vStar;

  const colorFilters = {
    original: "",
    white: "brightness(0) invert(1)",
    dark: "brightness(0) opacity(0.8)",
  };

  return (
    <div className={`inline-flex items-center justify-center p-0 m-0 bg-transparent ${className}`}>
      <img 
        src={src} 
        alt="" 
        className={`${sizeClasses[size]} w-auto object-contain block`}
        style={{ filter: colorFilters[color] }}
      />
    </div>
  );
};
