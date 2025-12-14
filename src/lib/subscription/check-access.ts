/**
 * Subscription Access Control Utilities
 * Provides functions to check user access to features based on subscription
 */

import { db } from '@/lib/db';
import { users } from '@/lib/db/pg-schema';
import { eq } from 'drizzle-orm';
import {
    getTierDefinition,
    tierHasFeature,
    getTierLimit,
    isLimitExceeded,
    getMinimumTierForFeature,
    type SubscriptionTier,
    type TierFeatures,
    type TierLimits,
} from './tiers';

export interface UserSubscriptionInfo {
    userId: string;
    tier: SubscriptionTier;
    status: string;
    endsAt: number | null;
    isActive: boolean;
    isExpired: boolean;
}

/**
 * Get subscription info for a user
 */
export async function getUserSubscriptionInfo(userId: string): Promise<UserSubscriptionInfo | null> {
    try {
        const [user] = await db
            .select({
                id: users.id,
                subscriptionStatus: users.subscriptionStatus,
                subscriptionPlanId: users.subscriptionPlanId,
                subscriptionEndsAt: users.subscriptionEndsAt,
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!user) return null;

        const tier = (user.subscriptionPlanId || 'free') as SubscriptionTier;
        const status = user.subscriptionStatus || 'free';
        const endsAt = user.subscriptionEndsAt;
        const now = Math.floor(Date.now() / 1000);

        // Check if subscription is active
        const isActive = status === 'active' || status === 'trialing';

        // Check if subscription has expired
        const isExpired = endsAt !== null && endsAt < now && status !== 'active';

        return {
            userId: user.id,
            tier: isExpired ? 'free' : tier, // Treat expired as free
            status,
            endsAt,
            isActive,
            isExpired,
        };
    } catch (error) {
        console.error('Error getting user subscription info:', error);
        return null;
    }
}

/**
 * Check if a user can access a specific feature
 */
export async function canAccessFeature(
    userId: string,
    feature: keyof TierFeatures
): Promise<{ allowed: boolean; reason?: string; requiredTier?: SubscriptionTier }> {
    const subInfo = await getUserSubscriptionInfo(userId);

    if (!subInfo) {
        return {
            allowed: false,
            reason: 'User not found',
        };
    }

    const hasAccess = tierHasFeature(subInfo.tier, feature);

    if (hasAccess) {
        return { allowed: true };
    }

    const requiredTier = getMinimumTierForFeature(feature);
    return {
        allowed: false,
        reason: `This feature requires the ${getTierDefinition(requiredTier).name} plan or higher`,
        requiredTier,
    };
}

/**
 * Get remaining usage for a limited resource
 * Returns -1 for unlimited resources
 */
export async function getUsageRemaining(
    userId: string,
    limitType: keyof TierLimits,
    currentUsage: number
): Promise<{ remaining: number; limit: number; isUnlimited: boolean }> {
    const subInfo = await getUserSubscriptionInfo(userId);
    const tier = subInfo?.tier || 'free';
    const limit = getTierLimit(tier, limitType);

    if (limit === -1) {
        return { remaining: -1, limit: -1, isUnlimited: true };
    }

    const remaining = Math.max(0, limit - currentUsage);
    return { remaining, limit, isUnlimited: false };
}

/**
 * Check if a user has exceeded a specific limit
 */
export async function checkLimit(
    userId: string,
    limitType: keyof TierLimits,
    currentUsage: number
): Promise<{ exceeded: boolean; limit: number; usage: number; requiredTier?: SubscriptionTier }> {
    const subInfo = await getUserSubscriptionInfo(userId);
    const tier = subInfo?.tier || 'free';
    const limit = getTierLimit(tier, limitType);

    if (limit === -1) {
        return { exceeded: false, limit: -1, usage: currentUsage };
    }

    const exceeded = currentUsage >= limit;

    if (exceeded) {
        // Find the next tier that would have a higher limit
        const tiers: SubscriptionTier[] = ['starter', 'professional'];
        for (const nextTier of tiers) {
            const nextLimit = getTierLimit(nextTier, limitType);
            if (nextLimit === -1 || nextLimit > limit) {
                return { exceeded: true, limit, usage: currentUsage, requiredTier: nextTier };
            }
        }
    }

    return { exceeded, limit, usage: currentUsage };
}

/**
 * Require a minimum subscription tier
 * Throws an error if the user doesn't meet the requirement
 */
export async function requireSubscription(
    userId: string,
    minimumTier: SubscriptionTier
): Promise<void> {
    const subInfo = await getUserSubscriptionInfo(userId);

    if (!subInfo) {
        throw new SubscriptionError('User not found', 'free', minimumTier);
    }

    const tierOrder: Record<SubscriptionTier, number> = {
        free: 0,
        starter: 1,
        professional: 2,
    };

    if (tierOrder[subInfo.tier] < tierOrder[minimumTier]) {
        throw new SubscriptionError(
            `This action requires the ${getTierDefinition(minimumTier).name} plan or higher`,
            subInfo.tier,
            minimumTier
        );
    }
}

/**
 * Custom error class for subscription-related errors
 */
export class SubscriptionError extends Error {
    constructor(
        message: string,
        public currentTier: SubscriptionTier,
        public requiredTier: SubscriptionTier
    ) {
        super(message);
        this.name = 'SubscriptionError';
    }
}

/**
 * Helper to check subscription status for API routes
 * Returns a standardized response for unauthorized access
 */
export function createSubscriptionErrorResponse(error: SubscriptionError) {
    return {
        error: error.message,
        code: 'SUBSCRIPTION_REQUIRED',
        currentTier: error.currentTier,
        requiredTier: error.requiredTier,
        upgradeUrl: `/billing?upgrade=${error.requiredTier}`,
    };
}
