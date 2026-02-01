'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Receipt } from 'lucide-react';
import { SubscriptionCard } from './SubscriptionCard';
import { PricingCard } from './PricingCard';
import { CustomerPortalButton } from './CustomerPortalButton';
import { getAllPlans } from '@/lib/polar/plans';

interface SubscriptionData {
    currentPlanId: string;
    subscriptionStatus: string;
    currentPeriodEnd: number | null;
    cancelAtPeriodEnd: boolean;
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
    });
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const plans = getAllPlans();

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
            <div className="h-full flex items-center justify-center bg-[var(--color-bg-primary)]">
                <div className="animate-pulse text-[var(--color-text-muted)]">Loading billing...</div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
            {/* Header */}
            <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <div className="mx-auto max-w-4xl px-6 py-4">
                    <h1 className="text-2xl font-bold">Billing & Subscription</h1>
                </div>
            </div>

            <div className="mx-auto max-w-4xl px-6 py-8">
                {/* Success/Canceled Messages */}
                {showSuccess && (
                    <div className="mb-8 flex items-center gap-3 rounded-lg border border-[var(--color-accent-green)]/30 bg-[var(--color-accent-green)]/10 p-4">
                        <CheckCircle className="h-5 w-5 text-[var(--color-accent-green)]" />
                        <div>
                            <p className="font-medium text-[var(--color-accent-green)]">Payment successful!</p>
                            <p className="text-sm text-[var(--color-accent-green)]/80">
                                Your subscription has been activated. It may take a moment to reflect in your account.
                            </p>
                        </div>
                    </div>
                )}

                {showCanceled && (
                    <div className="mb-8 flex items-center gap-3 rounded-lg border border-[var(--color-accent-yellow)]/30 bg-[var(--color-accent-yellow)]/10 p-4">
                        <XCircle className="h-5 w-5 text-[var(--color-accent-yellow)]" />
                        <div>
                            <p className="font-medium text-[var(--color-accent-yellow)]">Checkout canceled</p>
                            <p className="text-sm text-[var(--color-accent-yellow)]/80">
                                No charges were made. You can try again whenever you're ready.
                            </p>
                        </div>
                    </div>
                )}

                {/* Current Subscription */}
                <section className="mb-12">
                    <h2 className="mb-4 text-lg font-semibold">Current Plan</h2>
                    <SubscriptionCard
                        planId={subscription.currentPlanId}
                        status={subscription.subscriptionStatus}
                        currentPeriodEnd={subscription.currentPeriodEnd}
                        cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
                    />
                </section>

                {/* Available Plans */}
                <section>
                    <h2 className="mb-4 text-lg font-semibold">Available Plans</h2>
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
                {subscription.currentPlanId !== 'free' && (
                    <section className="mt-12 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6">
                        <h2 className="mb-2 text-lg font-semibold">Need to make changes?</h2>
                        <p className="mb-4 text-[var(--color-text-muted)]">
                            Update your payment method, cancel your subscription, or view invoices through the customer portal.
                        </p>
                        <CustomerPortalButton />
                    </section>
                )}

                {/* Transaction History */}
                <section className="mt-12">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                        <Receipt className="h-5 w-5 text-[var(--color-text-muted)]" />
                        Transaction History
                    </h2>
                    {transactions.length === 0 ? (
                        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 text-center">
                            <p className="text-[var(--color-text-muted)]">No transactions yet</p>
                            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                Your payment history will appear here after your first purchase.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                            <table className="w-full">
                                <thead className="bg-[var(--color-bg-secondary)]">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-muted)]">Date</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-muted)]">Product</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-muted)]">Amount</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-muted)]">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border)]">
                                    {transactions.map((tx) => (
                                        <tr key={tx.id} className="bg-[var(--color-bg-primary)]">
                                            <td className="px-4 py-3 text-sm">
                                                {new Date(tx.createdAt * 1000).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {tx.productName || 'Subscription'}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                ${(tx.amountCents / 100).toFixed(2)} {(tx.currency || 'USD').toUpperCase()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                                    tx.status === 'completed'
                                                        ? 'bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)]'
                                                        : tx.status === 'refunded'
                                                            ? 'bg-[var(--color-accent-coral)]/10 text-[var(--color-accent-coral)]'
                                                            : 'bg-[var(--color-accent-yellow)]/10 text-[var(--color-accent-yellow)]'
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
                <p className="mt-8 text-center text-sm text-[var(--color-text-muted)]">
                    Questions about billing?{' '}
                    <a href="mailto:support@assemble.ai" className="text-[var(--color-accent-primary)] hover:underline">
                        Contact support
                    </a>
                </p>
            </div>
        </div>
    );
}
