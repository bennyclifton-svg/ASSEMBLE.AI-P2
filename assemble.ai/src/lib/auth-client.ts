/**
 * Better Auth Client
 *
 * Client-side authentication utilities for React components.
 * This module provides hooks and functions for managing auth state in the browser.
 */

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { polarClient } from "@polar-sh/better-auth/client";
import type { auth } from "./better-auth";

const authBaseURL =
    process.env.NEXT_PUBLIC_AUTH_BASE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : undefined);

// Create the auth client with optional Polar plugin
export const authClient = createAuthClient({
    ...(authBaseURL ? { baseURL: authBaseURL } : {}),
    plugins: [
        // Mirror server-side additionalFields onto the client session type so
        // consumers like UserProfileDropdown can read them without a cast.
        inferAdditionalFields<typeof auth>(),
        polarClient(),
    ],
});

// Export commonly used hooks and functions
export const {
    signIn,
    signUp,
    signOut,
    useSession,
    getSession,
} = authClient;

// Polar-specific exports (may not be available if Polar not configured on server)
export const { customer, checkout } = authClient;

// Type exports for TypeScript support
export type AuthClientSession = typeof authClient.$Infer.Session;

/**
 * Returns true when the current session belongs to a super admin.
 *
 * `isSuperAdmin` is wired via better-auth `additionalFields` in
 * `src/lib/better-auth.ts`. We narrow at the read site here to avoid
 * scattering ad-hoc casts across components that gate admin-only UI.
 */
export function useIsSuperAdmin(): boolean {
    const { data } = useSession();
    return (
        (data?.user as { isSuperAdmin?: boolean } | undefined)?.isSuperAdmin ===
        true
    );
}
