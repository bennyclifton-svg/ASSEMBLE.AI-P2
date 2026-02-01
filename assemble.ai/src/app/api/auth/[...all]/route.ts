/**
 * Better Auth Catch-All Route Handler
 *
 * This route handles all Better Auth API endpoints including:
 * - POST /api/auth/sign-in/email - Email/password sign in
 * - POST /api/auth/sign-up/email - Email/password sign up
 * - POST /api/auth/sign-out - Sign out
 * - GET /api/auth/session - Get current session
 * - POST /api/auth/checkout - Polar checkout (via plugin)
 * - POST /api/auth/customer/portal - Polar customer portal (via plugin)
 * - POST /api/auth/polar/webhook - Polar webhooks (via plugin)
 */

import { auth } from "@/lib/better-auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
