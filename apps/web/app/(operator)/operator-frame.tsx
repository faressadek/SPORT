'use client';

import { CalendarDays, ClipboardList, LayoutDashboard, PenLine, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { OperatorShell, StatusPill, type NavItem } from '@sport/ui';
import { NextLink } from '../next-link';

// Court owner navigation as the first example. CC8 builds the nav for each operator type.
const COURT_OWNER_NAV: NavItem[] = [
  {
    href: '/dashboard',
    label: "Today's courts",
    icon: <LayoutDashboard className="size-5" aria-hidden />,
  },
  {
    href: '/dashboard/calendar',
    label: 'Calendar',
    icon: <CalendarDays className="size-5" aria-hidden />,
  },
  {
    href: '/dashboard/bookings',
    label: 'Bookings',
    icon: <ClipboardList className="size-5" aria-hidden />,
    badge: 3,
  },
  {
    href: '/setup',
    label: 'Edit profile and packages',
    icon: <PenLine className="size-5" aria-hidden />,
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: <Settings className="size-5" aria-hidden />,
  },
];

export function OperatorFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <OperatorShell
      currentPath={pathname}
      business={{ name: 'Smouha Sports Club', kindLabel: 'Court owner' }}
      status={<StatusPill status="live" />}
      nav={COURT_OWNER_NAV}
      linkAs={NextLink}
    >
      {children}
    </OperatorShell>
  );
}
