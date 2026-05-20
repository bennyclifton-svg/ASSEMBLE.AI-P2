'use client';

/**
 * RegisterForm Component
 * Registration form using Better Auth.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp } from '@/lib/auth-client';
import { PUBLIC_SAAS_TRIAL, getPlanById } from '@/lib/subscription/plan-catalog';
import type { TrialPlanIntent } from '@/lib/subscription/trial';

interface RegisterFormProps {
  planIntent: TrialPlanIntent;
}

export function RegisterForm({ planIntent }: RegisterFormProps) {
  const router = useRouter();
  const selectedPlan = getPlanById(planIntent.planId);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
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

    if (!acceptedTerms) {
      setError('You must accept the Terms and Privacy Policy to create an account.');
      return;
    }

    setIsLoading(true);

    try {
      const consentTimestamp = new Date().toISOString();
      const result = await signUp.email({
        email,
        password,
        name: displayName,
        trialPlanId: planIntent.planId,
        termsAcceptedAt: consentTimestamp,
        privacyAcceptedAt: consentTimestamp,
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
      <div
        className="p-3"
        style={{
          background: 'var(--sw-rose-tint)',
          border: '1px solid rgba(79,182,190,0.30)',
          borderLeft: '3px solid var(--sw-rose)',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--sw-font-mono)',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontWeight: 700,
            color: 'var(--sw-rose-dk)',
          }}
        >
          {selectedPlan?.name ?? 'Starter'} trial
        </p>
        <p
          className="mt-1"
          style={{
            fontFamily: 'var(--sw-font-body)',
            fontSize: 12.5,
            color: 'var(--sw-ink)',
          }}
        >
          {PUBLIC_SAAS_TRIAL.days}-day free trial. No credit card required.
        </p>
        {planIntent.wasInvalid && (
          <p
            className="mt-2"
            style={{
              fontFamily: 'var(--sw-font-body)',
              fontSize: 12,
              color: 'var(--sw-rose-dk)',
            }}
          >
            Unknown plan selected. Starter trial will be used.
          </p>
        )}
      </div>

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
        </div>
      )}

      <FieldBlock
        id="displayName"
        label="Display Name"
        type="text"
        value={displayName}
        onChange={setDisplayName}
        placeholder="Your name"
        disabled={isLoading}
        error={fieldErrors.displayName}
        maxLength={100}
      />

      <FieldBlock
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        disabled={isLoading}
        error={fieldErrors.email}
      />

      <FieldBlock
        id="password"
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="Minimum 8 characters"
        disabled={isLoading}
        error={fieldErrors.password}
        minLength={8}
      />

      <FieldBlock
        id="confirmPassword"
        label="Confirm Password"
        type="password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        placeholder="Confirm your password"
        disabled={isLoading}
        error={fieldErrors.confirmPassword}
      />

      <label
        className="flex items-start gap-3"
        style={{
          fontFamily: 'var(--sw-font-body)',
          fontSize: 13,
          color: 'var(--sw-muted)',
        }}
      >
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="mt-1 h-4 w-4"
          style={{
            accentColor: 'var(--sw-cta)',
            borderColor: 'var(--sw-rule)',
          }}
          disabled={isLoading}
        />
        <span>
          I agree to the{' '}
          <Link
            href="/terms"
            className="hover:underline"
            style={{ color: 'var(--sw-rose-dk)', fontWeight: 600 }}
          >
            Terms
          </Link>{' '}
          and{' '}
          <Link
            href="/privacy"
            className="hover:underline"
            style={{ color: 'var(--sw-rose-dk)', fontWeight: 600 }}
          >
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 font-bold uppercase transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          fontFamily: 'var(--sw-font-mono)',
          fontSize: 12,
          letterSpacing: '0.12em',
          background: 'var(--sw-cta)',
          color: 'var(--sw-cta-fg)',
        }}
      >
        {isLoading ? 'Creating account…' : 'Create Account'}
      </button>

      <p
        className="text-center"
        style={{
          fontFamily: 'var(--sw-font-body)',
          fontSize: 13,
          color: 'var(--sw-muted)',
        }}
      >
        Already have an account?{' '}
        <Link
          href="/login"
          className="hover:underline"
          style={{ color: 'var(--sw-rose-dk)', fontWeight: 600 }}
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

interface FieldBlockProps {
  id: string;
  label: string;
  type: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  maxLength?: number;
  minLength?: number;
}

function FieldBlock({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  disabled,
  error,
  maxLength,
  minLength,
}: FieldBlockProps) {
  return (
    <div>
      <label
        htmlFor={id}
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
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 focus:outline-none"
        style={{
          background: 'var(--sw-shell)',
          border: error ? '1px solid #dc2626' : '1px solid var(--sw-rule)',
          color: 'var(--sw-ink)',
          fontFamily: 'var(--sw-font-body)',
          fontSize: 14,
        }}
        placeholder={placeholder}
        required
        disabled={disabled}
        maxLength={maxLength}
        minLength={minLength}
      />
      {error && (
        <p
          className="mt-1"
          style={{
            fontFamily: 'var(--sw-font-body)',
            fontSize: 12,
            color: '#b91c1c',
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
