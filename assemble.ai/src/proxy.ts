/**
 * Authentication Proxy
 * Handles routing for public and authenticated pages.
 * Uses Better Auth for session management.
 *
 * Note: Renamed from middleware.ts to proxy.ts per Next.js 16 convention.
 *
 * Route structure:
 * - / (public landing page for unauthenticated, redirects to /dashboard for authenticated)
 * - /pricing (public)
 * - /login, /register (public auth pages)
 * - /dashboard (authenticated - main app)
 * - /billing (authenticated - subscription management)
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication (marketing pages)
const PUBLIC_MARKETING_ROUTES = ['/', '/pricing', '/about', '/contact', '/privacy', '/terms'];

// Auth pages (login/register)
const AUTH_ROUTES = ['/login', '/register'];

// Static assets and API routes handle their own auth
const BYPASS_PATTERNS = [
  '/api/',
  '/_next/',
  '/favicon.ico',
  '/.*\\.(svg|png|jpg|jpeg|gif|webp|ico)$',
];

// Better Auth session cookie name
const SESSION_COOKIE_NAME = 'better-auth.session_token';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route should bypass middleware
  const shouldBypass = BYPASS_PATTERNS.some(pattern => {
    if (pattern.includes('\\')) {
      return new RegExp(pattern).test(pathname);
    }
    return pathname.startsWith(pattern);
  });

  if (shouldBypass) {
    return NextResponse.next();
  }

  // Check for Better Auth session cookie
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = !!sessionToken;

  // Check route type
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));
  const isPublicMarketingRoute = PUBLIC_MARKETING_ROUTES.includes(pathname);
  const isDashboardRoute = pathname.startsWith('/dashboard') ||
    pathname.startsWith('/billing') ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/cost-plan');

  // Redirect authenticated users from public marketing pages to dashboard
  if (isAuthenticated && isPublicMarketingRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect authenticated users from auth pages to dashboard
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect unauthenticated users from protected routes to login
  if (!isAuthenticated && isDashboardRoute) {
    const loginUrl = new URL('/login', request.url);
    // Preserve the original URL for redirect after login
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
