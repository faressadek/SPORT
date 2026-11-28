'use client';

import * as RadixTabs from '@radix-ui/react-tabs';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../lib/cn';

export const Tabs = RadixTabs.Root;

export interface TabsListProps extends ComponentPropsWithoutRef<typeof RadixTabs.List> {
  /** Stick under the top bar while the page scrolls (operator profile tabs). */
  sticky?: boolean;
}

export function TabsList({ className, sticky, ...props }: TabsListProps) {
  return (
    <RadixTabs.List
      className={cn(
        'scrollbar-none flex gap-1 overflow-x-auto border-b border-line bg-bg',
        sticky && 'sticky top-(--sticky-offset,0px) z-10',
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        'relative min-h-11 shrink-0 px-4 text-base font-semibold text-ink-muted',
        'transition-colors duration-(--duration-press) hover:text-ink',
        'after:absolute after:inset-x-2 after:-bottom-px after:h-[3px] after:rounded-full after:bg-transparent',
        'data-[state=active]:text-ink data-[state=active]:after:bg-pitch dark:data-[state=active]:after:bg-action',
        'focus-visible:outline-offset-[-2px]',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadixTabs.Content>) {
  return (
    <RadixTabs.Content className={cn('pt-5 focus-visible:outline-none', className)} {...props} />
  );
}
