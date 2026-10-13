import React from 'react';

interface BrandTypographyProps {
  variant?: 'headline' | 'body' | 'cta';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
}

export const BrandTypography: React.FC<BrandTypographyProps> = ({
  variant = 'body',
  size = 'md',
  children,
  className = '',
  as: Component = variant === 'headline' ? 'h1' : 'p',
}) => {
  const baseStyle = "font-sans leading-tight";
  
  const variants = {
    headline: "font-bold tracking-tight text-virals-text-primary",
    body: "font-normal text-virals-text-secondary",
    cta: "font-semibold uppercase tracking-wider text-virals-text-primary",
  };

  const sizes = {
    xl: "text-7xl md:text-8xl",
    lg: "text-5xl md:text-6xl",
    md: "text-3xl md:text-4xl",
    sm: "text-xl md:text-2xl",
  };

  const combinedClasses = `${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`;

  return <Component className={combinedClasses}>{children}</Component>;
};
