import { Lightbulb, MapPin } from 'lucide-react';
import { cn } from '../lib/cn';
import { PlainLink, type LinkComponent } from '../lib/link';
import type { Locale } from '../lib/format';
import { Badge } from './badge';
import { PhotoGallery, type MediaItem } from './photo-gallery';
import { PriceTag } from './price-tag';
import { Rating } from './rating';
import { Skeleton } from './skeleton';

export interface VenueCardProps {
  href: string;
  venueName: string;
  branchName: string;
  area: string;
  /** 2–3 photos of this branch: surface, lighting, indoor or outdoor (SPEC R6). */
  photos: MediaItem[];
  sports: string[];
  surfaces?: string[];
  indoor?: boolean;
  outdoor?: boolean;
  floodlit?: boolean;
  courtsCount?: number;
  rating?: number;
  ratingCount?: number;
  /** Lowest hourly price in minor units. */
  priceFrom?: number | null;
  currency?: string;
  /** e.g. "Next free 19:00". */
  nextFree?: string;
  linkAs?: LinkComponent;
  locale?: Locale;
  className?: string;
}

/**
 * A venue branch in the Courts list. The gallery swipes on its own;
 * the text area links to the branch.
 */
export function VenueCard({
  href,
  venueName,
  branchName,
  area,
  photos,
  sports,
  surfaces = [],
  indoor,
  outdoor,
  floodlit,
  courtsCount,
  rating,
  ratingCount,
  priceFrom,
  currency = 'EGP',
  nextFree,
  linkAs: Link = PlainLink,
  locale,
  className,
}: VenueCardProps) {
  return (
    <article
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border border-line bg-surface',
        className,
      )}
    >
      <PhotoGallery
        items={photos.slice(0, 3)}
        label={`Photos of ${venueName}, ${branchName}`}
        aspect="aspect-[16/10]"
        expandable
      />
      <div
        className={cn(
          'relative flex flex-1 flex-col gap-2 p-4',
          'focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-focus',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-xl font-extrabold leading-tight text-ink">
              <Link
                href={href}
                className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
              >
                {venueName}
                <span className="block font-body text-base font-semibold text-ink-muted">
                  {branchName}
                </span>
              </Link>
            </h3>
          </div>
          {rating !== undefined ? (
            <Rating value={rating} count={ratingCount} className="shrink-0 pt-0.5" />
          ) : null}
        </div>
        <p className="flex items-center gap-1 text-sm text-ink-muted">
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{area}</span>
          {courtsCount ? <span className="shrink-0">, {courtsCount} courts</span> : null}
        </p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Courts at this branch">
          {sports.map((s) => (
            <li key={s}>
              <Badge>{s}</Badge>
            </li>
          ))}
          {surfaces.map((s) => (
            <li key={s}>
              <Badge>{s}</Badge>
            </li>
          ))}
          {indoor ? (
            <li>
              <Badge tone="info">Indoor</Badge>
            </li>
          ) : null}
          {outdoor ? (
            <li>
              <Badge tone="info">Outdoor</Badge>
            </li>
          ) : null}
          {floodlit ? (
            <li>
              <Badge tone="warning" icon={<Lightbulb className="size-3" aria-hidden />}>
                Floodlit
              </Badge>
            </li>
          ) : null}
        </ul>
        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          {priceFrom != null ? (
            <PriceTag
              amount={priceFrom}
              currency={currency}
              prefix="from"
              unit="/ hour"
              size="sm"
              locale={locale}
            />
          ) : (
            <span />
          )}
          {nextFree ? (
            <span className="rounded-sm bg-pitch px-2 py-1 text-xs font-semibold text-on-pitch">
              {nextFree}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function VenueCardSkeleton() {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface"
      aria-hidden
    >
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="flex flex-col gap-2.5 p-4">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    </div>
  );
}
