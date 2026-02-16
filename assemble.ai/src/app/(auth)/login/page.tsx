/**
 * Login Page
 * Unauthenticated route for user login.
 */

import { LoginForm } from '@/components/auth/LoginForm';
import Image from 'next/image';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-[var(--primitive-slate-900)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Aurora background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--primitive-aurora-blue)] opacity-10 blur-[120px] rounded-full" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-[var(--primitive-aurora-cyan)] opacity-8 blur-[100px] rounded-full" />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-[var(--primitive-aurora-violet)] opacity-6 blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="flex items-center gap-3 mb-3">
            <Image
              src="/logo-foundry.svg"
              alt="Foundry Logo"
              width={38}
              height={38}
              className="flex-shrink-0 logo-icon-glow"
              priority
            />
            <span className="text-2xl font-[family-name:var(--font-exo-2)] font-bold italic text-white">
              Foundry
            </span>
          </div>
          <p className="text-[var(--color-text-muted)] mt-2">Sign in to your account</p>
        </div>

        {/* Login Form Card - Aurora style */}
        <div className="card-aurora rounded-lg p-6">
          <LoginForm redirectTo={params.redirect || '/'} />
        </div>
      </div>
    </div>
  );
}
