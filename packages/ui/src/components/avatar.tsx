import { cn } from '../lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Avatar({
  className,
  src,
  alt,
  fallback,
  size = 'md',
  ...props
}: AvatarProps) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  const initials = fallback
    ? fallback
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gray-100',
        sizes[size],
        className
      )}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt || fallback || 'Avatar'}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="font-medium text-gray-600">{initials}</span>
      )}
    </div>
  );
}
