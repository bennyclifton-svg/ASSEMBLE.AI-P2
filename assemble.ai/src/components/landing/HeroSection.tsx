/**
 * Hero Section Component
 * Main landing page hero with headline, subtext, and CTAs
 */

'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export function HeroSection() {
    return (
        <section className="relative overflow-hidden py-20 sm:py-32">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-transparent" />

            {/* Grid pattern */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
            />

            <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                    {/* Badge */}
                    <div className="mb-8 flex justify-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-400">
                            <Sparkles className="h-4 w-4" />
                            <span>AI-Powered Construction Management</span>
                        </div>
                    </div>

                    {/* Headline */}
                    <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
                        <span className="text-white">Build Smarter with</span>
                        <br />
                        <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                            Assemble.ai
                        </span>
                    </h1>

                    {/* Subtext */}
                    <p className="mt-6 text-lg leading-8 text-gray-400 sm:text-xl">
                        Streamline your construction projects with intelligent document management,
                        automated procurement, and AI-powered insights. Built specifically for
                        Australian construction firms.
                    </p>

                    {/* CTAs */}
                    <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <Link
                            href="/register"
                            className="group inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-all hover:bg-blue-500"
                        >
                            Start Free Trial
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                        <Link
                            href="/pricing"
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-6 py-3 font-semibold text-gray-300 transition-all hover:border-gray-600 hover:text-white"
                        >
                            View Pricing
                        </Link>
                    </div>

                    {/* Trust indicators */}
                    <p className="mt-8 text-sm text-gray-500">
                        No credit card required • 14-day free trial • Cancel anytime
                    </p>
                </div>

                {/* Hero image/dashboard preview placeholder */}
                <div className="mt-16">
                    <div className="relative mx-auto max-w-5xl">
                        <div className="rounded-xl border border-gray-800 bg-[#252526] p-4 shadow-2xl">
                            {/* Mock dashboard header */}
                            <div className="flex items-center gap-2 border-b border-gray-700 pb-4">
                                <div className="h-3 w-3 rounded-full bg-red-500" />
                                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                                <div className="h-3 w-3 rounded-full bg-green-500" />
                                <span className="ml-4 text-sm text-gray-500">assemble.ai dashboard</span>
                            </div>
                            {/* Mock dashboard content */}
                            <div className="mt-4 grid grid-cols-3 gap-4">
                                <div className="col-span-1 rounded-lg border border-gray-700 bg-[#1e1e1e] p-4">
                                    <div className="h-4 w-24 rounded bg-gray-700" />
                                    <div className="mt-2 h-3 w-16 rounded bg-gray-800" />
                                    <div className="mt-4 space-y-2">
                                        <div className="h-2 w-full rounded bg-gray-800" />
                                        <div className="h-2 w-3/4 rounded bg-gray-800" />
                                        <div className="h-2 w-1/2 rounded bg-gray-800" />
                                    </div>
                                </div>
                                <div className="col-span-2 rounded-lg border border-gray-700 bg-[#1e1e1e] p-4">
                                    <div className="h-4 w-32 rounded bg-gray-700" />
                                    <div className="mt-4 h-40 rounded bg-gradient-to-r from-blue-900/30 to-cyan-900/30" />
                                </div>
                            </div>
                        </div>
                        {/* Glow effect */}
                        <div className="absolute -inset-1 -z-10 rounded-xl bg-gradient-to-r from-blue-600/20 to-cyan-600/20 blur-xl" />
                    </div>
                </div>
            </div>
        </section>
    );
}
