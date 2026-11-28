import { Check } from 'lucide-react';
import { cn } from '../lib/cn';

export interface Step {
  id: string;
  label: string;
  /** Mark steps that still need something (profile builder checklist). */
  status?: 'complete' | 'incomplete' | 'error';
}

export interface StepperProps {
  steps: Step[];
  /** Index of the step on screen. */
  current: number;
  /** Let people jump back to an earlier step. */
  onStepClick?: (index: number) => void;
  className?: string;
}

/**
 * Progress through a real sequence (application form, profile builder).
 * Phones get "Step 2 of 5" and a bar; wider screens get every step.
 */
export function Stepper({ steps, current, onStepClick, className }: StepperProps) {
  const at = steps[current];
  return (
    <nav aria-label="Progress" className={className}>
      <div className="sm:hidden">
        <p className="text-sm text-ink-muted">
          Step {current + 1} of {steps.length}
        </p>
        <p className="font-display text-xl font-extrabold text-ink">{at?.label}</p>
        <div className="mt-2 flex gap-1" aria-hidden>
          {steps.map((s, i) => (
            <span
              key={s.id}
              className={cn(
                'h-1.5 flex-1 rounded-full',
                i < current || s.status === 'complete'
                  ? 'bg-pitch dark:bg-action'
                  : i === current
                    ? 'bg-action'
                    : 'bg-line',
                s.status === 'error' && 'bg-danger',
              )}
            />
          ))}
        </div>
      </div>
      <ol className="hidden items-center gap-2 sm:flex">
        {steps.map((s, i) => {
          const done = s.status === 'complete' || (s.status === undefined && i < current);
          const active = i === current;
          const clickable = onStepClick && i !== current && (done || i < current);
          const inner = (
            <>
              <span
                className={cn(
                  'scoreboard flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-base font-extrabold',
                  active && 'border-pitch bg-action text-on-action dark:border-action',
                  done &&
                    !active &&
                    'border-pitch bg-pitch text-on-pitch dark:border-action dark:bg-action dark:text-on-action',
                  !done && !active && 'border-line-strong text-ink-muted',
                  s.status === 'error' && !active && 'border-danger bg-danger-soft text-danger',
                )}
                aria-hidden
              >
                {done && !active ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn('text-sm font-semibold', active ? 'text-ink' : 'text-ink-muted')}>
                {s.label}
                {s.status === 'error' ? <span className="sr-only"> (needs attention)</span> : null}
                {done && !active ? <span className="sr-only"> (done)</span> : null}
              </span>
            </>
          );
          return (
            <li
              key={s.id}
              className="flex min-w-0 flex-1 items-center gap-2"
              aria-current={active ? 'step' : undefined}
            >
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onStepClick(i)}
                  className="flex min-h-11 items-center gap-2 rounded-md pe-2 hover:bg-sunken"
                >
                  {inner}
                </button>
              ) : (
                <span className="flex min-h-11 items-center gap-2">{inner}</span>
              )}
              {i < steps.length - 1 ? (
                <span className="h-0.5 min-w-4 flex-1 rounded-full bg-line" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
