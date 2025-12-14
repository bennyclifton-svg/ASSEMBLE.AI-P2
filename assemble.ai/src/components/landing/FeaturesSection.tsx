/**
 * Features Section Component
 * Highlights key product features
 */

'use client';

import { FileText, Users, BarChart3, Zap, Shield, Clock } from 'lucide-react';

const features = [
    {
        name: 'Intelligent Document Management',
        description: 'Automatically organize, version, and track all project documents. AI-powered OCR and search across your entire document library.',
        icon: FileText,
    },
    {
        name: 'Procurement Automation',
        description: 'Streamline tender processes with automated RFT generation, evaluation scoring, and recommendation reports.',
        icon: Users,
    },
    {
        name: 'Cost Planning & Tracking',
        description: 'Real-time budget tracking, variation management, and invoice processing with AI-powered data extraction.',
        icon: BarChart3,
    },
    {
        name: 'AI-Powered Insights',
        description: 'Ask questions about your projects in natural language. Get instant answers backed by your project documents.',
        icon: Zap,
    },
    {
        name: 'Australian Compliance',
        description: 'Built for Australian construction standards. GST handling, local regulatory awareness, and AUD-first design.',
        icon: Shield,
    },
    {
        name: 'Real-Time Collaboration',
        description: 'Work together with your team in real-time. All changes sync instantly across devices and users.',
        icon: Clock,
    },
];

export function FeaturesSection() {
    return (
        <section className="py-20 sm:py-32" id="features">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-base font-semibold leading-7 text-blue-400">
                        Everything you need
                    </h2>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                        Built for Construction Professionals
                    </p>
                    <p className="mt-6 text-lg leading-8 text-gray-400">
                        Comprehensive tools designed specifically for the Australian construction industry.
                        From small firms to enterprise projects.
                    </p>
                </div>

                <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                    <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                        {features.map((feature) => (
                            <div key={feature.name} className="flex flex-col">
                                <dt className="flex items-center gap-x-3 text-lg font-semibold leading-7 text-white">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10 ring-1 ring-blue-600/30">
                                        <feature.icon className="h-5 w-5 text-blue-400" aria-hidden="true" />
                                    </div>
                                    {feature.name}
                                </dt>
                                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-400">
                                    <p className="flex-auto">{feature.description}</p>
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        </section>
    );
}
