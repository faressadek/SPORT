'use client';

import * as RadixToast from '@radix-ui/react-toast';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Optional single action, e.g. "Undo" or "View booking". */
  action?: { label: string; onClick: () => void };
  durationMs?: number;
}

interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

const icons = {
  success: <CheckCircle2 className="size-5 text-success" aria-hidden />,
  error: <AlertTriangle className="size-5 text-danger" aria-hidden />,
  info: <Info className="size-5 text-info" aria-hidden />,
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((t: ToastInput) => {
    setItems((list) => [...list.slice(-2), { ...t, id: nextId++ }]);
  }, []);
  const remove = (id: number) => setItems((list) => list.filter((i) => i.id !== id));
  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider swipeDirection="down" duration={5000}>
        {children}
        {items.map((t) => (
          <RadixToast.Root
            key={t.id}
            duration={t.durationMs}
            type={t.tone === 'error' ? 'foreground' : 'background'}
            onOpenChange={(open) => !open && remove(t.id)}
            className={cn(
              'flex items-start gap-3 rounded-lg border border-line bg-surface p-4 shadow-overlay',
              'data-[state=open]:animate-pop-in data-[swipe=move]:translate-y-(--radix-toast-swipe-move-y)',
              t.tone === 'error' && 'border-danger/50',
            )}
          >
            {icons[t.tone ?? 'success']}
            <div className="flex-1">
              <RadixToast.Title className="font-semibold text-ink">{t.title}</RadixToast.Title>
              {t.description ? (
                <RadixToast.Description className="mt-0.5 text-sm text-ink-muted">
                  {t.description}
                </RadixToast.Description>
              ) : null}
            </div>
            {t.action ? (
              <RadixToast.Action
                altText={t.action.label}
                onClick={t.action.onClick}
                className="min-h-11 rounded-sm px-2 text-sm font-semibold text-link underline underline-offset-4"
              >
                {t.action.label}
              </RadixToast.Action>
            ) : null}
            <RadixToast.Close
              aria-label="Dismiss"
              className="-me-2 -mt-2 inline-flex size-11 items-center justify-center rounded-md text-ink-muted hover:bg-sunken"
            >
              <X className="size-4" aria-hidden />
            </RadixToast.Close>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex w-full max-w-md flex-col gap-2 px-4 outline-none sm:bottom-6 sm:end-6 sm:mx-0 sm:start-auto" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

/** `const toast = useToast(); toast({ title: 'Booking confirmed' })` */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
