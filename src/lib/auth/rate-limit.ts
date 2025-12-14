/**
 * Rate Limiting Utilities
 * In-memory rate limiter for login attempts with database backup.
 */

import { db } from '@/lib/db';
import { loginAttempts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface LoginAttempt {
  attempts: number;
  lockedUntil: number | null;
}

// In-memory cache for fast lookups
const attemptCache = new Map<string, LoginAttempt>();

/**
 * Check if an email is rate limited
 * @param email - Email to check
 * @returns Object with allowed flag and retryAfter seconds if locked
 */
export async function checkRateLimit(email: string): Promise<{
  allowed: boolean;
  retryAfter?: number;
}> {
  const normalizedEmail = email.toLowerCase();

  // Check in-memory cache first
  let attempt = attemptCache.get(normalizedEmail);

  // If not in cache, load from database
  if (!attempt) {
    const [dbAttempt] = await db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.email, normalizedEmail))
      .limit(1);

    if (dbAttempt) {
      attempt = {
        attempts: dbAttempt.attempts,
        lockedUntil: dbAttempt.lockedUntil,
      };
      attemptCache.set(normalizedEmail, attempt);
    }
  }

  if (!attempt) {
    return { allowed: true };
  }

  // Check if currently locked
  if (attempt.lockedUntil && Date.now() < attempt.lockedUntil) {
    const retryAfter = Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
    return { allowed: false, retryAfter };
  }

  // If lockout has expired, reset attempts
  if (attempt.lockedUntil && Date.now() >= attempt.lockedUntil) {
    await clearAttempts(normalizedEmail);
    return { allowed: true };
  }

  return { allowed: true };
}

/**
 * Record a failed login attempt
 * @param email - Email that failed login
 */
export async function recordFailedAttempt(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase();
  const now = Math.floor(Date.now() / 1000);

  let attempt = attemptCache.get(normalizedEmail);

  if (!attempt) {
    // Check database
    const [dbAttempt] = await db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.email, normalizedEmail))
      .limit(1);

    if (dbAttempt) {
      attempt = {
        attempts: dbAttempt.attempts,
        lockedUntil: dbAttempt.lockedUntil,
      };
    } else {
      attempt = { attempts: 0, lockedUntil: null };
    }
  }

  attempt.attempts += 1;

  // Lock if max attempts reached
  if (attempt.attempts >= MAX_ATTEMPTS) {
    attempt.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }

  // Update cache
  attemptCache.set(normalizedEmail, attempt);

  // Persist to database
  const [existing] = await db
    .select()
    .from(loginAttempts)
    .where(eq(loginAttempts.email, normalizedEmail))
    .limit(1);

  if (existing) {
    await db
      .update(loginAttempts)
      .set({
        attempts: attempt.attempts,
        lockedUntil: attempt.lockedUntil,
        updatedAt: now,
      })
      .where(eq(loginAttempts.email, normalizedEmail));
  } else {
    await db.insert(loginAttempts).values({
      id: randomUUID(),
      email: normalizedEmail,
      attempts: attempt.attempts,
      lockedUntil: attempt.lockedUntil,
      updatedAt: now,
    });
  }
}

/**
 * Clear login attempts for an email (on successful login)
 * @param email - Email to clear attempts for
 */
export async function clearAttempts(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase();

  // Clear from cache
  attemptCache.delete(normalizedEmail);

  // Clear from database
  await db
    .delete(loginAttempts)
    .where(eq(loginAttempts.email, normalizedEmail));
}

/**
 * Get remaining lockout time in seconds
 * @param email - Email to check
 * @returns Seconds remaining or 0 if not locked
 */
export async function getLockoutRemaining(email: string): Promise<number> {
  const result = await checkRateLimit(email);
  return result.retryAfter ?? 0;
}
