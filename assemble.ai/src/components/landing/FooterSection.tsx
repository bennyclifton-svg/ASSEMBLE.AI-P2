import Link from 'next/link';
import { SitewiseWordmark } from '@/components/brand/SitewiseWordmark';
import { footerContent } from './data/landing-data';

export function FooterSection() {
    return (
        <footer
            className="relative overflow-hidden"
            style={{
                background: 'var(--sw-ink)',
                color: '#E8E4DA',
                fontFamily: 'var(--sw-font-sans)',
                borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
        >
            <div className="relative max-w-[1280px] mx-auto px-8 py-12">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <SitewiseWordmark size={20} color="#E8E4DA" accent="var(--sw-rose)" />

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
                        className="flex items-center gap-3"
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 11,
                            color: 'rgba(232,228,218,0.45)',
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                        }}
                    >
                        <Link
                            href="/assessment"
                            className="hover:text-white transition-colors"
                            style={{ color: '#E8E4DA' }}
                        >
                            Health Check
                        </Link>
                        <span aria-hidden="true">·</span>
                        <span style={{ color: 'var(--sw-rose)' }}>● live</span>
                        <span aria-hidden="true">·</span>
                        <span>NSW</span>
                        <span aria-hidden="true">·</span>
                        <span>v2.4</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
