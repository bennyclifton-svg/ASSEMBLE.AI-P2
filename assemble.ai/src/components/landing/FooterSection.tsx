/**
 * Footer Section Component
 * Site footer with links and legal info
 */

'use client';

import Link from 'next/link';

const navigation = {
    product: [
        { name: 'Features', href: '/#features' },
        { name: 'Pricing', href: '/pricing' },
        { name: 'Security', href: '/security' },
        { name: 'Changelog', href: '/changelog' },
    ],
    company: [
        { name: 'About', href: '/about' },
        { name: 'Blog', href: '/blog' },
        { name: 'Careers', href: '/careers' },
        { name: 'Contact', href: '/contact' },
    ],
    resources: [
        { name: 'Documentation', href: '/docs' },
        { name: 'Help Center', href: '/help' },
        { name: 'API Reference', href: '/api-docs' },
        { name: 'Status', href: '/status' },
    ],
    legal: [
        { name: 'Privacy Policy', href: '/privacy' },
        { name: 'Terms of Service', href: '/terms' },
        { name: 'Cookie Policy', href: '/cookies' },
    ],
};

export function FooterSection() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="border-t border-gray-800 bg-[#1a1a1a]">
            <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
                <div className="xl:grid xl:grid-cols-3 xl:gap-8">
                    {/* Brand */}
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                                <span className="text-lg font-bold text-white">A</span>
                            </div>
                            <span className="text-xl font-semibold text-white">Assemble.ai</span>
                        </Link>
                        <p className="text-sm text-gray-400">
                            AI-powered construction project management for Australian firms.
                            Streamline documents, procurement, and cost planning.
                        </p>
                        <div className="flex space-x-6">
                            {/* Social links would go here */}
                        </div>
                    </div>

                    {/* Links */}
                    <div className="mt-12 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
                        <div className="md:grid md:grid-cols-2 md:gap-8">
                            <div>
                                <h3 className="text-sm font-semibold text-white">Product</h3>
                                <ul className="mt-4 space-y-3">
                                    {navigation.product.map((item) => (
                                        <li key={item.name}>
                                            <Link
                                                href={item.href}
                                                className="text-sm text-gray-400 hover:text-white"
                                            >
                                                {item.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="mt-10 md:mt-0">
                                <h3 className="text-sm font-semibold text-white">Company</h3>
                                <ul className="mt-4 space-y-3">
                                    {navigation.company.map((item) => (
                                        <li key={item.name}>
                                            <Link
                                                href={item.href}
                                                className="text-sm text-gray-400 hover:text-white"
                                            >
                                                {item.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="md:grid md:grid-cols-2 md:gap-8">
                            <div>
                                <h3 className="text-sm font-semibold text-white">Resources</h3>
                                <ul className="mt-4 space-y-3">
                                    {navigation.resources.map((item) => (
                                        <li key={item.name}>
                                            <Link
                                                href={item.href}
                                                className="text-sm text-gray-400 hover:text-white"
                                            >
                                                {item.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="mt-10 md:mt-0">
                                <h3 className="text-sm font-semibold text-white">Legal</h3>
                                <ul className="mt-4 space-y-3">
                                    {navigation.legal.map((item) => (
                                        <li key={item.name}>
                                            <Link
                                                href={item.href}
                                                className="text-sm text-gray-400 hover:text-white"
                                            >
                                                {item.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-12 border-t border-gray-800 pt-8">
                    <p className="text-sm text-gray-500">
                        &copy; {currentYear} Assemble.ai Pty Ltd. All rights reserved.
                        <span className="mx-2">|</span>
                        ABN: XX XXX XXX XXX
                        <span className="mx-2">|</span>
                        Made in Australia
                    </p>
                </div>
            </div>
        </footer>
    );
}
