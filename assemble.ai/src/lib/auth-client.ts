/**
 * Better Auth Client
 *
 * Client-side authentication utilities for React components.
 * This module provides hooks and functions for managing auth state in the browser.
 */

import { createAuthClient } from "better-auth/react";
import { polarClient } from "@polar-sh/better-auth/client";

// Check if Polar is configured (client-side check)
const isPolarConfigured = typeof window !== 'undefined'
    ? true // Always include on client - server controls actual functionality
    : false;

// Create the auth client with optional Polar plugin
export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    plugins: [polarClient()], // Plugin is safe to include - server controls behavior
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
