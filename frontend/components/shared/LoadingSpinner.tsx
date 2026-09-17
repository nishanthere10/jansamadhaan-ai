import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ 
  size = 'md',
  className = ''
}: { 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeMap = {
    sm: 'w-3.5 h-3.5',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };

  if (size === 'sm') {
    return (
      <Loader2 className={`animate-spin text-current inline-block ${sizeMap[size]} ${className}`} />
    );
  }

  return (
    <div className={`flex items-center justify-center ${size === 'lg' ? 'py-12' : 'py-4'}`}>
      <Loader2 className={`animate-spin text-[var(--cr-primary)] ${sizeMap[size]} ${className}`} />
    </div>
  );
}
