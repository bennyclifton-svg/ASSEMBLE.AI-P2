'use client';

/**
 * RegisterForm Component
 * Registration form using Better Auth.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp } from '@/lib/auth-client';

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client-side validation
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    if (password.length < 8) {
      setFieldErrors({ password: 'Password must be at least 8 characters' });
      return;
    }

    if (!displayName || displayName.length < 1 || displayName.length > 100) {
      setFieldErrors({ displayName: 'Display name must be 1-100 characters' });
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp.email({
        email,
        password,
        name: displayName,
      });

      if (result.error) {
        // Handle Better Auth error responses
        const errorCode = result.error.code;
        const errorMessage = result.error.message || 'Registration failed';

        if (errorCode === 'USER_ALREADY_EXISTS' || errorCode === 'EMAIL_ALREADY_EXISTS') {
          setFieldErrors({ email: 'Email already registered' });
        } else if (errorCode === 'INVALID_EMAIL') {
          setFieldErrors({ email: 'Invalid email format' });
        } else if (errorCode === 'PASSWORD_TOO_SHORT') {
          setFieldErrors({ password: 'Password is too short' });
        } else if (errorCode === 'WEAK_PASSWORD') {
          setFieldErrors({ password: 'Password is too weak' });
        } else {
          setError(errorMessage);
        }
        return;
      }

      // Successful registration - redirect to dashboard
      router.push('/dashboard');
      router.refresh();

    } catch (err) {
      console.error('Registration error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm bg-red-500/10 border border-red-500/20 rounded text-red-400">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="displayName" className="block text-sm text-[#cccccc] mb-1">
          Display Name
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className={`w-full px-3 py-2 bg-[#3c3c3c] border rounded text-[#cccccc] focus:outline-none focus:border-[#007acc] ${
            fieldErrors.displayName ? 'border-red-500' : 'border-[#3e3e42]'
          }`}
          placeholder="Your name"
          required
          disabled={isLoading}
          maxLength={100}
        />
        {fieldErrors.displayName && (
          <p className="mt-1 text-xs text-red-400">{fieldErrors.displayName}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm text-[#cccccc] mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`w-full px-3 py-2 bg-[#3c3c3c] border rounded text-[#cccccc] focus:outline-none focus:border-[#007acc] ${
            fieldErrors.email ? 'border-red-500' : 'border-[#3e3e42]'
          }`}
          placeholder="you@example.com"
          required
          disabled={isLoading}
        />
        {fieldErrors.email && (
          <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm text-[#cccccc] mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`w-full px-3 py-2 bg-[#3c3c3c] border rounded text-[#cccccc] focus:outline-none focus:border-[#007acc] ${
            fieldErrors.password ? 'border-red-500' : 'border-[#3e3e42]'
          }`}
          placeholder="Minimum 8 characters"
          required
          disabled={isLoading}
          minLength={8}
        />
        {fieldErrors.password && (
          <p className="mt-1 text-xs text-red-400">{fieldErrors.password}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm text-[#cccccc] mb-1">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={`w-full px-3 py-2 bg-[#3c3c3c] border rounded text-[#cccccc] focus:outline-none focus:border-[#007acc] ${
            fieldErrors.confirmPassword ? 'border-red-500' : 'border-[#3e3e42]'
          }`}
          placeholder="Confirm your password"
          required
          disabled={isLoading}
        />
        {fieldErrors.confirmPassword && (
          <p className="mt-1 text-xs text-red-400">{fieldErrors.confirmPassword}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2 px-4 bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-[#3c3c3c] disabled:cursor-not-allowed rounded text-white font-medium transition-colors"
      >
        {isLoading ? 'Creating account...' : 'Create Account'}
      </button>

      <p className="text-sm text-center text-[#808080]">
        Already have an account?{' '}
        <Link href="/login" className="text-[#569cd6] hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
