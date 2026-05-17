/**
 * Better Auth Server Configuration
 *
 * This is the main Better Auth configuration for the server.
 * It handles authentication and integrates with Polar for billing.
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { polar, checkout, portal, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { db } from "./db";
import { organizations, knowledgeLibraries } from "./db/pg-schema";
import * as authSchema from "./db/auth-schema";
import { user as userTable } from "./db/auth-schema";
import { KNOWLEDGE_LIBRARY_TYPES } from "./constants/libraries";
import { completeNewUserSignup } from "./auth/signup-lifecycle";
import { processValidatedPolarWebhook } from "./billing/polar-webhook-service";
import {
    sendAccountVerificationEmail,
    sendPasswordResetEmail,
} from "./email/transactional";
import { getPublicPlans } from "./polar/plans";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

const hasPolarCredentials = !!(
    process.env.POLAR_ACCESS_TOKEN &&
    process.env.POLAR_STARTER_PRODUCT_ID &&
    process.env.POLAR_PROFESSIONAL_PRODUCT_ID
);

const isPolarEnabled =
    process.env.POLAR_ENABLED === 'true' ||
    (process.env.NODE_ENV === 'production' && process.env.POLAR_ENABLED !== 'false');

// Check if Polar is configured. Local/private development stays auth-only unless
// explicitly opted in, so sign-up works without outbound billing network calls.
const isPolarConfigured = isPolarEnabled && hasPolarCredentials;

if (!isPolarConfigured) {
    console.log('[Better Auth] Polar billing not configured - running in auth-only mode');
}

const requireEmailVerification =
    process.env.EMAIL_VERIFICATION_REQUIRED === 'true' ||
    (process.env.NODE_ENV === 'production' && process.env.EMAIL_VERIFICATION_REQUIRED !== 'false');

const localTrustedOrigins =
    process.env.NODE_ENV === 'production'
        ? []
        : ['http://localhost:3000', 'http://127.0.0.1:3000'];

const configuredTrustedOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

// Initialize Polar client for Better Auth integration (only if configured)
const polarClient = isPolarConfigured
    ? new Polar({
        accessToken: process.env.POLAR_ACCESS_TOKEN!,
        server: process.env.NODE_ENV === "production" ? "production" : "sandbox",
    })
    : null;

// Better Auth configuration
export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: authSchema,
    }),

    // Email and password authentication
    emailAndPassword: {
        enabled: true,
        requireEmailVerification,
        sendResetPassword: async ({ user, url }) => {
            await sendPasswordResetEmail({
                to: user.email,
                name: user.name,
                url,
            });
        },
    },

    emailVerification: {
        sendOnSignUp: requireEmailVerification,
        sendOnSignIn: requireEmailVerification,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }) => {
            await sendAccountVerificationEmail({
                to: user.email,
                name: user.name,
                url,
            });
        },
    },

    // Session configuration - matches existing 24-hour sessions
    session: {
        expiresIn: 60 * 60 * 24, // 24 hours
        updateAge: 60 * 60, // Refresh session every hour
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5, // 5 minutes
        },
    },

    // App configuration
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    trustedOrigins: [...localTrustedOrigins, ...configuredTrustedOrigins],
    secret: process.env.BETTER_AUTH_SECRET || process.env.SESSION_SECRET,

    // Plugins - only include Polar if configured
    plugins: isPolarConfigured && polarClient
        ? [
            polar({
                client: polarClient,
                createCustomerOnSignUp: true,
                use: [
                    checkout({
                        products: getPublicPlans().map((plan) => ({
                            productId: plan.polarProductId!,
                            slug: plan.slug,
                        })),
                        successUrl: "/settings/billing?success=true",
                    }),
                    portal(),
                    webhooks({
                        secret: process.env.POLAR_WEBHOOK_SECRET!,
                        onPayload: async (payload) => {
                            console.log("[Polar Webhook]", payload.type);
                            await processValidatedPolarWebhook(payload);
                        },
                    }),
                ],
            }),
        ]
        : [],

    // Advanced options
    advanced: {
        database: {
            // Generate secure IDs
            generateId: () => {
                return randomUUID();
            },
        },
    },

    // User creation hook - create organization and knowledge libraries
    user: {
        additionalFields: {
            displayName: {
                type: "string",
                required: false,
            },
            organizationId: {
                type: "string",
                required: false,
            },
            isSuperAdmin: {
                type: "boolean",
                required: false,
                defaultValue: false,
                input: false,
            },
            trialPlanId: {
                type: "string",
                required: false,
            },
            trialStartedAt: {
                type: "date",
                required: false,
                input: false,
            },
            trialEndsAt: {
                type: "date",
                required: false,
                input: false,
            },
            trialStatus: {
                type: "string",
                required: false,
                input: false,
            },
            trialReminderSentAt: {
                type: "date",
                required: false,
                input: false,
            },
            termsAcceptedAt: {
                type: "date",
                required: false,
            },
            privacyAcceptedAt: {
                type: "date",
                required: false,
            },
        },
    },

    // Hooks for post-signup logic
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    try {
                        const { organizationId } = await completeNewUserSignup({
                            user,
                            libraryTypes: KNOWLEDGE_LIBRARY_TYPES,
                            store: {
                                createOrganization: async (values) => {
                                    await db.insert(organizations).values(values);
                                },
                                updateUser: async (userId, values) => {
                                    await db
                                        .update(userTable)
                                        .set(values)
                                        .where(eq(userTable.id, userId));
                                },
                                createKnowledgeLibrary: async (values) => {
                                    await db.insert(knowledgeLibraries).values(values);
                                },
                            },
                        });

                        console.log(`[Better Auth] Created organization ${organizationId} for user ${user.id}`);
                    } catch (error) {
                        console.error('[Better Auth] Error creating organization:', error);
                        // Don't throw - let user creation succeed even if org creation fails
                    }
                },
            },
        },
    },
});

// Export types for use in components
export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;

// Default export for Better Auth CLI
export default auth;
