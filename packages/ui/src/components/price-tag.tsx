import { cn } from '../lib/cn';
import { formatMoney, type Locale } from '../lib/format';

export interface PriceTagProps {
  /** Integer minor units (piastres for EGP). */
  amount: number;
  currency?: string;
  /** "from" for starting prices on cards. */
  prefix?: string;
  /** "/ hour", "/ month", "/ 8 sessions". */
  unit?: string;
  /** Show a struck-through earlier price. */
  was?: number;
  size?: 'sm' | 'md' | 'lg';
  locale?: Locale;
  className?: string;
}

const sizes = { sm: 'text-lg', md: 'text-xl', lg: 'text-3xl' };

/** Prices read like a scoreboard: condensed, tabular numerals. */
export function PriceTag({
  amount,
  currency = 'EGP',
  prefix,
  unit,
  was,
  size = 'md',
  locale = 'en',
  className,
}: PriceTagProps) {
  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-1.5', className)}>
      {prefix ? <span className="text-sm text-ink-muted">{prefix}</span> : null}
      <span className={cn('scoreboard font-extrabold leading-none text-ink', sizes[size])}>
        {formatMoney(amount, currency, locale)}
      </span>
      {unit ? <span className="text-sm text-ink-muted">{unit}</span> : null}
      {was !== undefined && was > amount ? (
        <s className="text-sm text-ink-muted">
          <span className="sr-only">was </span>
          {formatMoney(was, currency, locale)}
        </s>
      ) : null}
    </span>
  );
}
