import React from 'react';
import { BrandTypography } from '../atoms/BrandTypography';
import { BrandingLogo } from '../atoms/BrandingLogo';
import { AccentElement } from '../atoms/AccentElement';

interface CarouselSlideProps {
  slideNumber: number;
  totalSlides: number;
  headline: string;
  bodyText?: string;
  backgroundImage?: string;
  theme?: 'dark' | 'light';
  type?: 'hook' | 'valor' | 'cta';
}

export const CarouselSlide: React.FC<CarouselSlideProps> = ({
  slideNumber,
  totalSlides,
  headline,
  bodyText,
  backgroundImage,
  theme = 'dark',
  type = 'valor',
}) => {
  const isDark = theme === 'dark';
  const progressWidth = `${(slideNumber / totalSlides) * 100}%`;
  
  return (
    <div className={`relative w-[1080px] h-[1080px] overflow-hidden flex flex-col ${isDark ? 'bg-virals-primary text-white' : 'bg-white text-virals-primary'}`}>
      
      {/* Background */}
      {backgroundImage && (
        <div className="absolute inset-0 z-0 opacity-40">
          <img src={backgroundImage} alt="Background" className="w-full h-full object-cover" />
          <div className={`absolute inset-0 ${isDark ? 'bg-virals-primary/60' : 'bg-white/60'}`} />
        </div>
      )}

      {/* Header: Progress & Slide Counter */}
      <div className="relative z-20 flex flex-col w-full">
        <div className="w-full h-2 bg-gray-800">
           <div className="h-full bg-virals-accent transition-all duration-500" style={{ width: progressWidth }} />
        </div>
        <div className="flex justify-between items-center px-12 py-8">
          <BrandingLogo variant="icon" color={isDark ? 'white' : 'original'} size="sm" />
          <BrandTypography variant="body" size="sm" className="font-mono">
            {slideNumber.toString().padStart(2, '0')} / {totalSlides.toString().padStart(2, '0')}
          </BrandTypography>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-20 flex-1 flex flex-col px-20 justify-center">
        <div className="max-w-4xl">
          <BrandTypography 
            variant="headline" 
            size={type === 'hook' ? 'xl' : 'lg'} 
            className={`mb-8 uppercase ${type === 'hook' ? 'text-virals-accent' : ''}`}
          >
            {headline}
          </BrandTypography>
          
          <AccentElement variant="line" className="mb-10 w-32" />
          
          {bodyText && (
            <BrandTypography variant="body" size="md" className="max-w-3xl leading-relaxed">
              {bodyText}
            </BrandTypography>
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="relative z-20 px-12 py-10 flex justify-between items-end border-t border-white/10">
         <BrandTypography variant="body" size="sm" className="opacity-40 italic">
            {type === 'cta' ? 'virals.ai • Salve este conteúdo' : 'virals.ai • arraste para o lado'}
         </BrandTypography>
         
         {type === 'cta' && (
            <div className="w-12 h-12 bg-virals-accent flex items-center justify-center rounded-full shadow-lg">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
               </svg>
            </div>
         )}
      </div>
    </div>
  );
};
