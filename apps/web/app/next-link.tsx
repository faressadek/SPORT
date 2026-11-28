'use client';

import Link from 'next/link';
import type { LinkComponent } from '@sport/ui';

/** Next.js Link in the shape `@sport/ui` expects for `linkAs`. */
export const NextLink: LinkComponent = ({ href, ...props }) => <Link href={href} {...props} />;
