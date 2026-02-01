/**
 * Better Auth Schema for Drizzle
 *
 * This file contains the database schema required by Better Auth.
 * These tables will be used alongside the existing schema during migration,
 * and eventually replace the custom auth tables.
 *
 * Tables:
 * - user: Better Auth user table
 * - session: Better Auth session management
 * - account: OAuth credentials and password storage
 * - verification: Email verification and password reset tokens
 *
 * Polar Plugin Tables (managed by @polar-sh/better-auth):
 * - polar_customer: Links users to Polar customers
 * - polar_subscription: Tracks active subscriptions
 */

import { pgTable, text, integer, boolean, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// BETTER AUTH CORE TABLES
// ============================================================================

/**
 * Better Auth User Table
 *
 * This is the primary user table for Better Auth.
 * Note: This is separate from the existing 'users' table during migration.
 */
export const user = pgTable('user', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    // Custom fields for organization support
    organizationId: text('organization_id'),
    displayName: text('display_name'),
}, (table) => [
    index('user_email_idx').on(table.email),
]);

/**
 * Better Auth Session Table
 *
 * Manages user sessions with rolling expiry support.
 */
export const session = pgTable('session', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
    index('session_user_id_idx').on(table.userId),
    index('session_token_idx').on(table.token),
]);

/**
 * Better Auth Account Table
 *
 * Stores OAuth provider credentials and password hashes.
 * Each user can have multiple accounts (email + OAuth providers).
 */
export const account = pgTable('account', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    idToken: text('id_token'),
    password: text('password'), // Hashed password for email/password auth
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
    index('account_user_id_idx').on(table.userId),
    unique('account_provider_account_unique').on(table.providerId, table.accountId),
]);

/**
 * Better Auth Verification Table
 *
 * Stores verification tokens for:
 * - Email verification
 * - Password reset
 * - Magic link authentication
 */
export const verification = pgTable('verification', {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
    index('verification_identifier_idx').on(table.identifier),
]);

// ============================================================================
// POLAR PLUGIN TABLES
// ============================================================================

/**
 * Polar Customer Table
 *
 * Links Better Auth users to Polar customer records.
 * Created automatically when createCustomerOnSignUp is enabled.
 */
export const polarCustomer = pgTable('polar_customer', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }).unique(),
    polarCustomerId: text('polar_customer_id').notNull().unique(),
    email: text('email'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
    index('polar_customer_user_id_idx').on(table.userId),
    index('polar_customer_polar_id_idx').on(table.polarCustomerId),
]);

/**
 * Polar Subscription Table
 *
 * Tracks active subscriptions from Polar.
 * Updated via webhooks.
 */
export const polarSubscription = pgTable('polar_subscription', {
    id: text('id').primaryKey(),
    customerId: text('customer_id').notNull().references(() => polarCustomer.id, { onDelete: 'cascade' }),
    polarSubscriptionId: text('polar_subscription_id').notNull().unique(),
    productId: text('product_id').notNull(),
    priceId: text('price_id'),
    status: text('status').notNull(), // 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'
    currentPeriodStart: timestamp('current_period_start'),
    currentPeriodEnd: timestamp('current_period_end'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
    canceledAt: timestamp('canceled_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
    index('polar_subscription_customer_id_idx').on(table.customerId),
    index('polar_subscription_polar_id_idx').on(table.polarSubscriptionId),
    index('polar_subscription_status_idx').on(table.status),
]);

// ============================================================================
// RELATIONS
// ============================================================================

export const userRelations = relations(user, ({ many }) => ({
    sessions: many(session),
    accounts: many(account),
    polarCustomer: many(polarCustomer),
}));

export const sessionRelations = relations(session, ({ one }) => ({
    user: one(user, {
        fields: [session.userId],
        references: [user.id],
    }),
}));

export const accountRelations = relations(account, ({ one }) => ({
    user: one(user, {
        fields: [account.userId],
        references: [user.id],
    }),
}));

export const polarCustomerRelations = relations(polarCustomer, ({ one, many }) => ({
    user: one(user, {
        fields: [polarCustomer.userId],
        references: [user.id],
    }),
    subscriptions: many(polarSubscription),
}));

export const polarSubscriptionRelations = relations(polarSubscription, ({ one }) => ({
    customer: one(polarCustomer, {
        fields: [polarSubscription.customerId],
        references: [polarCustomer.id],
    }),
}));
