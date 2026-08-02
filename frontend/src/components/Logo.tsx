interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-base px-2 py-1',
    md: 'text-xl px-3 py-2',
    lg: 'text-3xl px-4 py-3',
  };

  return (
    <div
      className={`inline-flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-200 ${sizeClasses[size]} ${className}`}
    >
      <span className="font-bold text-red-600 italic tracking-tight leading-none">cc</span>
    </div>
  );
}
