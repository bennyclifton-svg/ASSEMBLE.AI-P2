/**
 * Pricing Card Component
 * Displays a plan option with checkout button
 */

'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import type { SubscriptionPlan } from '@/lib/polar/plans';

interface PricingCardProps {
    plan: SubscriptionPlan;
    isCurrentPlan: boolean;
}

export function PricingCard({ plan, isCurrentPlan }: PricingCardProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCheckout = async () => {
        if (plan.id === 'free' || isCurrentPlan) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/polar/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    planId: plan.id,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create checkout');
            }

            // Redirect to Polar checkout
            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    const isPaidPlan = plan.priceMonthly > 0;
    const isHighlighted = plan.id === 'professional';

    return (
        <div
            className={`flex flex-col rounded-lg border p-6 ${
                isHighlighted
                    ? 'border-blue-500 bg-blue-950/20'
                    : 'border-gray-800 bg-[#252526]'
            } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
        >
            {isCurrentPlan && (
                <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                    <Check className="h-3 w-3" />
                    Current Plan
                </span>
            )}

            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <p className="mt-1 text-sm text-gray-400">{plan.description}</p>

            <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold">${plan.priceMonthly}</span>
                {isPaidPlan && <span className="text-gray-400">/month</span>}
            </div>

            <ul className="mt-6 flex-1 space-y-3">
                {getFeatureList(plan).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 flex-none text-blue-400" />
                        <span className="text-gray-300">{feature}</span>
                    </li>
                ))}
            </ul>

            {error && (
                <p className="mt-4 text-sm text-red-400">{error}</p>
            )}

            <button
                onClick={handleCheckout}
                disabled={isCurrentPlan || plan.id === 'free' || isLoading}
                className={`mt-6 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    isCurrentPlan
                        ? 'cursor-default bg-gray-700 text-gray-400'
                        : plan.id === 'free'
                            ? 'cursor-default bg-gray-700 text-gray-400'
                            : isHighlighted
                                ? 'bg-blue-600 text-white hover:bg-blue-500'
                                : 'bg-gray-700 text-white hover:bg-gray-600'
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
