import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold select-none',
    'transition-[background-color,border-color,color,transform] duration-(--duration-press) ease-(--ease-out)',
    'active:translate-y-px disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
  ],
  {
    variants: {
      variant: {
        /** The one action that moves the athlete forward. Lime is reserved for this. */
        primary:
          'bg-action text-on-action hover:bg-action-hover active:bg-action-press shadow-[inset_0_-2px_0_rgb(14_28_21/0.18)]',
        /** Solid pitch green: strong but not the main action. */
        secondary: 'bg-pitch text-on-pitch hover:bg-pitch-raised',
        outline: 'border border-line-strong bg-surface text-ink hover:bg-sunken',
        ghost: 'text-ink hover:bg-sunken',
        danger: 'bg-danger text-surface hover:opacity-90',
        link: 'text-link underline underline-offset-4 decoration-1 hover:decoration-2 px-0!',
      },
      size: {
        sm: 'min-h-11 px-3 text-sm rounded-sm',
        md: 'min-h-11 px-4 text-base rounded-md',
        lg: 'min-h-13 px-6 text-lg rounded-md',
        icon: 'size-11 rounded-md',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
  /** Icon placed before the label (start side, so it flips in RTL). */
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, loading, icon, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});
