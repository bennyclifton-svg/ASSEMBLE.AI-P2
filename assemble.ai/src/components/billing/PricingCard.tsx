/**
 * Pricing Card Component
 * Displays a plan option with checkout button using Better Auth Polar plugin
 */

'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { checkout } from '@/lib/auth-client';
import type { SubscriptionPlan } from '@/lib/polar/plans';

interface PricingCardProps {
    plan: SubscriptionPlan;
    isCurrentPlan: boolean;
    currentPlanId?: string; // The actual current plan ID to determine if user has any subscription
}

export function PricingCard({ plan, isCurrentPlan, currentPlanId = 'free' }: PricingCardProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCheckout = async () => {
        if (plan.id === 'free' || isCurrentPlan) return;

        setIsLoading(true);
        setError(null);

        try {
            // Use Better Auth's Polar checkout - redirects to Polar checkout page
            // Use slug to reference the product configured in better-auth.ts
            await checkout({
                slug: plan.id, // 'starter' or 'professional' matches the slug in server config
            });
        } catch (err) {
            console.error('Checkout error:', err);
            setError(err instanceof Error ? err.message : 'Something went wrong');
            setIsLoading(false);
        }
    };

    const isPaidPlan = plan.priceMonthly > 0;
    // Only highlight Professional if user is on Free plan (no active subscription)
    const isHighlighted = plan.id === 'professional' && currentPlanId === 'free';
    // Note: don't check plan.polarProductId here - it uses server-only env vars
    // (not NEXT_PUBLIC_) so it's always undefined on the client. Checkout uses slug instead.
    const canCheckout = isPaidPlan && !isCurrentPlan;

    return (
        <div
            className={`flex flex-col rounded-lg border p-6 ${
                isCurrentPlan
                    ? 'border-[var(--color-accent-teal)] bg-[var(--color-accent-teal-tint)] ring-2 ring-[var(--color-accent-teal)]'
                    : isHighlighted
                        ? 'border-[var(--color-accent-copper)] bg-[var(--color-accent-copper-tint)]'
                        : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)]'
            }`}
        >
            {isCurrentPlan && (
                <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-[var(--color-accent-teal-tint)] px-2 py-0.5 text-xs font-medium text-[var(--color-accent-teal)]">
                    <Check className="h-3 w-3" />
                    Current Plan
                </span>
            )}

            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{plan.name}</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{plan.description}</p>

            <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[var(--color-text-primary)]">${plan.priceMonthly}</span>
                {isPaidPlan && <span className="text-[var(--color-text-muted)]">/month</span>}
            </div>

            <ul className="mt-6 flex-1 space-y-3">
                {getFeatureList(plan).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 flex-none text-[var(--color-accent-teal)]" />
                        <span className="text-[var(--color-text-secondary)]">{feature}</span>
                    </li>
                ))}
            </ul>

            {error && (
                <p className="mt-4 text-sm text-red-400">{error}</p>
            )}

            <button
                onClick={handleCheckout}
                disabled={isCurrentPlan || !canCheckout || isLoading}
                className={`mt-6 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    isCurrentPlan
                        ? 'cursor-default bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'
                        : !canCheckout
                            ? 'cursor-default bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'
                            : isHighlighted
                                ? 'bg-[var(--color-accent-copper)] text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-copper-light)]'
                                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]'
                }`}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                    </>
                ) : isCurrentPlan ? (
                    'Current Plan'
                ) : plan.id === 'free' ? (
                    'Included'
                ) : (
                    'Upgrade'
                )}
            </button>
        </div>
    );
}

function getFeatureList(plan: SubscriptionPlan): string[] {
    const features: string[] = [];

    // Projects
    if (plan.features.maxProjects === -1) {
        features.push('Unlimited projects');
    } else {
        features.push(`${plan.features.maxProjects} project${plan.features.maxProjects > 1 ? 's' : ''}`);
    }

    // Documents
    if (plan.features.maxDocuments === -1) {
        features.push('Unlimited documents');
    } else {
        features.push(`${plan.features.maxDocuments.toLocaleString()} documents`);
    }

    // AI Queries
    if (plan.features.aiQueriesPerMonth === -1) {
        features.push('Unlimited AI queries');
    } else if (plan.features.aiQueriesPerMonth > 0) {
        features.push(`${plan.features.aiQueriesPerMonth} AI queries/month`);
    }

    // Features
    if (plan.features.hasAiDocumentProcessing) {
        features.push('AI document processing');
    }

    if (plan.features.hasProcurementAutomation) {
        features.push('Procurement automation');
    }

    if (plan.features.hasCostPlanning) {
        features.push('Cost planning module');
    }

    if (plan.features.hasTrrReportGeneration) {
        features.push('TRR report generation');
    }

    if (plan.features.hasCustomIntegrations) {
        features.push('Custom integrations');
    }

    // Support
    const supportLabels: Record<string, string> = {
        community: 'Community support',
        email: 'Email support',
        priority: 'Priority support',
    };
    features.push(supportLabels[plan.features.supportLevel] || 'Community support');

    return features;
}
