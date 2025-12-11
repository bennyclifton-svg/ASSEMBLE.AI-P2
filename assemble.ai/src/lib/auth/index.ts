/**
 * Authentication Module
 * Re-exports all auth utilities for convenient imports.
 */

export { hashPassword, verifyPassword, validatePassword } from './password';
export {
  generateSessionToken,
  hashToken,
  setSessionCookie,
  clearSessionCookie,
  getSessionToken,
  getSessionExpiry,
  isSessionExpired,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from './session';
export {
  checkRateLimit,
  recordFailedAttempt,
  clearAttempts,
  getLockoutRemaining,
} from './rate-limit';
