/**
 * Subscription Card Component
 * Displays current subscription status and details
 */

'use client';

import { getPlanById } from '@/lib/polar/plans';
import { Check, AlertCircle, Clock } from 'lucide-react';

interface SubscriptionCardProps {
    planId: string;
    status: string;
    currentPeriodEnd?: number | null;
    cancelAtPeriodEnd?: boolean;
}

export function SubscriptionCard({
    planId,
    status,
    currentPeriodEnd,
    cancelAtPeriodEnd,
}: SubscriptionCardProps) {
    const plan = getPlanById(planId);
    const planName = plan?.name || 'Free';

    // Format the renewal/expiry date
    const formattedDate = currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000).toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        })
        : null;

    // Determine status display
    const getStatusDisplay = () => {
        if (status === 'active' && !cancelAtPeriodEnd) {
            return {
                label: 'Active',
                chipClass: 'sitewise-chip-green',
                icon: Check,
            };
        }
        if (status === 'active' && cancelAtPeriodEnd) {
            return {
                label: 'Canceling',
                chipClass: 'sitewise-chip-amber',
                icon: Clock,
            };
        }
        if (status === 'past_due') {
            return {
                label: 'Past Due',
                chipClass: 'sitewise-chip-rose',
                icon: AlertCircle,
            };
        }
        if (status === 'trialing') {
            return {
                label: 'Trial',
                chipClass: 'sitewise-chip-cyan',
                icon: Clock,
            };
        }
        if (status === 'active_trial') {
            return {
                label: 'Trial',
                chipClass: 'sitewise-chip-cyan',
                icon: Clock,
            };
        }
        if (status === 'expired_trial') {
            return {
                label: 'Trial Expired',
                chipClass: 'sitewise-chip-rose',
                icon: AlertCircle,
            };
        }
        if (status === 'missing_subscription') {
            return {
                label: 'Read Only',
                chipClass: 'sitewise-chip-amber',
                icon: AlertCircle,
            };
        }
        if (status === 'canceled') {
            return {
                label: 'Canceled',
                chipClass: 'text-[var(--sw-muted)]',
                icon: AlertCircle,
            };
        }
        return {
            label: 'Free',
            chipClass: 'text-[var(--sw-muted)]',
            icon: Check,
        };
    };

    const statusDisplay = getStatusDisplay();
    const StatusIcon = statusDisplay.icon;

    return (
        <div className="sitewise-card p-6">
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-[var(--sw-ink)]">{planName}</h3>
                        <span
                            className={`sitewise-chip ${statusDisplay.chipClass}`}
                        >
                            <StatusIcon className="h-3 w-3" />
                            {statusDisplay.label}
                        </span>
                    </div>
                    <p className="mt-1 text-[var(--sw-muted)]">{plan?.description}</p>
                </div>
                {plan && plan.priceMonthly > 0 && (
                    <div className="text-right">
                        <span className="text-2xl font-bold text-[var(--sw-ink)]">${plan.priceMonthly}</span>
                        <span className="text-[var(--sw-muted)]">/month</span>
                    </div>
                )}
            </div>

            {/* Period info */}
            {formattedDate && (
                <div className="mt-4 border border-[var(--sw-rule-2)] bg-[var(--sw-paper)] p-4">
                    {cancelAtPeriodEnd ? (
                        <p className="text-sm text-[var(--color-accent-yellow)]">
                            Your subscription will end on {formattedDate}. You will retain access until then.
                        </p>
                    ) : status === 'active' ? (
                        <p className="text-sm text-[var(--sw-muted)]">
                            Next billing date: {formattedDate}
                        </p>
                    ) : status === 'trialing' ? (
                        <p className="text-sm text-[var(--color-accent-teal)]">
                            Trial ends on {formattedDate}. Add a payment method to continue.
                        </p>
                    ) : status === 'past_due' ? (
                        <p className="text-sm text-[var(--color-accent-coral)]">
                            Payment failed. Please update your payment method to avoid service interruption.
                        </p>
                    ) : null}
                </div>
            )}

            {/* Features summary */}
            {plan && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <FeatureItem
                        label="Projects"
                        value={plan.features.maxProjects === -1 ? 'Unlimited' : String(plan.features.maxProjects)}
                    />
                    <FeatureItem
                        label="Documents"
                        value={plan.features.maxDocuments === -1 ? 'Unlimited' : String(plan.features.maxDocuments)}
                    />
                    <FeatureItem
                        label="AI Queries"
                        value={
                            plan.features.aiQueriesPerMonth === -1
                                ? 'Unlimited'
                                : plan.features.aiQueriesPerMonth === 0
                                    ? 'Not included'
                                    : `${plan.features.aiQueriesPerMonth}/month`
                        }
                    />
                    <FeatureItem
                        label="Support"
                        value={plan.features.supportLevel.charAt(0).toUpperCase() + plan.features.supportLevel.slice(1)}
                    />
                </div>
            )}
        </div>
    );
}

function FeatureItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between border border-[var(--sw-rule-2)] bg-[var(--sw-paper)] px-3 py-2">
            <span className="font-mono text-[11px] text-[var(--sw-muted)]">{label}</span>
            <span className="text-sm font-medium text-[var(--sw-ink)]">{value}</span>
        </div>
    );
}
