import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { PlainLink, type LinkComponent } from '../lib/link';
import { Avatar } from '../components/avatar';
import { isActive, type NavItem } from './nav';
import { Wordmark } from './wordmark';

export interface OperatorShellProps {
  children: ReactNode;
  currentPath: string;
  business: { name: string; kindLabel: string; logoUrl?: string | null };
  nav: NavItem[];
  /** Page title shown above the content. */
  title?: ReactNode;
  /** Buttons at the end of the title row ("Add walk-in"). */
  actions?: ReactNode;
  /** Status line under the business name, e.g. a "Live" pill. */
  status?: ReactNode;
  linkAs?: LinkComponent;
}

/** Operator workspace: pitch-green sidebar on desktop, scrollable tabs on phones. */
export function OperatorShell({
  children,
  currentPath,
  business,
  nav,
  title,
  actions,
  status,
  linkAs: Link = PlainLink,
}: OperatorShellProps) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-action px-4 py-2 font-semibold text-on-action focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col bg-pitch text-on-pitch lg:flex">
        <div className="px-5 pt-5 pb-4">
          <Link href="/dashboard" className="inline-flex min-h-11 items-center rounded-sm">
            <Wordmark suffix="for business" />
          </Link>
        </div>
        <div className="mx-3 flex items-center gap-3 rounded-md bg-pitch-raised/60 p-3">
          <Avatar
            name={business.name}
            src={business.logoUrl}
            size="md"
            shape="square"
            className="bg-pitch-raised"
          />
          <div className="min-w-0">
            <p className="truncate font-semibold">{business.name}</p>
            <p className="text-sm text-on-pitch-muted">{business.kindLabel}</p>
            {status ? <div className="mt-1">{status}</div> : null}
          </div>
        </div>
        <nav aria-label="Workspace" className="mt-4 flex-1 overflow-y-auto px-3">
          <ul className="flex flex-col gap-0.5">
            {nav.map((item) => {
              const active = isActive(currentPath, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-11 items-center gap-3 rounded-md px-3 font-semibold text-on-pitch-muted hover:bg-pitch-raised hover:text-on-pitch',
                      active &&
                        'bg-action text-on-action hover:bg-action-hover hover:text-on-action',
                    )}
                  >
                    {item.icon}
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span
                        className={cn(
                          'scoreboard min-w-6 rounded-full px-1.5 text-center text-sm font-bold',
                          active ? 'bg-pitch text-on-pitch' : 'bg-action text-on-action',
                        )}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Phone/tablet header + tabs */}
        <header className="sticky top-0 z-30 bg-pitch text-on-pitch lg:hidden">
          <div className="flex h-14 items-center gap-3 px-4">
            <Avatar
              name={business.name}
              src={business.logoUrl}
              size="sm"
              shape="square"
              className="bg-pitch-raised"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold leading-tight">{business.name}</p>
              <p className="text-xs text-on-pitch-muted">{business.kindLabel}</p>
            </div>
            {status}
          </div>
          <nav aria-label="Workspace" className="scrollbar-none overflow-x-auto">
            <ul className="flex gap-1 px-2">
              {nav.map((item) => {
                const active = isActive(currentPath, item.href);
                return (
                  <li key={item.href} className="shrink-0">
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'relative flex min-h-11 items-center gap-1.5 px-3 text-sm font-semibold text-on-pitch-muted',
                        active &&
                          'text-on-pitch after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-t-full after:bg-action',
                      )}
                    >
                      {item.label}
                      {item.badge ? (
                        <span className="scoreboard rounded-full bg-action px-1.5 text-xs font-bold text-on-action">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 lg:py-8">
          {title || actions ? (
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              {title ? (
                <h1 className="font-display text-3xl font-black leading-none text-ink sm:text-4xl">
                  {title}
                </h1>
              ) : null}
              {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
