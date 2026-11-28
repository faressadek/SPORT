'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '../lib/cn';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

interface OverlayContentProps extends Omit<
  ComponentPropsWithoutRef<typeof RadixDialog.Content>,
  'title'
> {
  title: ReactNode;
  description?: ReactNode;
  /** Visually hide the title (it stays for screen readers). */
  hideTitle?: boolean;
  footer?: ReactNode;
  closeLabel?: string;
}

function Overlay() {
  return (
    <RadixDialog.Overlay className="fixed inset-0 z-40 bg-scrim data-[state=open]:animate-fade-in" />
  );
}

function Header({
  title,
  description,
  hideTitle,
  closeLabel,
}: Pick<OverlayContentProps, 'title' | 'description' | 'hideTitle' | 'closeLabel'>) {
  return (
    <div className={cn('flex items-start gap-3', hideTitle ? 'absolute end-2 top-2' : 'mb-4')}>
      <div className={cn('flex-1', hideTitle && 'sr-only')}>
        <RadixDialog.Title className="font-display text-2xl font-extrabold leading-tight text-ink">
          {title}
        </RadixDialog.Title>
        {description ? (
          <RadixDialog.Description className="mt-1 text-sm text-ink-muted">
            {description}
          </RadixDialog.Description>
        ) : null}
      </div>
      <RadixDialog.Close
        className="-me-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-sunken hover:text-ink"
        aria-label={closeLabel ?? 'Close'}
      >
        <X className="size-5" aria-hidden />
      </RadixDialog.Close>
    </div>
  );
}

/** A centred dialog for confirmations ("Cancel this booking?"). */
export function DialogContent({
  title,
  description,
  hideTitle,
  footer,
  closeLabel,
  className,
  children,
  ...props
}: OverlayContentProps) {
  return (
    <RadixDialog.Portal>
      <Overlay />
      <RadixDialog.Content
        {...(description ? {} : { 'aria-describedby': undefined })}
        className={cn(
          'fixed start-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2',
          'rounded-xl bg-surface p-5 shadow-overlay data-[state=open]:animate-pop-in sm:p-6',
          'max-h-[calc(100dvh-2rem)] overflow-y-auto',
          className,
        )}
        {...props}
      >
        <Header
          title={title}
          description={description}
          hideTitle={hideTitle}
          closeLabel={closeLabel}
        />
        {children}
        {footer ? (
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export const Sheet = RadixDialog.Root;
export const SheetTrigger = RadixDialog.Trigger;
export const SheetClose = RadixDialog.Close;

export interface SheetContentProps extends OverlayContentProps {
  /**
   * `auto` = bottom sheet on phones, side panel (end edge) from 640px.
   * Filters on list pages use this.
   */
  side?: 'auto' | 'bottom' | 'end';
}

export function SheetContent({
  title,
  description,
  hideTitle,
  footer,
  closeLabel,
  side = 'auto',
  className,
  children,
  ...props
}: SheetContentProps) {
  const bottom = 'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-xl animate-sheet-up';
  const end =
    'inset-y-0 end-0 h-dvh w-[min(26rem,100vw)] rounded-none animate-sheet-in-end [--sheet-from:100%] rtl:[--sheet-from:-100%]';
  return (
    <RadixDialog.Portal>
      <Overlay />
      <RadixDialog.Content
        {...(description ? {} : { 'aria-describedby': undefined })}
        className={cn(
          'fixed z-50 flex flex-col bg-surface shadow-overlay',
          side === 'bottom' && bottom,
          side === 'end' && end,
          side === 'auto' &&
            cn(
              bottom,
              'sm:inset-x-auto sm:inset-y-0 sm:end-0 sm:bottom-auto sm:h-dvh sm:max-h-none sm:w-[26rem] sm:rounded-none sm:animate-sheet-in-end sm:[--sheet-from:100%] sm:rtl:[--sheet-from:-100%]',
            ),
          className,
        )}
        {...props}
      >
        {side !== 'end' ? (
          <div
            className={cn(
              'mx-auto mt-2 h-1.5 w-10 rounded-full bg-line-strong',
              side === 'auto' && 'sm:hidden',
            )}
            aria-hidden
          />
        ) : null}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-5">
          <Header
            title={title}
            description={description}
            hideTitle={hideTitle}
            closeLabel={closeLabel}
          />
          {children}
        </div>
        {footer ? (
          <div className="flex gap-2 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
