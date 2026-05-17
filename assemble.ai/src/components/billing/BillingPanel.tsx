'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Receipt } from 'lucide-react';
import { SubscriptionCard } from './SubscriptionCard';
import { PricingCard } from './PricingCard';
import { CustomerPortalButton } from './CustomerPortalButton';
import { getPublicPlans } from '@/lib/polar/plans';

interface SubscriptionData {
    currentPlanId: string;
    subscriptionStatus: string;
    currentPeriodEnd: number | null;
    cancelAtPeriodEnd: boolean;
    hasPolarCustomer: boolean;
    readOnly?: boolean;
}

interface Transaction {
    id: string;
    userId: string;
    productId: string | null;
    polarOrderId: string | null;
    amountCents: number;
    currency: string | null;
    status: string;
    createdAt: number;
    productName?: string;
}

export function BillingPanel() {
    const searchParams = useSearchParams();
    const showSuccess = searchParams.get('success') === 'true';
    const showCanceled = searchParams.get('canceled') === 'true';

    const [subscription, setSubscription] = useState<SubscriptionData>({
        currentPlanId: 'free',
        subscriptionStatus: 'free',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        hasPolarCustomer: false,
        readOnly: false,
    });
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const plans = getPublicPlans();

    useEffect(() => {
        async function fetchData() {
            try {
                const [subRes, txRes] = await Promise.all([
                    fetch('/api/billing/subscription'),
                    fetch('/api/billing/transactions'),
                ]);

                if (subRes.ok) {
                    const subData = await subRes.json();
                    setSubscription(subData);
                }

                if (txRes.ok) {
                    const txData = await txRes.json();
                    setTransactions(txData.transactions || []);
                }
            } catch (error) {
                console.error('[BillingPanel] Error fetching data:', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-[var(--sw-paper)]">
                <div className="animate-pulse font-mono text-[var(--sw-muted)]">Loading billing...</div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto bg-transparent text-[var(--sw-ink)]">
            <div className="sitewise-page-frame max-w-4xl">
                <div className="sitewise-page-header">
                    <div>
                        <div className="sitewise-page-kicker">account / billing</div>
                        <h1 className="mt-2">Billing & Subscription</h1>
                        <p className="sitewise-page-subtitle">
                            Current plan, upgrade paths, subscription portal, and transaction history.
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                        <span className="sitewise-status-pill">{subscription.subscriptionStatus}</span>
                        <span className="sitewise-status-pill sitewise-status-pill-dark">
                            {subscription.currentPlanId}
                        </span>
                    </div>
                </div>
                {/* Success/Canceled Messages */}
                {showSuccess && (
                    <div className="sitewise-card mb-8 flex items-center gap-3 border-l-[3px] border-l-[#5c7a4a] p-4">
                        <CheckCircle className="h-5 w-5 text-[#5c7a4a]" />
                        <div>
                            <p className="font-medium text-[#4b653c]">Payment successful!</p>
                            <p className="text-sm text-[var(--sw-muted)]">
                                Your subscription has been activated. It may take a moment to reflect in your account.
                            </p>
                        </div>
                    </div>
                )}

                {showCanceled && (
                    <div className="sitewise-card mb-8 flex items-center gap-3 border-l-[3px] border-l-[var(--sw-amber)] p-4">
                        <XCircle className="h-5 w-5 text-[var(--sw-amber)]" />
                        <div>
                            <p className="font-medium text-[#8a5a16]">Checkout canceled</p>
                            <p className="text-sm text-[var(--sw-muted)]">
                                No charges were made. You can try again whenever you are ready.
                            </p>
                        </div>
                    </div>
                )}

                {/* Current Subscription */}
                <section className="mb-12">
                    <div className="sitewise-section-label mb-4">Current Plan</div>
                    <SubscriptionCard
                        planId={subscription.currentPlanId}
                        status={subscription.subscriptionStatus}
                        currentPeriodEnd={subscription.currentPeriodEnd}
                        cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
                    />
                </section>

                {subscription.readOnly && (
                    <section className="sitewise-card mb-12 border-l-[3px] border-l-[var(--sw-rose)] p-6">
                        <div className="sitewise-section-label mb-2">Read-only state</div>
                        <p className="text-sm text-[var(--sw-muted)]">
                            Export and viewing stay available. Upgrade or update billing to create, edit, upload, and run AI actions again.
                        </p>
                    </section>
                )}

                {/* Available Plans */}
                <section>
                    <div className="sitewise-section-label mb-4">Available Plans</div>
                    <div className="grid gap-6 md:grid-cols-3">
                        {plans.map((plan) => (
                            <PricingCard
                                key={plan.id}
                                plan={plan}
                                isCurrentPlan={plan.id === subscription.currentPlanId}
                                currentPlanId={subscription.currentPlanId}
                            />
                        ))}
                    </div>
                </section>

                {/* Manage Subscription Link */}
                {subscription.hasPolarCustomer && (
                    <section className="sitewise-card mt-12 p-6">
                        <div className="sitewise-section-label mb-2">Need to make changes?</div>
                        <p className="mb-4 text-[var(--sw-muted)]">
                            Update your payment method, cancel your subscription, or view invoices through the customer portal.
                        </p>
                        <CustomerPortalButton />
                    </section>
                )}

                {/* Transaction History */}
                <section className="mt-12">
                    <div className="sitewise-section-label mb-4 flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-[var(--sw-muted)]" />
                        Transaction History
                    </div>
                    {transactions.length === 0 ? (
                        <div className="sitewise-card p-6 text-center">
                            <p className="text-[var(--sw-muted)]">No transactions yet</p>
                            <p className="mt-1 text-sm text-[var(--sw-muted)]">
                                Your payment history will appear here after your first purchase.
                            </p>
                        </div>
                    ) : (
                        <div className="sitewise-card overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr>
                                        <th className="px-4 py-3 text-left">Date</th>
                                        <th className="px-4 py-3 text-left">Product</th>
                                        <th className="px-4 py-3 text-left">Amount</th>
                                        <th className="px-4 py-3 text-left">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--sw-rule-2)]">
                                    {transactions.map((tx) => (
                                        <tr key={tx.id}>
                                            <td className="px-4 py-3 text-sm">
                                                {new Date(tx.createdAt * 1000).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {tx.productName || 'Subscription'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-[var(--role-money)] font-mono">
                                                ${(tx.amountCents / 100).toFixed(2)} {(tx.currency || 'USD').toUpperCase()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`sitewise-chip ${
                                                    tx.status === 'completed'
                                                        ? 'sitewise-chip-green'
                                                        : tx.status === 'refunded'
                                                            ? 'sitewise-chip-rose'
                                                            : 'sitewise-chip-amber'
                                                }`}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* Help text */}
                <p className="mt-8 text-center text-sm text-[var(--sw-muted)]">
                    Questions about billing?{' '}
                    <a href="mailto:support@sitewise.au" className="text-[var(--color-accent-primary)] hover:underline">
                        Contact support
                    </a>
                </p>
            </div>
        </div>
    );
}
