'use client';

import { cn } from '@/lib/utils';

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * UserAvatar - Displays user initials in a colored circle
 *
 * Design principles:
 * - Shows 1-2 character initials from name or email
 * - Consistent color based on user identifier (deterministic)
 * - Accessible with proper aria labels
 */
export function UserAvatar({ name, email, size = 'md', className }: UserAvatarProps) {
  // Generate initials from name or email
  const getInitials = (): string => {
    if (name) {
      const parts = name.trim().split(' ').filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return '?';
  };

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  };

  const initials = getInitials();

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full',
        'font-medium',
        'select-none',
        sizeClasses[size],
        className
      )}
      style={{
        clipPath: 'polygon(30% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 30%)',
        backgroundColor: '#f6fbfb',
        color: 'var(--sw-ink)',
      }}
      aria-label={name || email || 'User avatar'}
      role="img"
    >
      {initials}
    </div>
  );
}
