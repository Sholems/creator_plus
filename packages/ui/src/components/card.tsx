import { cn } from '../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated';
}

export function Card({ className, variant = 'default', ...props }: CardProps) {
  const variants = {
    default: 'bg-white border border-gray-200',
    bordered: 'bg-white border-2 border-gray-200',
    elevated: 'bg-white shadow-lg',
  };

  return (
    <div
      className={cn('rounded-xl', variants[variant], className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-6 py-4 border-b border-gray-200', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4', className)} {...props} />
  );
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-6 py-4 border-t border-gray-200', className)}
      {...props}
    />
  );
}
