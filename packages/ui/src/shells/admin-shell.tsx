'use client';

import { Menu } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { PlainLink, type LinkComponent } from '../lib/link';
import { Avatar } from '../components/avatar';
import { Sheet, SheetContent, SheetTrigger } from '../components/dialog';
import { isActive, type NavItem } from './nav';
import { Wordmark } from './wordmark';

export interface AdminNavSection {
  /** Department name: Operations, Moderation, Finance, Support, Team. */
  label: string;
  items: NavItem[];
}

export interface AdminShellProps {
  children: ReactNode;
  currentPath: string;
  /** Only the sections this staff member's role allows (SPEC R19). */
  sections: AdminNavSection[];
  staff: { name: string; role: string; avatarUrl?: string | null };
  title?: ReactNode;
  actions?: ReactNode;
  /** e.g. a "Staging" badge so nobody approves real operators in the wrong place. */
  environment?: string;
  linkAs?: LinkComponent;
}

function AdminNav({
  sections,
  currentPath,
  Link,
  onNavigate,
}: {
  sections: AdminNavSection[];
  currentPath: string;
  Link: LinkComponent;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Departments" className="flex flex-col gap-5">
      {sections.map((sec) => (
        <div key={sec.label}>
          <p className="px-3 pb-1 text-sm font-semibold text-ink-muted">{sec.label}</p>
          <ul className="flex flex-col gap-0.5">
            {sec.items.map((item) => {
              const active = isActive(currentPath, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-ink hover:bg-sunken',
                      active && 'bg-pitch text-on-pitch hover:bg-pitch',
                    )}
                  >
                    {item.icon}
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span
                        className={cn(
                          'scoreboard min-w-6 rounded-full px-1.5 text-center text-xs font-bold',
                          active ? 'bg-action text-on-action' : 'bg-warning-soft text-warning',
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
        </div>
      ))}
    </nav>
  );
}

/**
 * SPORT Admin: a calmer, denser layout than the athlete app. Neutral
 * surfaces, pitch green only for the current page, so staff data stays the focus.
 */
export function AdminShell({
  children,
  currentPath,
  sections,
  staff,
  title,
  actions,
  environment,
  linkAs: Link = PlainLink,
}: AdminShellProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-dvh bg-bg lg:grid lg:grid-cols-[15rem_1fr]">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-action px-4 py-2 font-semibold text-on-action focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh flex-col border-e border-line bg-surface lg:flex">
        <div className="flex items-center gap-2 px-5 pt-5 pb-5 text-pitch dark:text-on-pitch">
          <Wordmark suffix="Admin" />
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          <AdminNav sections={sections} currentPath={currentPath} Link={Link} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface px-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              aria-label="Open menu"
              className="-ms-2 flex size-11 items-center justify-center rounded-md hover:bg-sunken lg:hidden"
            >
              <Menu className="size-5" aria-hidden />
            </SheetTrigger>
            <SheetContent title="SPORT Admin" side="end">
              <AdminNav
                sections={sections}
                currentPath={currentPath}
                Link={Link}
                onNavigate={() => setOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <span className="text-pitch lg:hidden dark:text-on-pitch">
            <Wordmark suffix="Admin" />
          </span>
          {environment ? (
            <span className="rounded-sm bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">
              {environment}
            </span>
          ) : null}
          <div className="ms-auto flex items-center gap-2">
            <div className="hidden text-end sm:block">
              <p className="text-sm font-semibold leading-tight">{staff.name}</p>
              <p className="text-xs text-ink-muted">{staff.role}</p>
            </div>
            <Avatar name={staff.name} src={staff.avatarUrl} size="sm" />
          </div>
        </header>
        <main id="main" className="w-full flex-1 px-4 py-5 sm:px-6 lg:py-6">
          {title || actions ? (
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              {title ? (
                <h1 className="font-display text-3xl font-black leading-none text-ink">{title}</h1>
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
