import { cn } from '../lib/utils';

export interface ProductCardProps {
  id: string;
  title: string;
  slug: string;
  price: number;
  currency?: string;
  coverImage?: string;
  creatorName: string;
  creatorSlug: string;
  rating?: number;
  reviewCount?: number;
  category?: string;
  className?: string;
}

export function ProductCard({
  title,
  price,
  coverImage,
  creatorName,
  rating,
  reviewCount,
  category,
  className,
}: ProductCardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md',
        className
      )}
    >
      <div className="aspect-[4/3] overflow-hidden bg-gray-100">
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            <svg
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="p-4">
        {category && (
          <span className="text-xs font-medium text-blue-600">{category}</span>
        )}
        <h3 className="mt-1 text-sm font-semibold text-gray-900 line-clamp-2">
          {title}
        </h3>
        <p className="mt-1 text-xs text-gray-500">by {creatorName}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900">
            ${price.toFixed(2)}
          </span>
          {rating !== undefined && (
            <div className="flex items-center gap-1">
              <svg
                className="h-4 w-4 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-medium text-gray-600">
                {rating.toFixed(1)}
              </span>
              {reviewCount !== undefined && (
                <span className="text-xs text-gray-400">({reviewCount})</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
