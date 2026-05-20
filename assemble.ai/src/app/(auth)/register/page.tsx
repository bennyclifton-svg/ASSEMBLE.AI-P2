/**
 * Register Page
 * Unauthenticated route for new user registration.
 */

import Image from 'next/image';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { resolveTrialPlanIntent } from '@/lib/subscription/trial';

interface RegisterPageProps {
  searchParams?: Promise<{
    plan?: string | string[];
  }> | {
    plan?: string | string[];
  };
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const planIntent = resolveTrialPlanIntent(params?.plan);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--sw-paper-2)' }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(900px 540px at 80% -10%, rgba(79,182,190,0.10), transparent 60%),' +
            'radial-gradient(720px 420px at -10% 110%, rgba(32,105,138,0.10), transparent 62%)',
        }}
      />

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/images/sitewise-logo-light.png"
            alt="Sitewise"
            width={1038}
            height={554}
            priority
            style={{ height: 56, width: 'auto', display: 'block' }}
          />
          <p
            className="mt-5"
            style={{
              fontFamily: 'var(--sw-font-mono)',
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(232,228,218,0.55)',
            }}
          >
            Create your account
          </p>
        </div>

        <div
          className="p-7"
          style={{
            background: 'var(--sw-paper)',
            border: '1px solid var(--sw-rule-dk-2)',
            boxShadow: '0 30px 80px -20px rgba(14,16,20,0.45)',
          }}
        >
          <RegisterForm planIntent={planIntent} />
        </div>
      </div>
    </div>
  );
}
