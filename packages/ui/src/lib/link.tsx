import type { AnchorHTMLAttributes, ComponentType, ReactNode } from 'react';

/**
 * Components that render links accept `linkAs`, so apps can pass Next.js
 * `Link` while the package itself stays framework-free.
 */
export type LinkComponent = ComponentType<
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: ReactNode }
>;

export const PlainLink: LinkComponent = (props) => <a {...props} />;
