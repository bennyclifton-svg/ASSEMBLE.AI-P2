/**
 * Pricing Section Component
 * Displays subscription tiers with CTAs
 */

'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';

export interface PricingTier {
    id: string;
    name: string;
    description: string;
    price: {
        monthly: number;
        annually: number;
    };
    features: string[];
    highlighted?: boolean;
    cta: string;
    polarProductId?: string;
}

export const pricingTiers: PricingTier[] = [
    {
        id: 'free',
        name: 'Free',
        description: 'For individuals exploring the platform',
        price: { monthly: 0, annually: 0 },
        features: [
            '1 active project',
            '100 documents',
            'Basic document management',
            'Manual data entry',
            'Community support',
        ],
        cta: 'Get Started',
    },
    {
        id: 'starter',
        name: 'Starter',
        description: 'For small firms getting started',
        price: { monthly: 49, annually: 39 },
        features: [
            '5 active projects',
            '1,000 documents',
            'AI document processing',
            '100 AI queries/month',
            'Procurement automation',
            'Email support',
        ],
        cta: 'Start Free Trial',
        polarProductId: 'starter',
    },
    {
        id: 'professional',
        name: 'Professional',
        description: 'For growing construction firms',
        price: { monthly: 149, annually: 119 },
        features: [
            'Unlimited projects',
            'Unlimited documents',
            'Advanced AI features',
            'Unlimited AI queries',
            'Cost planning module',
            'TRR report generation',
            'Priority support',
            'Custom integrations',
        ],
        highlighted: true,
        cta: 'Start Free Trial',
        polarProductId: 'professional',
    },
];

interface PricingSectionProps {
    billingPeriod?: 'monthly' | 'annually';
    onPeriodChange?: (period: 'monthly' | 'annually') => void;
    showToggle?: boolean;
}

export function PricingSection({
    billingPeriod = 'monthly',
    onPeriodChange,
    showToggle = true,
}: PricingSectionProps) {
    return (
        <section className="py-20 sm:py-32" id="pricing">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-base font-semibold leading-7 text-blue-400">
                        Simple Pricing
                    </h2>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                        Choose the right plan for your team
                    </p>
                    <p className="mt-6 text-lg leading-8 text-gray-400">
                        Start free and scale as you grow. All plans include a 14-day free trial.
                    </p>
                </div>

                {/* Billing toggle */}
                {showToggle && onPeriodChange && (
                    <div className="mt-10 flex justify-center">
                        <div className="inline-flex rounded-lg border border-gray-700 p-1">
                            <button
                                type="button"
                                onClick={() => onPeriodChange('monthly')}
                                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                    billingPeriod === 'monthly'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                Monthly
                            </button>
                            <button
                                type="button"
                                onClick={() => onPeriodChange('annually')}
                                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                    billingPeriod === 'annually'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                Annually
                                <span className="ml-1.5 text-xs text-green-400">Save 20%</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Pricing cards */}
                <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
                    {pricingTiers.map((tier) => (
                        <div
                            key={tier.id}
                            className={`flex flex-col rounded-2xl border p-8 ${
                                tier.highlighted
                                    ? 'border-blue-500 bg-blue-950/30 ring-1 ring-blue-500'
                                    : 'border-gray-800 bg-[#252526]'
                            }`}
                        >
                            {tier.highlighted && (
                                <p className="mb-4 text-center text-sm font-semibold text-blue-400">
                                    Most Popular
                                </p>
                            )}
                            <h3 className="text-xl font-semibold text-white">{tier.name}</h3>
                            <p className="mt-2 text-sm text-gray-400">{tier.description}</p>
                            <div className="mt-6 flex items-baseline gap-x-1">
                                <span className="text-4xl font-bold tracking-tight text-white">
                                    ${billingPeriod === 'annually' ? tier.price.annually : tier.price.monthly}
                                </span>
                                {tier.price.monthly > 0 && (
                                    <span className="text-sm text-gray-400">/month</span>
                                )}
                            </div>
                            {tier.price.monthly > 0 && billingPeriod === 'annually' && (
                                <p className="mt-1 text-sm text-gray-500">
                                    Billed annually (${tier.price.annually * 12}/year)
                                </p>
                            )}

                            <ul className="mt-8 space-y-3 text-sm leading-6 text-gray-300">
                                {tier.features.map((feature) => (
                                    <li key={feature} className="flex gap-x-3">
                                        <Check className="h-5 w-5 flex-none text-blue-400" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href={tier.id === 'free' ? '/register' : `/register?plan=${tier.id}`}
                                className={`mt-8 block rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors ${
                                    tier.highlighted
                                        ? 'bg-blue-600 text-white hover:bg-blue-500'
                                        : 'bg-gray-700 text-white hover:bg-gray-600'
                                }`}
                            >
                                {tier.cta}
                            </Link>
                        </div>
                    ))}
                </div>

                {/* Bottom note */}
                <p className="mt-10 text-center text-sm text-gray-500">
                    All prices in AUD. GST included where applicable.
                    <br />
                    Need a custom enterprise plan?{' '}
                    <a href="mailto:sales@assemble.ai" className="text-blue-400 hover:text-blue-300">
                        Contact us
                    </a>
                </p>
            </div>
        </section>
    );
}
