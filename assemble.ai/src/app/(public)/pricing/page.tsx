/**
 * Pricing Page
 * Dedicated pricing page with tier comparison
 */

'use client';

import { useState } from 'react';
import { NavBar } from '@/components/landing/NavBar';
import { PricingSection } from '@/components/landing/PricingSection';
import { FooterSection } from '@/components/landing/FooterSection';

export default function PricingPage() {
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annually'>('monthly');

    return (
        <>
            <NavBar />
            <main className="pt-16">
                <PricingSection
                    billingPeriod={billingPeriod}
                    onPeriodChange={setBillingPeriod}
                    showToggle={true}
                />

                {/* FAQ Section */}
                <section className="border-t border-gray-800 py-20">
                    <div className="mx-auto max-w-3xl px-6 lg:px-8">
                        <h2 className="text-center text-2xl font-bold text-white">
                            Frequently Asked Questions
                        </h2>
                        <dl className="mt-10 space-y-6">
                            {faqs.map((faq) => (
                                <div key={faq.question} className="rounded-lg border border-gray-800 p-6">
                                    <dt className="font-semibold text-white">{faq.question}</dt>
                                    <dd className="mt-2 text-gray-400">{faq.answer}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </section>
            </main>
            <FooterSection />
        </>
    );
}

const faqs = [
    {
        question: 'Can I change my plan later?',
        answer:
            'Yes, you can upgrade or downgrade your plan at any time. When upgrading, you\'ll be charged the prorated difference. When downgrading, the new rate will apply at the start of your next billing cycle.',
    },
    {
        question: 'What payment methods do you accept?',
        answer:
            'We accept all major credit cards (Visa, Mastercard, American Express) and bank transfers for annual plans. All payments are processed securely through our payment partner.',
    },
    {
        question: 'Is there a free trial?',
        answer:
            'Yes! All paid plans come with a 14-day free trial. No credit card required to start. You\'ll only be charged after the trial ends if you decide to continue.',
    },
    {
        question: 'What happens to my data if I cancel?',
        answer:
            'Your data remains accessible in read-only mode for 30 days after cancellation. After that, it will be permanently deleted. You can export your data at any time before then.',
    },
    {
        question: 'Do you offer discounts for non-profits or education?',
        answer:
            'Yes, we offer special pricing for registered non-profit organizations and educational institutions. Contact our sales team for more information.',
    },
    {
        question: 'Is GST included in the prices?',
        answer:
            'Yes, all prices shown include GST for Australian customers. For customers outside Australia, local taxes may apply.',
    },
];
