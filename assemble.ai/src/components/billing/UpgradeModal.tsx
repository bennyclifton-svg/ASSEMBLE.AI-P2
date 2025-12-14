/**
 * Upgrade Modal Component
 * Shown when free-tier users try to access premium features
 */

'use client';

import { useState } from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    featureName: string;
    featureDescription?: string;
    requiredPlan?: 'starter' | 'professional';
}

export function UpgradeModal({
    isOpen,
    onClose,
    featureName,
    featureDescription,
    requiredPlan = 'starter',
}: UpgradeModalProps) {
    if (!isOpen) return null;

    const planName = requiredPlan === 'professional' ? 'Professional' : 'Starter';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md rounded-xl border border-gray-800 bg-[#252526] p-6 shadow-2xl">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-gray-400 hover:text-white"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Icon */}
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/10">
                    <Sparkles className="h-6 w-6 text-blue-400" />
                </div>

                {/* Title */}
                <h2 className="text-xl font-semibold text-white">
                    Upgrade to {planName}
                </h2>

                {/* Description */}
                <p className="mt-2 text-gray-400">
                    <strong className="text-white">{featureName}</strong> is a premium feature.
                    {featureDescription && (
                        <span className="mt-1 block">{featureDescription}</span>
                    )}
                </p>

                {/* Benefits */}
                <div className="mt-6 rounded-lg bg-[#1e1e1e] p-4">
                    <p className="text-sm font-medium text-white">
                        What you&apos;ll get with {planName}:
                    </p>
                    <ul className="mt-3 space-y-2">
                        {requiredPlan === 'starter' ? (
                            <>
                                <BenefitItem>5 active projects</BenefitItem>
                                <BenefitItem>1,000 documents</BenefitItem>
                                <BenefitItem>AI document processing</BenefitItem>
                                <BenefitItem>100 AI queries/month</BenefitItem>
                                <BenefitItem>Procurement automation</BenefitItem>
                            </>
                        ) : (
                            <>
                                <BenefitItem>Unlimited projects</BenefitItem>
                                <BenefitItem>Unlimited documents</BenefitItem>
                                <BenefitItem>Unlimited AI queries</BenefitItem>
                                <BenefitItem>Cost planning module</BenefitItem>
                                <BenefitItem>TRR report generation</BenefitItem>
                                <BenefitItem>Priority support</BenefitItem>
                            </>
                        )}
                    </ul>
                </div>

                {/* Actions */}
                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:border-gray-600 hover:text-white"
                    >
                        Maybe Later
                    </button>
                    <Link
                        href={`/billing?upgrade=${requiredPlan}`}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
                        onClick={onClose}
                    >
                        Upgrade Now
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                {/* Trial note */}
                <p className="mt-4 text-center text-xs text-gray-500">
                    14-day free trial included. Cancel anytime.
                </p>
            </div>
        </div>
    );
}

function BenefitItem({ children }: { children: React.ReactNode }) {
    return (
        <li className="flex items-center gap-2 text-sm text-gray-300">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600/20">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            </span>
            {children}
        </li>
    );
}

// Hook for using the upgrade modal
export function useUpgradeModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [feature, setFeature] = useState<{ name: string; description: string; plan: 'starter' | 'professional' }>({ name: '', description: '', plan: 'starter' });

    const showUpgradeModal = (
        featureName: string,
        featureDescription?: string,
        requiredPlan: 'starter' | 'professional' = 'starter'
    ) => {
        setFeature({ name: featureName, description: featureDescription || '', plan: requiredPlan });
        setIsOpen(true);
    };

    const closeModal = () => setIsOpen(false);

    return {
        isOpen,
        feature,
        showUpgradeModal,
        closeModal,
    };
}
