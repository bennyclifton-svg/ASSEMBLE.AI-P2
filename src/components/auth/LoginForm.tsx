'use client';

/**
 * LoginForm Component
 * Email/password login form with rate limit handling.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo = '/' }: LoginFormProps) {
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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.code === 'RATE_LIMITED' && data.error?.retryAfter) {
          setRateLimitCountdown(data.error.retryAfter);
          setError(`Too many failed attempts. Please wait ${data.error.retryAfter} seconds.`);
        } else {
          setError(data.error?.message || 'Login failed');
        }
        return;
      }

      // Successful login - redirect
      router.push(redirectTo);
      router.refresh();

    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isRateLimited = rateLimitCountdown > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm bg-red-500/10 border border-red-500/20 rounded text-red-400">
          {error}
          {isRateLimited && (
            <div className="mt-1 font-mono text-xs">
              Retry in: {Math.floor(rateLimitCountdown / 60)}:{String(rateLimitCountdown % 60).padStart(2, '0')}
            </div>
          )}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm text-[#cccccc] mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 bg-[#3c3c3c] border border-[#3e3e42] rounded text-[#cccccc] focus:outline-none focus:border-[#007acc]"
          placeholder="you@example.com"
          required
          disabled={isLoading || isRateLimited}
        />
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
          className="w-full px-3 py-2 bg-[#3c3c3c] border border-[#3e3e42] rounded text-[#cccccc] focus:outline-none focus:border-[#007acc]"
          placeholder="Enter your password"
          required
          disabled={isLoading || isRateLimited}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || isRateLimited}
        className="w-full py-2 px-4 bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-[#3c3c3c] disabled:cursor-not-allowed rounded text-white font-medium transition-colors"
      >
        {isLoading ? 'Signing in...' : isRateLimited ? `Wait ${rateLimitCountdown}s` : 'Sign In'}
      </button>

      <p className="text-sm text-center text-[#808080]">
        Don't have an account?{' '}
        <Link href="/register" className="text-[#569cd6] hover:underline">
          Register
        </Link>
      </p>
    </form>
  );
}
