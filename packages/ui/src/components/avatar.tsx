'use client';

import { useState } from 'react';
import { cn } from '../lib/cn';

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Logos (gyms, academies) are rounded squares; people are circles. */
  shape?: 'circle' | 'square';
  className?: string;
}

const sizes = {
  sm: 'size-8 text-xs',
  md: 'size-11 text-sm',
  lg: 'size-16 text-lg',
  xl: 'size-24 text-2xl',
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

export function Avatar({ name, src, size = 'md', shape = 'circle', className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-pitch font-display font-extrabold text-on-pitch',
        shape === 'circle' ? 'rounded-full' : 'rounded-md',
        sizes[size],
        className,
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span role="img" aria-label={name}>
          {initials(name)}
        </span>
      )}
    </span>
  );
}
