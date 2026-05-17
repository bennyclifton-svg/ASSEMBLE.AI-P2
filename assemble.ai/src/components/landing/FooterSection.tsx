import Link from 'next/link';
import Image from 'next/image';
import { footerContent } from './data/landing-data';

const FOOTER_LINKS = [
    { href: '/pricing', label: 'Pricing' },
    { href: '/terms', label: 'Terms' },
    { href: '/privacy', label: 'Privacy' },
    { href: '/contact', label: 'Contact' },
    { href: '/support', label: 'Support' },
    { href: '/assessment', label: 'Health Check' },
];

export function FooterSection() {
    return (
        <footer
            className="relative overflow-hidden"
            style={{
                background: 'var(--sw-paper-2)',
                color: '#E8E4DA',
                fontFamily: 'var(--sw-font-sans)',
                borderTop: '1px solid var(--sw-rule-dk)',
            }}
        >
            <div className="relative max-w-[1280px] mx-auto px-8 py-12">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <Link
                        href="/"
                        aria-label="Sitewise home"
                        className="flex items-center hover:opacity-80 transition-opacity"
                    >
                        <Image
                            src="/images/sitewise-logo-light.png"
                            alt="Sitewise"
                            width={1038}
                            height={554}
                            style={{ height: 32, width: 'auto', display: 'block' }}
                        />
                    </Link>

                    <p
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 11,
                            color: 'rgba(232,228,218,0.45)',
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                        }}
                    >
                        © {footerContent.copyright}
                    </p>

                    <div
                        className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2"
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 11,
                            color: 'rgba(232,228,218,0.55)',
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                        }}
                    >
                        {FOOTER_LINKS.map((link, index) => (
                            <span key={link.href} className="inline-flex items-center gap-x-3">
                                <Link
                                    href={link.href}
                                    className="hover:text-white transition-colors"
                                    style={{ color: '#E8E4DA' }}
                                >
                                    {link.label}
                                </Link>
                                {index < FOOTER_LINKS.length - 1 && <span aria-hidden="true">·</span>}
                            </span>
                        ))}
                        <span aria-hidden="true">·</span>
                        <span style={{ color: 'var(--sw-rose)' }}>● live</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
