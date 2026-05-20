'use client';

/**
 * LoginForm Component
 * Email/password login form using Better Auth.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from '@/lib/auth-client';

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo = '/dashboard' }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

  // Countdown timer for rate limiting
  useEffect(() => {
    if (rateLimitCountdown <= 0) return;

    const timer = setInterval(() => {
      setRateLimitCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [rateLimitCountdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        // Handle Better Auth error responses
        const errorCode = result.error.code;
        const errorMessage = result.error.message || 'Login failed';

        // Check for rate limiting (if implemented via plugin)
        if (errorCode === 'RATE_LIMITED' || errorCode === 'TOO_MANY_REQUESTS') {
          const retryAfter = 60; // Default 60 seconds
          setRateLimitCountdown(retryAfter);
          setError(`Too many failed attempts. Please wait ${retryAfter} seconds.`);
        } else if (errorCode === 'INVALID_EMAIL_OR_PASSWORD') {
          setError('Invalid email or password');
        } else if (errorCode === 'USER_NOT_FOUND') {
          setError('No account found with this email');
        } else {
          setError(errorMessage);
        }
        return;
      }

      // Successful login - redirect
      router.push(redirectTo);
      router.refresh();

    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isRateLimited = rateLimitCountdown > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className="p-3"
          style={{
            background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.30)',
            borderLeft: '3px solid #dc2626',
            color: '#b91c1c',
            fontFamily: 'var(--sw-font-body)',
            fontSize: 13,
          }}
        >
          {error}
          {isRateLimited && (
            <div
              className="mt-1"
              style={{ fontFamily: 'var(--sw-font-mono)', fontSize: 11 }}
            >
              Retry in: {Math.floor(rateLimitCountdown / 60)}:{String(rateLimitCountdown % 60).padStart(2, '0')}
            </div>
          )}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block mb-1.5"
          style={{
            fontFamily: 'var(--sw-font-mono)',
            fontSize: 10,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            fontWeight: 700,
            color: 'var(--sw-ink)',
          }}
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2.5 focus:outline-none"
          style={{
            background: 'var(--sw-shell)',
            border: '1px solid var(--sw-rule)',
            color: 'var(--sw-ink)',
            fontFamily: 'var(--sw-font-body)',
            fontSize: 14,
          }}
          placeholder="you@example.com"
          required
          disabled={isLoading || isRateLimited}
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block mb-1.5"
          style={{
            fontFamily: 'var(--sw-font-mono)',
            fontSize: 10,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            fontWeight: 700,
            color: 'var(--sw-ink)',
          }}
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2.5 focus:outline-none"
          style={{
            background: 'var(--sw-shell)',
            border: '1px solid var(--sw-rule)',
            color: 'var(--sw-ink)',
            fontFamily: 'var(--sw-font-body)',
            fontSize: 14,
          }}
          placeholder="Enter your password"
          required
          disabled={isLoading || isRateLimited}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || isRateLimited}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 font-bold uppercase transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          fontFamily: 'var(--sw-font-mono)',
          fontSize: 12,
          letterSpacing: '0.12em',
          background: 'var(--sw-cta)',
          color: 'var(--sw-cta-fg)',
        }}
      >
        {isLoading ? 'Signing in…' : isRateLimited ? `Wait ${rateLimitCountdown}s` : 'Sign In'}
      </button>

      <p
        className="text-center"
        style={{
          fontFamily: 'var(--sw-font-body)',
          fontSize: 13,
          color: 'var(--sw-muted)',
        }}
      >
        Don't have an account?{' '}
        <Link
          href="/register"
          className="hover:underline"
          style={{ color: 'var(--sw-rose-dk)', fontWeight: 600 }}
        >
          Register
        </Link>
      </p>
    </form>
  );
}
