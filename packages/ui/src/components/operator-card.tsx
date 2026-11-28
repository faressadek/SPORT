import { MapPin } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { PlainLink, type LinkComponent } from '../lib/link';
import type { Locale } from '../lib/format';
import { Avatar } from './avatar';
import { Badge } from './badge';
import { PriceTag } from './price-tag';
import { Rating } from './rating';
import { Skeleton } from './skeleton';

export type OperatorKind = 'coach' | 'court_owner' | 'gym' | 'academy';

export interface OperatorCardProps {
  href: string;
  kind: OperatorKind;
  name: string;
  photo?: string | null;
  /** Logo for gyms and academies, face for coaches. */
  avatar?: string | null;
  sports: string[];
  area: string;
  rating: number;
  ratingCount: number;
  /** Starting price in minor units. */
  startingPrice?: number | null;
  currency?: string;
  /** "/ session", "/ month", "/ term". */
  priceUnit?: string;
  /** Short facts worth seeing before tapping: "Free trial", "Ladies' hours". */
  highlights?: string[];
  layout?: 'stack' | 'row';
  linkAs?: LinkComponent;
  locale?: Locale;
  className?: string;
  /** Slot for a save/favourite button; sits above the card link. */
  accessory?: ReactNode;
}

const KIND_LABEL: Record<OperatorKind, string> = {
  coach: 'Coach',
  court_owner: 'Courts',
  gym: 'Gym',
  academy: 'Academy',
};

/** An operator in a Coaches, Gyms or Academies list (SPEC R3). The whole card is one link. */
export function OperatorCard({
  href,
  kind,
  name,
  photo,
  avatar,
  sports,
  area,
  rating,
  ratingCount,
  startingPrice,
  currency = 'EGP',
  priceUnit,
  highlights = [],
  layout = 'stack',
  linkAs: Link = PlainLink,
  locale,
  className,
  accessory,
}: OperatorCardProps) {
  const row = layout === 'row';
  return (
    <article
      className={cn(
        'group relative flex overflow-hidden rounded-lg border border-line bg-surface',
        'transition-[border-color,box-shadow] duration-(--duration-enter) hover:border-line-strong hover:shadow-raised',
        'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus',
        row ? 'flex-row' : 'flex-col',
        className,
      )}
    >
      <div
        className={cn('relative shrink-0 bg-sunken', row ? 'w-28 sm:w-40' : 'aspect-[4/3] w-full')}
      >
        {photo ? (
          <img src={photo} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <div className="flex size-full items-center justify-center bg-pitch">
            <Avatar
              name={name}
              src={avatar}
              size="lg"
              shape={kind === 'coach' ? 'circle' : 'square'}
            />
          </div>
        )}
        {!row && photo && avatar ? (
          <Avatar
            name={name}
            src={avatar}
            size="md"
            shape={kind === 'coach' ? 'circle' : 'square'}
            className="absolute -bottom-5 start-4 ring-3 ring-surface"
          />
        ) : null}
      </div>

      <div
        className={cn('flex min-w-0 flex-1 flex-col gap-2 p-4', !row && photo && avatar && 'pt-7')}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 font-display text-xl font-extrabold leading-tight text-ink">
            <Link
              href={href}
              className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
            >
              {name}
            </Link>
          </h3>
          <Rating value={rating} count={ratingCount} className="shrink-0 pt-0.5" />
        </div>
        <p className="flex items-center gap-1 text-sm text-ink-muted">
          <span className="sr-only">{KIND_LABEL[kind]}, </span>
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{area}</span>
        </p>
        {sports.length || highlights.length ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Sports and highlights">
            {sports.slice(0, 3).map((s) => (
              <li key={s}>
                <Badge>{s}</Badge>
              </li>
            ))}
            {highlights.slice(0, 2).map((h) => (
              <li key={h}>
                <Badge tone="success">{h}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
        {startingPrice != null ? (
          <div className="mt-auto pt-1">
            <PriceTag
              amount={startingPrice}
              currency={currency}
              prefix="from"
              unit={priceUnit}
              size="sm"
              locale={locale}
            />
          </div>
        ) : null}
      </div>
      {accessory ? <div className="absolute end-2 top-2 z-10">{accessory}</div> : null}
    </article>
  );
}

export function OperatorCardSkeleton({ layout = 'stack' }: { layout?: 'stack' | 'row' }) {
  const row = layout === 'row';
  return (
    <div
      className={cn(
        'flex overflow-hidden rounded-lg border border-line bg-surface',
        row ? 'flex-row' : 'flex-col',
      )}
      aria-hidden
    >
      <Skeleton
        className={cn('rounded-none', row ? 'w-28 self-stretch sm:w-40' : 'aspect-[4/3] w-full')}
      />
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-14" />
        </div>
        <Skeleton className="mt-1 h-6 w-28" />
      </div>
    </div>
  );
}
