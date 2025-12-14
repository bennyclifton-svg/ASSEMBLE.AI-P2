/**
 * Navigation Bar Component
 * Top navigation for public pages
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const navigation = [
    { name: 'Features', href: '/#features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'About', href: '/about' },
];

export function NavBar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-800/50 bg-[#1e1e1e]/80 backdrop-blur-lg">
            <nav
                className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8"
                aria-label="Global"
            >
                {/* Logo */}
                <div className="flex lg:flex-1">
                    <Link href="/" className="-m-1.5 flex items-center gap-2 p-1.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                            <span className="text-lg font-bold text-white">A</span>
                        </div>
                        <span className="text-xl font-semibold text-white">Assemble.ai</span>
                    </Link>
                </div>

                {/* Mobile menu button */}
                <div className="flex lg:hidden">
                    <button
                        type="button"
                        className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-400"
                        onClick={() => setMobileMenuOpen(true)}
                    >
                        <span className="sr-only">Open main menu</span>
                        <Menu className="h-6 w-6" aria-hidden="true" />
                    </button>
                </div>

                {/* Desktop navigation */}
                <div className="hidden lg:flex lg:gap-x-8">
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="text-sm font-medium text-gray-300 transition-colors hover:text-white"
                        >
                            {item.name}
                        </Link>
                    ))}
                </div>

                {/* Desktop auth buttons */}
                <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
                    <Link
                        href="/login"
                        className="text-sm font-medium text-gray-300 transition-colors hover:text-white"
                    >
                        Sign in
                    </Link>
                    <Link
                        href="/register"
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
                    >
                        Get Started
                    </Link>
                </div>
            </nav>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="lg:hidden">
                    <div className="fixed inset-0 z-50" />
                    <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-[#1e1e1e] px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-800">
                        <div className="flex items-center justify-between">
                            <Link href="/" className="-m-1.5 flex items-center gap-2 p-1.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                                    <span className="text-lg font-bold text-white">A</span>
                                </div>
                                <span className="text-xl font-semibold text-white">Assemble.ai</span>
                            </Link>
                            <button
                                type="button"
                                className="-m-2.5 rounded-md p-2.5 text-gray-400"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <span className="sr-only">Close menu</span>
                                <X className="h-6 w-6" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="mt-6 flow-root">
                            <div className="-my-6 divide-y divide-gray-800">
                                <div className="space-y-2 py-6">
                                    {navigation.map((item) => (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className="-mx-3 block rounded-lg px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            {item.name}
                                        </Link>
                                    ))}
                                </div>
                                <div className="py-6">
                                    <Link
                                        href="/login"
                                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        Sign in
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="-mx-3 mt-2 block rounded-lg bg-blue-600 px-3 py-2.5 text-center text-base font-medium text-white hover:bg-blue-500"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        Get Started
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
