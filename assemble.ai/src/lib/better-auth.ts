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
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

// Check if Polar is configured
const isPolarConfigured = !!(
    process.env.POLAR_ACCESS_TOKEN &&
    process.env.POLAR_STARTER_PRODUCT_ID &&
    process.env.POLAR_PROFESSIONAL_PRODUCT_ID
);

if (!isPolarConfigured) {
    console.log('[Better Auth] Polar billing not configured - running in auth-only mode');
}

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
        requireEmailVerification: false, // Enable later after migration
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
    secret: process.env.BETTER_AUTH_SECRET || process.env.SESSION_SECRET,

    // Plugins - only include Polar if configured
    plugins: isPolarConfigured && polarClient
        ? [
            polar({
                client: polarClient,
                createCustomerOnSignUp: true,
                use: [
                    checkout({
                        products: [
                            {
                                productId: process.env.POLAR_STARTER_PRODUCT_ID!,
                                slug: "starter",
                            },
                            {
                                productId: process.env.POLAR_PROFESSIONAL_PRODUCT_ID!,
                                slug: "professional",
                            },
                        ],
                        successUrl: "/billing?success=true",
                    }),
                    portal(),
                    webhooks({
                        secret: process.env.POLAR_WEBHOOK_SECRET!,
                        onPayload: async (payload) => {
                            // Log the webhook event
                            console.log("[Polar Webhook]", payload.type);
                        },
                    }),
                ],
            }),
        ]
        : [],

    // Advanced options
    advanced: {
        // Generate secure IDs
        generateId: () => {
            return randomUUID();
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
        },
    },

    // Hooks for post-signup logic
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    try {
                        const now = Math.floor(Date.now() / 1000);
                        const displayName = user.name || user.email.split('@')[0];

                        // Create organization for the new user
                        const organizationId = randomUUID();
                        await db.insert(organizations).values({
                            id: organizationId,
                            name: `${displayName}'s Organization`,
                            defaultSettings: '{}',
                            createdAt: now,
                            updatedAt: now,
                        });

                        // Update user with organizationId
                        await db
                            .update(userTable)
                            .set({ organizationId })
                            .where(eq(userTable.id, user.id));

                        // Create knowledge libraries for the organization
                        for (const libraryType of KNOWLEDGE_LIBRARY_TYPES) {
                            await db.insert(knowledgeLibraries).values({
                                id: randomUUID(),
                                organizationId,
                                type: libraryType.id,
                                documentCount: 0,
                                createdAt: now,
                                updatedAt: now,
                            });
                        }

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
