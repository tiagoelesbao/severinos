import React from 'react';

interface AccentElementProps {
  variant?: 'line' | 'dot' | 'square';
  color?: string;
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const AccentElement: React.FC<AccentElementProps> = ({
  variant = 'line',
  color = 'bg-virals-accent',
  width = 'w-24',
  height = 'h-2',
  className = '',
}) => {
  const baseClasses = `${color} ${className}`;
  
  const variantStyles = {
    line: `${width} ${height}`,
    dot: 'w-4 h-4 rounded-full',
    square: 'w-8 h-8',
  };

  return <div className={`${baseClasses} ${variantStyles[variant]}`} />;
};
