import { CalendarCheck, Home, Search, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { PlainLink, type LinkComponent } from '../lib/link';
import { Avatar } from '../components/avatar';
import { PitchLines } from '../components/pitch-lines';
import { isActive, type NavItem } from './nav';
import { Wordmark } from './wordmark';

export interface AthleteShellProps {
  children: ReactNode;
  currentPath: string;
  /** Null for guests: browsing never needs an account (SPEC R1). */
  user?: { name: string; avatarUrl?: string | null } | null;
  linkAs?: LinkComponent;
  /** Language switch or similar, shown in the top bar. */
  topBarExtra?: ReactNode;
  /** Override the default links. */
  sections?: NavItem[];
  bottomNav?: NavItem[];
}

export const ATHLETE_SECTIONS: NavItem[] = [
  { href: '/courts', label: 'Courts' },
  { href: '/coaches', label: 'Coaches' },
  { href: '/gyms', label: 'Gyms' },
  { href: '/academies', label: 'Academies' },
];

export const ATHLETE_BOTTOM_NAV: NavItem[] = [
  { href: '/', label: 'Home', icon: <Home className="size-6" aria-hidden /> },
  { href: '/search', label: 'Search', icon: <Search className="size-6" aria-hidden /> },
  {
    href: '/bookings',
    label: 'My Bookings',
    icon: <CalendarCheck className="size-6" aria-hidden />,
  },
  { href: '/account', label: 'Account', icon: <UserRound className="size-6" aria-hidden /> },
];

/** Athlete layout: top bar, content, operator footer, and bottom tabs on phones. */
export function AthleteShell({
  children,
  currentPath,
  user,
  linkAs: Link = PlainLink,
  topBarExtra,
  sections = ATHLETE_SECTIONS,
  bottomNav = ATHLETE_BOTTOM_NAV,
}: AthleteShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-action px-4 py-2 font-semibold text-on-action focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 bg-pitch text-on-pitch">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:h-16">
          <Link href="/" aria-label="SPORT home" className="flex min-h-11 items-center rounded-sm">
            <Wordmark />
          </Link>
          <nav aria-label="Sections" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {sections.map((s) => {
                const active = isActive(currentPath, s.href);
                return (
                  <li key={s.href}>
                    <Link
                      href={s.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex min-h-11 items-center rounded-sm px-3 font-semibold text-on-pitch-muted hover:text-on-pitch',
                        active &&
                          'text-on-pitch underline decoration-action decoration-3 underline-offset-[10px]',
                      )}
                    >
                      {s.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="ms-auto flex items-center gap-1">
            {topBarExtra}
            <Link
              href="/search"
              aria-label="Search"
              className="hidden size-11 items-center justify-center rounded-md hover:bg-pitch-raised sm:flex"
            >
              <Search className="size-5" aria-hidden />
            </Link>
            <Link
              href="/bookings"
              className="hidden min-h-11 items-center rounded-md px-3 font-semibold hover:bg-pitch-raised md:flex"
            >
              My Bookings
            </Link>
            {user ? (
              <Link
                href="/account"
                aria-label="Account"
                className="flex size-11 items-center justify-center rounded-full"
              >
                <Avatar
                  name={user.name}
                  src={user.avatarUrl}
                  size="sm"
                  className="bg-pitch-raised ring-2 ring-chalk-line"
                />
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="hidden min-h-11 items-center rounded-md border border-chalk-line px-3 font-semibold hover:bg-pitch-raised sm:flex"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-0">
        {children}
      </main>

      <footer className="relative isolate overflow-hidden bg-pitch pb-[calc(4.5rem+env(safe-area-inset-bottom))] text-on-pitch sm:pb-0">
        <PitchLines />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-md">
            <p className="font-display text-3xl font-black leading-none">
              Are you a coach, venue, gym or academy?
            </p>
            <p className="mt-2 text-on-pitch-muted">
              Take bookings and enquiries from athletes in Alexandria.
            </p>
            <Link
              href="/for-business"
              className="mt-4 inline-flex min-h-11 items-center rounded-md bg-action px-4 font-semibold text-on-action hover:bg-action-hover"
            >
              List your business on SPORT
            </Link>
          </div>
          <div className="flex flex-col gap-3 text-sm text-on-pitch-muted sm:items-end">
            <Wordmark className="text-on-pitch" />
            <ul className="flex flex-wrap gap-x-4">
              <li>
                <Link
                  href="/help"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center px-1 hover:text-on-pitch"
                >
                  Help
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center px-1 hover:text-on-pitch"
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center px-1 hover:text-on-pitch"
                >
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <ul className="grid grid-cols-4">
          {bottomNav.map((item) => {
            const active = isActive(currentPath, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold',
                    active ? 'text-ink' : 'text-ink-muted',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-14 items-center justify-center rounded-full',
                      active && 'bg-action text-on-action',
                    )}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
