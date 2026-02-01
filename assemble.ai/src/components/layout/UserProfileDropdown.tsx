'use client';

import { useRouter } from 'next/navigation';
import { CreditCard, ExternalLink, LogOut, Moon, Settings, Sun } from 'lucide-react';
import { useSession, signOut } from '@/lib/auth-client';
import { useTheme } from '@/lib/hooks/use-theme';
import { UserAvatar } from './UserAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * UserProfileDropdown - User account menu for authenticated users
 *
 * Following SaaS UX patterns from Linear, Notion, Figma:
 * - Avatar trigger in top-right
 * - User identity section at top
 * - Navigation to account-related pages
 * - Sign out always at bottom, visually distinct
 */
export function UserProfileDropdown() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { theme, toggleTheme, isLoaded: isThemeLoaded } = useTheme();

  const isPrecisionDark = theme === 'precision';

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/login');
        },
      },
    });
  };

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  // Loading state - show skeleton avatar
  if (isPending) {
    return (
      <div className="w-9 h-9 rounded-full bg-[var(--color-bg-tertiary)] animate-pulse" />
    );
  }

  // Not authenticated - shouldn't happen in dashboard but handle gracefully
  if (!session?.user) {
    return null;
  }

  const { user } = session;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'rounded-full outline-none',
            'ring-offset-[var(--color-bg-secondary)]',
            'focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)] focus-visible:ring-offset-2',
            'transition-transform hover:scale-105 active:scale-95'
          )}
          aria-label="Open user menu"
        >
          <UserAvatar name={user.name} email={user.email} size="md" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/* User Identity Section */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3 py-1">
            <UserAvatar name={user.name} email={user.email} size="md" />
            <div className="flex flex-col space-y-0.5 leading-none">
              {user.name && (
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {user.name}
                </p>
              )}
              <p className="text-xs text-[var(--color-text-muted)] truncate max-w-[160px]">
                {user.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Navigation Items */}
        <DropdownMenuItem onClick={() => handleNavigation('/')}>
          <ExternalLink className="mr-2 h-4 w-4" />
          <span>Visit Website</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleNavigation('/billing')}>
          <CreditCard className="mr-2 h-4 w-4" />
          <span>Billing</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleNavigation('/settings')} disabled>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
          <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">Soon</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={toggleTheme} disabled={!isThemeLoaded}>
          {isPrecisionDark ? (
            <Sun className="mr-2 h-4 w-4" />
          ) : (
            <Moon className="mr-2 h-4 w-4" />
          )}
          <span>{isPrecisionDark ? 'Light Mode' : 'Dark Mode'}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Sign Out - Always at bottom, distinct styling */}
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
