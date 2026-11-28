import { cn } from '../lib/cn';

/**
 * Chalk pitch markings: halfway line, centre circle and a penalty box.
 * The SPORT signature, drawn on deep pitch green surfaces. Decorative only.
 */
export function PitchLines({
  className,
  variant = 'centre',
}: {
  className?: string;
  variant?: 'centre' | 'box';
}) {
  return (
    <svg
      aria-hidden
      focusable="false"
      className={cn('pointer-events-none absolute inset-0 size-full text-chalk-line', className)}
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      {variant === 'centre' ? (
        <>
          <line x1="200" y1="-10" x2="200" y2="250" />
          <circle cx="200" cy="120" r="54" />
          <circle cx="200" cy="120" r="2.5" fill="currentColor" />
          <rect x="-1" y="40" width="58" height="160" />
          <rect x="343" y="40" width="58" height="160" />
        </>
      ) : (
        <>
          <rect x="120" y="-1" width="160" height="70" />
          <rect x="165" y="-1" width="70" height="28" />
          <path d="M160 69 A 48 48 0 0 0 240 69" />
          <circle cx="200" cy="48" r="2.5" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
