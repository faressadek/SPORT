import { cn } from '../lib/cn';

/** SPORT in scoreboard type. Stays Latin in Arabic: it is the brand name. */
export function Wordmark({ className, suffix }: { className?: string; suffix?: string }) {
  return (
    <span className={cn('inline-flex items-baseline gap-2', className)} dir="ltr">
      <span
        className="text-2xl font-black leading-none tracking-tight"
        style={{
          fontFamily: "var(--font-scoreboard), 'Big Shoulders', 'Arial Narrow', sans-serif",
        }}
      >
        SPORT
      </span>
      {suffix ? <span className="text-sm font-semibold opacity-80">{suffix}</span> : null}
    </span>
  );
}
