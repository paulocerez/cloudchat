import React from 'react';

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'none' | { base: string; lg?: string; xl?: string };
}

export function PageLayout({ 
  title, 
  subtitle, 
  children, 
  maxWidth = '2xl' 
}: PageLayoutProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    'none': 'max-w-none'
  };

  const getMaxWidthClass = () => {
    if (typeof maxWidth === 'object') {
      const baseClass = maxWidthClasses[maxWidth.base as keyof typeof maxWidthClasses] || 'max-w-2xl';
      const lgClass = maxWidth.lg ? maxWidthClasses[maxWidth.lg as keyof typeof maxWidthClasses] : null;
      const xlClass = maxWidth.xl ? maxWidthClasses[maxWidth.xl as keyof typeof maxWidthClasses] : null;
      
      let responsiveClasses = baseClass;
      if (lgClass) responsiveClasses += ` lg:${lgClass}`;
      if (xlClass) responsiveClasses += ` xl:${xlClass}`;
      
      return responsiveClasses;
    }
    return maxWidthClasses[maxWidth] || 'max-w-2xl';
  };

  return (
    <div className="min-h-screen bg-white">
      <div className={`${getMaxWidthClass()} mx-auto px-6 py-16`}>
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
          {subtitle && (
            <p className="text-md text-gray-600">{subtitle}</p>
          )}
        </div>
        <div className="space-y-8">
          {children}
        </div>
      </div>
    </div>
  );
} 