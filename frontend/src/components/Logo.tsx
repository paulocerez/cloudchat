interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  /** `chip` is the bordered card used on the login screen; `plain` is the bare
   *  mark for chrome, where a white box on glass reads as a button. */
  variant?: 'chip' | 'plain';
  className?: string;
}

export function Logo({ size = 'md', variant = 'chip', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: variant === 'chip' ? 'text-base px-2 py-1' : 'text-base',
    md: variant === 'chip' ? 'text-xl px-3 py-2' : 'text-xl',
    lg: variant === 'chip' ? 'text-3xl px-4 py-3' : 'text-3xl',
  };
  const surface =
    variant === 'chip' ? 'bg-white rounded-sm shadow-sm border border-gray-200' : '';

  return (
    <div
      className={`inline-flex items-center justify-center ${surface} ${sizeClasses[size]} ${className}`}
    >
      <span className="font-bold text-red-600 italic tracking-tight leading-none">cc</span>
    </div>
  );
}
