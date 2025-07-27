interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl', 
    lg: 'text-3xl'
  };

  return (
    <div className={`inline-flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100 px-3 py-2 ${sizeClasses[size]} ${className}`}>
      <div className="font-bold text-red-600 italic tracking-tight">
        cc
      </div>
    </div>
  );
} 