/**
 * Authentication Middleware
 * Protects routes by checking for valid session cookie.
 * Redirects unauthenticated users to /login.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/register'];

// Static assets and API routes handle their own auth
const BYPASS_PATTERNS = [
  '/api/',
  '/_next/',
  '/favicon.ico',
  '/.*\\.(svg|png|jpg|jpeg|gif|webp|ico)$',
];

export async function middleware(request: NextRequest) {
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

  // Check for session cookie
  const sessionToken = request.cookies.get('session')?.value;
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  // Redirect unauthenticated users to login (except public routes)
  if (!sessionToken && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    // Preserve the original URL for redirect after login
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (sessionToken && isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url));
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
