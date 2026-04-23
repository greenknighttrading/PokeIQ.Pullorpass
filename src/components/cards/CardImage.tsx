import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ImageOff } from 'lucide-react';

interface CardImageProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showFallback?: boolean;
}

const sizeClasses = {
  sm: 'w-12 h-16',
  md: 'w-24 h-32',
  lg: 'w-48 h-64',
};

export function CardImage({ 
  src, 
  alt, 
  size = 'md', 
  className,
  showFallback = true 
}: CardImageProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (!src || error) {
    if (!showFallback) return null;
    
    return (
      <div 
        className={cn(
          sizeClasses[size],
          'flex items-center justify-center bg-muted rounded-lg border border-border',
          className
        )}
      >
        <ImageOff className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn(sizeClasses[size], 'relative', className)}>
      {loading && (
        <div className={cn(
          sizeClasses[size],
          'absolute inset-0 bg-muted animate-pulse rounded-lg'
        )} />
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          'w-full h-full object-contain rounded-lg',
          loading && 'opacity-0'
        )}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
      />
    </div>
  );
}
