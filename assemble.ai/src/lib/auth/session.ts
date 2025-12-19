/**
 * Session Management Utilities
 * Handles session token generation, hashing, and cookie management.
 */

import { randomBytes, createHash } from 'crypto';
import { cookies } from 'next/headers';

export const SESSION_COOKIE_NAME = 'session';
export const SESSION_DURATION_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Generate a cryptographically secure session token
 * @returns Base64URL encoded 32-byte random token
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Hash a session token for secure storage
 * @param token - Plain session token
 * @returns SHA-256 hash of the token
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Set the session cookie
 * @param token - Plain session token to store in cookie
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();

  // In Docker/proxy environments, the app receives HTTP even when users access via HTTPS
  // Use SECURE_COOKIES env var to control, defaulting to false for compatibility
  const useSecureCookies = process.env.SECURE_COOKIES === 'true';

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: useSecureCookies,
    sameSite: 'lax', // 'lax' is more compatible with proxies and redirects than 'strict'
    maxAge: SESSION_DURATION_SECONDS,
    path: '/',
  });
}

/**
 * Clear the session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Get the session token from cookie
 * @returns Session token or null if not present
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/**
 * Calculate session expiry timestamp
 * @returns Unix timestamp when session expires
 */
export function getSessionExpiry(): number {
  return Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
}

/**
 * Check if a session has expired
 * @param expiresAt - Unix timestamp of expiry
 * @returns true if session has expired
 */
export function isSessionExpired(expiresAt: number): boolean {
  return Math.floor(Date.now() / 1000) > expiresAt;
}
