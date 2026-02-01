/**
 * Password Utilities
 * Password hashing and validation using bcryptjs.
 * Compatible with Better Auth's password storage in the account table.
 */

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Hash a password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Validate password strength.
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
    if (!password) {
        return { isValid: false, error: 'Password is required' };
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
        return { isValid: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
    }

    return { isValid: true };
}
