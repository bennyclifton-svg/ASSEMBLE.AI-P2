/**
 * Login Page
 * Unauthenticated route for user login.
 */

import { LoginForm } from '@/components/auth/LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#cccccc]">assemble.ai</h1>
          <p className="text-[#808080] mt-2">Sign in to your account</p>
        </div>

        {/* Login Form Card */}
        <div className="bg-[#252526] border border-[#3e3e42] rounded-lg p-6">
          <LoginForm redirectTo={params.redirect || '/'} />
        </div>
      </div>
    </div>
  );
}
