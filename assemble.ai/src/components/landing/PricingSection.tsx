/**
 * Pricing Section Component
 * Displays public SaaS plans from the shared plan catalog.
 */

'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSession, checkout } from '@/lib/auth-client';
import { createCheckoutRequestForPlan } from '@/lib/billing/polar-checkout';
import { PUBLIC_SAAS_TRIAL, getPublicPlans, type SubscriptionPlan } from '@/lib/polar/plans';

export type PricingTier = SubscriptionPlan;

export const pricingTiers: PricingTier[] = getPublicPlans();

interface PricingSectionProps {
    billingPeriod?: 'monthly' | 'annually';
    onPeriodChange?: (period: 'monthly' | 'annually') => void;
    showToggle?: boolean;
}

export function PricingSection({
    billingPeriod: externalPeriod,
    onPeriodChange,
    showToggle = true,
}: PricingSectionProps) {
    const [internalPeriod, setInternalPeriod] = useState<'monthly' | 'annually'>('monthly');
    const billingPeriod = externalPeriod ?? internalPeriod;
    const handlePeriodChange = onPeriodChange ?? setInternalPeriod;

    const { data: session } = useSession();
    const isLoggedIn = !!session?.user;

    const [loadingTier, setLoadingTier] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCheckout = async (tier: PricingTier) => {
        setLoadingTier(tier.id);
        setError(null);
        try {
            await checkout(createCheckoutRequestForPlan(tier.slug));
        } catch (err) {
            console.error('Checkout error:', err);
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
            setLoadingTier(null);
        }
    };

    return (
        <section
            id="pricing"
            className="relative overflow-hidden py-24"
            style={{ background: 'var(--sw-paper-2)', fontFamily: 'var(--sw-font-sans)' }}
        >
            <div className="relative max-w-[1280px] mx-auto px-8">
                <div className="text-center max-w-2xl mx-auto">
                    <p
                        className="mb-3"
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 11,
                            color: 'var(--sw-rose-dk)',
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                        }}
                    >
                        {'// Pricing'}
                    </p>
                    <h2
                        className="m-0 text-balance"
                        style={{
                            fontFamily: 'var(--sw-font-sans)',
                            fontSize: 'clamp(32px, 3.6vw, 44px)',
                            fontWeight: 700,
                            lineHeight: 1.1,
                            color: 'var(--sw-ink)',
                        }}
                    >
                        Pick the plan that matches your project load.
                    </h2>
                    <p
                        className="mt-5"
                        style={{
                            fontFamily: 'var(--sw-font-body)',
                            fontSize: 17,
                            lineHeight: 1.6,
                            color: 'var(--sw-muted)',
                        }}
                    >
                        {PUBLIC_SAAS_TRIAL.summary} {PUBLIC_SAAS_TRIAL.detail}
                    </p>
                </div>

                {showToggle && (
                    <div className="mt-10 flex justify-center">
                        <div
                            className="inline-flex"
                            style={{
                                background: 'var(--sw-paper)',
                                border: '1px solid var(--sw-rule)',
                                padding: 2,
                            }}
                        >
                            {(['monthly', 'annually'] as const).map((period) => {
                                const active = billingPeriod === period;
                                return (
                                    <button
                                        key={period}
                                        type="button"
                                        onClick={() => handlePeriodChange(period)}
                                        className="transition-colors"
                                        style={{
                                            fontFamily: 'var(--sw-font-mono)',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            letterSpacing: '0.12em',
                                            textTransform: 'uppercase',
                                            padding: '8px 16px',
                                            background: active ? 'var(--sw-ink)' : 'transparent',
                                            color: active ? 'var(--sw-paper)' : 'var(--sw-muted)',
                                            border: 'none',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {period === 'monthly' ? 'Monthly' : 'Annually'}
                                        {period === 'annually' && (
                                            <span
                                                style={{
                                                    marginLeft: 8,
                                                    color: active ? 'var(--sw-rose)' : 'var(--sw-rose-dk)',
                                                }}
                                            >
                                                -20%
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {error && (
                    <div
                        className="mx-auto mt-6 max-w-lg p-3 text-center text-sm"
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            background: 'var(--sw-rose-tint)',
                            border: '1px solid var(--sw-rose)',
                            color: 'var(--sw-rose-dk)',
                        }}
                    >
                        {error}
                    </div>
                )}

                <div className="mt-14 grid max-w-lg mx-auto grid-cols-1 gap-6 lg:max-w-4xl lg:grid-cols-2">
                    {pricingTiers.map((tier) => (
                        <PricingCard
                            key={tier.id}
                            tier={tier}
                            billingPeriod={billingPeriod}
                            isLoggedIn={isLoggedIn}
                            loading={loadingTier === tier.id}
                            onCheckout={() => handleCheckout(tier)}
                        />
                    ))}
                </div>

                <p
                    className="mt-10 text-center"
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 11,
                        color: 'var(--sw-muted)',
                    }}
                >
                    All prices in AUD. GST included where applicable.
                    <br />
                    Need a custom enterprise plan?{' '}
                    <a
                        href="mailto:sales@sitewise.au"
                        style={{ color: 'var(--sw-rose-dk)', textDecoration: 'underline' }}
                    >
                        Contact us
                    </a>
                </p>
            </div>
        </section>
    );
}

function PricingCard({
    tier,
    billingPeriod,
    isLoggedIn,
    loading,
    onCheckout,
}: {
    tier: PricingTier;
    billingPeriod: 'monthly' | 'annually';
    isLoggedIn: boolean;
    loading: boolean;
    onCheckout: () => void;
}) {
    const price = billingPeriod === 'annually' ? tier.priceAnnually : tier.priceMonthly;

    return (
        <div
            className="flex flex-col p-8"
            style={{
                background: tier.highlighted ? 'var(--sw-ink)' : 'var(--sw-paper)',
                color: tier.highlighted ? 'var(--sw-paper)' : 'var(--sw-ink)',
                border: tier.highlighted
                    ? '1px solid var(--sw-rose)'
                    : '1px solid var(--sw-rule)',
                borderTop: tier.highlighted ? '3px solid var(--sw-rose)' : '1px solid var(--sw-rule)',
                position: 'relative',
            }}
        >
            {tier.highlighted && (
                <div
                    className="absolute top-0 right-0 px-2.5 py-1"
                    style={{
                        transform: 'translateY(-50%)',
                        background: 'var(--sw-rose)',
                        color: 'var(--sw-ink)',
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                    }}
                >
                    Most popular
                </div>
            )}

            <h3
                style={{
                    fontFamily: 'var(--sw-font-sans)',
                    fontSize: 22,
                    fontWeight: 700,
                }}
            >
                {tier.name}
            </h3>
            <p
                className="mt-1"
                style={{
                    fontFamily: 'var(--sw-font-body)',
                    fontSize: 13,
                    color: tier.highlighted ? 'rgba(232,228,218,0.65)' : 'var(--sw-muted)',
                }}
            >
                {tier.description}
            </p>

            <div className="mt-6 flex items-baseline gap-1">
                <span
                    style={{
                        fontFamily: 'var(--sw-font-sans)',
                        fontSize: 44,
                        fontWeight: 800,
                        fontVariantNumeric: 'tabular-nums',
                        color: tier.highlighted ? 'var(--sw-rose)' : 'var(--sw-ink)',
                    }}
                >
                    ${price}
                </span>
                <span
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 12,
                        color: tier.highlighted ? 'rgba(232,228,218,0.55)' : 'var(--sw-muted)',
                    }}
                >
                    /month
                </span>
            </div>
            {billingPeriod === 'annually' && (
                <p
                    className="mt-1"
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 11,
                        color: tier.highlighted ? 'rgba(232,228,218,0.45)' : 'var(--sw-muted)',
                    }}
                >
                    Billed as ${tier.priceAnnually * 12}/year
                </p>
            )}

            <ul className="mt-8 flex-1 space-y-2.5">
                {tier.marketingFeatures.map((feature) => (
                    <li
                        key={feature}
                        className="flex items-start gap-2.5"
                        style={{
                            fontFamily: 'var(--sw-font-body)',
                            fontSize: 14,
                            lineHeight: 1.5,
                            color: tier.highlighted ? 'rgba(232,228,218,0.85)' : 'var(--sw-ink)',
                        }}
                    >
                        <Check
                            className="flex-none mt-0.5"
                            style={{
                                width: 16,
                                height: 16,
                                color: tier.highlighted ? 'var(--sw-rose)' : 'var(--sw-rose-dk)',
                            }}
                        />
                        {feature}
                    </li>
                ))}
            </ul>

            {isLoggedIn ? (
                <button
                    onClick={onCheckout}
                    disabled={loading}
                    className="mt-8 inline-flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        padding: '12px 16px',
                        background: tier.highlighted ? 'var(--sw-rose)' : 'var(--sw-ink)',
                        color: tier.highlighted ? 'var(--sw-ink)' : 'var(--sw-paper)',
                        border: 'none',
                        cursor: 'pointer',
                    }}
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        'Upgrade now ->'
                    )}
                </button>
            ) : (
                <Link
                    href={`/register?plan=${tier.id}`}
                    className="mt-8 inline-flex items-center justify-center transition-opacity hover:opacity-90"
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        padding: '12px 16px',
                        background: tier.highlighted ? 'var(--sw-rose)' : 'var(--sw-ink)',
                        color: tier.highlighted ? 'var(--sw-ink)' : 'var(--sw-paper)',
                    }}
                >
                    {tier.cta} -&gt;
                </Link>
            )}
        </div>
    );
}
