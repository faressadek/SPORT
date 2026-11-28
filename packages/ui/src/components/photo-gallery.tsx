'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { ChevronLeft, ChevronRight, Expand, Play, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '../lib/cn';

export interface MediaItem {
  id: string;
  src: string;
  /** Describe what the photo shows: "Court 2, artificial turf under floodlights". */
  alt: string;
  kind?: 'photo' | 'video';
  /** Poster frame for videos. */
  poster?: string;
}

interface SliderProps {
  items: MediaItem[];
  label: string;
  index: number;
  onIndexChange: (i: number) => void;
  fullscreen?: boolean;
  aspect?: string;
  onOpen?: () => void;
}

/** Native scroll-snap: touch swipe for free, arrows and buttons for keyboard and mouse. */
function Slider({
  items,
  label,
  index,
  onIndexChange,
  fullscreen,
  aspect = 'aspect-[4/3]',
  onOpen,
}: SliderProps) {
  const track = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLDivElement | null)[]>([]);
  const fromScroll = useRef(false);
  const current = useRef(index);
  useEffect(() => {
    current.current = index;
  }, [index]);

  // Keep `index` in sync with what the user swiped to.
  useEffect(() => {
    const root = track.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            const i = slides.current.indexOf(e.target as HTMLDivElement);
            if (i >= 0 && i !== current.current) {
              fromScroll.current = true;
              onIndexChange(i);
            }
          }
        }
      },
      { root, threshold: [0.6] },
    );
    slides.current.forEach((s) => s && io.observe(s));
    return () => io.disconnect();
  }, [items, onIndexChange]);

  // Scroll when index changes from a button/key (not from a swipe).
  useEffect(() => {
    if (fromScroll.current) {
      fromScroll.current = false;
      return;
    }
    const el = slides.current[index];
    const root = track.current;
    if (!el || !root) return;
    const rootRect = root.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    root.scrollBy({ left: elRect.left - rootRect.left, behavior: 'smooth' });
  }, [index]);

  const go = useCallback(
    (delta: number) => onIndexChange(Math.max(0, Math.min(items.length - 1, index + delta))),
    [index, items.length, onIndexChange],
  );

  const onKeyDown = (e: KeyboardEvent) => {
    const rtl = (e.currentTarget as HTMLElement).closest('[dir="rtl"]') !== null;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(rtl ? -1 : 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(rtl ? 1 : -1);
    } else if (e.key === 'Enter' && onOpen) {
      onOpen();
    }
  };

  const many = items.length > 1;

  return (
    <div
      className={cn('group relative', fullscreen ? 'h-full' : '')}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
    >
      <div
        ref={track}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className={cn(
          'scrollbar-none flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain',
          'focus-visible:outline-offset-[-3px]',
          fullscreen ? 'h-full' : cn(aspect, 'rounded-[inherit]'),
        )}
        aria-label={`${label}. Use left and right arrow keys to see more photos.`}
      >
        {items.map((m, i) => (
          <div
            key={m.id}
            ref={(el) => {
              slides.current[i] = el;
            }}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${items.length}`}
            className={cn(
              'relative w-full shrink-0 snap-start snap-always',
              fullscreen ? 'h-full' : '',
            )}
          >
            {m.kind === 'video' ? (
              fullscreen ? (
                <video
                  src={m.src}
                  poster={m.poster}
                  controls
                  playsInline
                  preload="metadata"
                  className="size-full object-contain"
                  aria-label={m.alt}
                />
              ) : (
                <>
                  <img
                    src={m.poster ?? m.src}
                    alt={m.alt}
                    className="size-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
                    <span className="flex size-14 items-center justify-center rounded-full bg-pitch/80 text-on-pitch">
                      <Play className="size-6 fill-current" />
                    </span>
                  </span>
                </>
              )
            ) : (
              <img
                src={m.src}
                alt={m.alt}
                className={cn('size-full', fullscreen ? 'object-contain' : 'object-cover')}
                loading={i === 0 ? 'eager' : 'lazy'}
                draggable={false}
              />
            )}
          </div>
        ))}
      </div>

      {many ? (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={index === 0}
            aria-label="Previous photo"
            className={cn(
              'absolute start-2 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink shadow-raised disabled:opacity-0 sm:flex',
              !fullscreen &&
                'opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
            )}
          >
            <ChevronLeft className="rtl-flip size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={index === items.length - 1}
            aria-label="Next photo"
            className={cn(
              'absolute end-2 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink shadow-raised disabled:opacity-0 sm:flex',
              !fullscreen &&
                'opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
            )}
          >
            <ChevronRight className="rtl-flip size-5" aria-hidden />
          </button>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5"
            aria-hidden
          >
            {items.map((m, i) => (
              <span
                key={m.id}
                className={cn(
                  'h-1.5 rounded-full bg-white/70 shadow-[0_0_2px_rgb(0_0_0/0.5)] transition-all duration-(--duration-enter)',
                  i === index ? 'w-4 bg-white' : 'w-1.5',
                )}
              />
            ))}
          </div>
          <span className="sr-only" aria-live="polite">
            Photo {index + 1} of {items.length}: {items[index]?.alt}
          </span>
        </>
      ) : null}
    </div>
  );
}

export interface PhotoGalleryProps {
  items: MediaItem[];
  /** Names the gallery for screen readers: "Photos of Smouha Sporting Club, Court 2". */
  label: string;
  /** Tailwind aspect class for the inline slider. */
  aspect?: string;
  /** Show the full-screen button. Off inside cards that are themselves links. */
  expandable?: boolean;
  className?: string;
}

/** Swipe gallery with an optional full-screen view (photos and videos). */
export function PhotoGallery({
  items,
  label,
  aspect,
  expandable = true,
  className,
}: PhotoGalleryProps) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  if (items.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-sunken text-sm text-ink-muted',
          aspect ?? 'aspect-[4/3]',
          className,
        )}
      >
        No photos yet
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden bg-sunken', className)}>
      <Slider
        items={items}
        label={label}
        index={index}
        onIndexChange={setIndex}
        aspect={aspect}
        onOpen={expandable ? () => setOpen(true) : undefined}
      />
      {expandable ? (
        <RadixDialog.Root open={open} onOpenChange={setOpen}>
          <RadixDialog.Trigger
            aria-label="View full screen"
            className="absolute end-2 top-2 flex size-11 items-center justify-center rounded-full bg-surface/90 text-ink shadow-raised"
          >
            <Expand className="size-4" aria-hidden />
          </RadixDialog.Trigger>
          <RadixDialog.Portal>
            <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/95 data-[state=open]:animate-fade-in" />
            <RadixDialog.Content
              aria-describedby={undefined}
              className="fixed inset-0 z-50 flex flex-col text-white focus:outline-none"
            >
              <div className="flex items-center justify-between px-4 py-2">
                <RadixDialog.Title className="text-sm font-semibold">
                  {label}{' '}
                  <span className="font-normal text-white/80">
                    · {index + 1} / {items.length}
                  </span>
                </RadixDialog.Title>
                <RadixDialog.Close
                  aria-label="Close full screen"
                  className="flex size-11 items-center justify-center rounded-full hover:bg-white/10"
                >
                  <X className="size-5" aria-hidden />
                </RadixDialog.Close>
              </div>
              <div className="min-h-0 flex-1">
                <Slider
                  items={items}
                  label={label}
                  index={index}
                  onIndexChange={setIndex}
                  fullscreen
                />
              </div>
              <p className="px-4 py-3 text-center text-sm text-white/85">{items[index]?.alt}</p>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        </RadixDialog.Root>
      ) : null}
    </div>
  );
}
