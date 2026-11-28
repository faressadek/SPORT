import type { ReactNode } from 'react';

export interface NavItem {
  href: string;
  label: string;
  icon?: ReactNode;
  /** Small count, e.g. new enquiries. */
  badge?: number;
}

/** `/` matches only itself; other items also match their sub-pages. */
export function isActive(currentPath: string, href: string): boolean {
  if (href === '/') return currentPath === '/';
  return currentPath === href || currentPath.startsWith(href.endsWith('/') ? href : `${href}/`);
}
