import React from 'react';
import { BrandTypography } from '../atoms/BrandTypography';
import { BrandingLogo } from '../atoms/BrandingLogo';
import { AccentElement } from '../atoms/AccentElement';

interface SinglePostTemplateProps {
  variant?: 'image-first' | 'text-over-image' | 'split-layout';
  headline: string;
  bodyText?: string;
  ctaText?: string;
  backgroundImage?: string;
  theme?: 'dark' | 'light';
  logoPosition?: 'top-right' | 'bottom-right' | 'top-left';
}

export const SinglePostTemplate: React.FC<SinglePostTemplateProps> = ({
  variant = 'text-over-image',
  headline,
  bodyText,
  ctaText,
  backgroundImage,
  theme = 'dark',
  logoPosition = 'top-right',
}) => {
  const isDark = theme === 'dark';
  
  return (
    <div className={`relative w-[1080px] h-[1080px] overflow-hidden flex flex-col ${isDark ? 'bg-virals-primary text-white' : 'bg-white text-virals-primary'}`}>
      
      {/* Background Layer */}
      {backgroundImage && (
        <div className="absolute inset-0 z-0">
          <img src={backgroundImage} alt="Background" className="w-full h-full object-cover" />
          {variant === 'text-over-image' && (
            <div className="absolute inset-0 bg-black/50 z-10" />
          )}
        </div>
      )}

      {/* Content Layer */}
      <div className="relative z-20 flex-1 flex flex-col p-20 justify-center">
        
        {/* Logo */}
        <div className={`absolute p-10 ${logoPosition === 'top-right' ? 'top-0 right-0' : logoPosition === 'top-left' ? 'top-0 left-0' : 'bottom-0 right-0'}`}>
          <BrandingLogo variant="full" color={isDark ? 'white' : 'original'} size="sm" />
        </div>

        {/* Main Content */}
        <div className={`max-w-4xl ${variant === 'text-over-image' ? 'text-center mx-auto' : 'text-left'}`}>
          <BrandTypography variant="headline" size="lg" className="mb-6 uppercase">
            {headline}
          </BrandTypography>
          
          <AccentElement variant="line" className="mb-8" />
          
          {bodyText && (
            <BrandTypography variant="body" size="md" className="mb-10 max-w-2xl">
              {bodyText}
            </BrandTypography>
          )}

          {ctaText && (
            <div className="inline-block bg-virals-accent px-8 py-4 rounded-sm">
              <BrandTypography variant="cta" size="sm">
                {ctaText}
              </BrandTypography>
            </div>
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="relative z-20 p-10 flex justify-between items-end">
         <BrandTypography variant="body" size="sm" className="opacity-50">
            virals.ai
         </BrandTypography>
      </div>
    </div>
  );
};
