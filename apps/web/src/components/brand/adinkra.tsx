import { cn } from '@creatormarket/ui';

/**
 * Adinkrahene — the "chief" of the Adinkra symbols, a West African symbol of
 * greatness, charisma and leadership. Used as CreatorPlus's brand mark.
 *
 * Rendered as a stylized eight-petal rosette, stroked with the current color.
 */
export function AdinkraMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('text-gold-500', className)}
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="4" strokeLinecap="round">
        <circle cx="50" cy="50" r="7" />
        {Array.from({ length: 8 }).map((_, i) => (
          <ellipse
            key={i}
            cx="0"
            cy="-22"
            rx="6.5"
            ry="21"
            transform={`translate(50 50) rotate(${i * 45})`}
          />
        ))}
      </g>
    </svg>
  );
}

/**
 * Full-bleed, repeating Adinkrahene field for hero and section backdrops.
 * Uses an SVG <pattern> so it scales and repeats cleanly at any size.
 */
export function AdinkraField({
  className,
  markClassName,
  tileSize = 88,
  patternId = 'adinkra-field',
}: {
  className?: string;
  markClassName?: string;
  tileSize?: number;
  patternId?: string;
}) {
  return (
    <svg className={cn('absolute inset-0 h-full w-full', className)} aria-hidden="true">
      <defs>
        <pattern
          id={patternId}
          width={tileSize}
          height={tileSize}
          patternUnits="userSpaceOnUse"
        >
          <g transform={`translate(${tileSize / 2} ${tileSize / 2}) scale(${tileSize / 100})`}>
            <g stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <circle cx="50" cy="50" r="7" />
              {Array.from({ length: 8 }).map((_, i) => (
                <ellipse
                  key={i}
                  cx="0"
                  cy="-22"
                  rx="6.5"
                  ry="21"
                  transform={`rotate(${i * 45})`}
                />
              ))}
            </g>
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
