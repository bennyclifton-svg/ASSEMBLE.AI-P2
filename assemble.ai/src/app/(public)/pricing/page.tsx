/**
 * Pricing Page
 * Dedicated pricing page with tier comparison.
 */

'use client';

import { NavBar } from '@/components/landing/NavBar';
import { PricingSection } from '@/components/landing/PricingSection';
import { FooterSection } from '@/components/landing/FooterSection';
import { PUBLIC_SAAS_TRIAL } from '@/lib/polar/plans';

export default function PricingPage() {
    return (
        <>
            <NavBar />
            <main className="pt-16">
                <PricingSection showToggle={true} />

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
            'Yes. Upgrade or downgrade at any time. Upgrades are prorated; downgrades take effect at the next billing cycle. Your project data and agent history move with the plan.',
    },
    {
        question: 'What payment methods do you accept?',
        answer:
            'All major credit cards (Visa, Mastercard, American Express). Annual plans also support bank transfer. Payments are processed securely through Polar.',
    },
    {
        question: 'Is there a free trial?',
        answer: `Yes. Starter and Professional both include a ${PUBLIC_SAAS_TRIAL.days}-day no-card trial with full feature access, capped at ${PUBLIC_SAAS_TRIAL.limits.maxProjects} project, ${PUBLIC_SAAS_TRIAL.limits.maxDocuments} documents, and ${PUBLIC_SAAS_TRIAL.limits.maxAiActions} AI actions.`,
    },
    {
        question: 'What happens to my data if I cancel?',
        answer:
            'Your projects stay accessible in read-only mode for 30 days after cancellation. Export at any time before then. After 30 days, project data is permanently deleted.',
    },
    {
        question: 'Which workflows do I get on each plan?',
        answer:
            'Starter includes the core document, procurement, and correspondence workflows for focused project use. Professional unlocks the full project agent and workflow set across unlimited projects.',
    },
    {
        question: 'Is Sitewise for head contractors?',
        answer:
            'No. Sitewise is built for the client side of the table: architects, project managers, and in-house developer teams running building projects on behalf of an owner.',
    },
];
