'use client';

import { usePathname } from 'next/navigation';
import { AthleteShell } from '@sport/ui';
import { NextLink } from '../next-link';

export function AthleteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Signed-in state arrives with CX2 (auth). Until then everyone browses as a guest.
  return (
    <AthleteShell currentPath={pathname} user={null} linkAs={NextLink}>
      {children}
    </AthleteShell>
  );
}
