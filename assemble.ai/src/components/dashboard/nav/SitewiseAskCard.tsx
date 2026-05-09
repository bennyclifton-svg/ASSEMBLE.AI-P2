'use client';

import { Sparkles } from 'lucide-react';

interface SitewiseAskCardProps {
    placeholder?: string;
    onActivate?: () => void;
}

export function SitewiseAskCard({
    placeholder = 'Ask sitewise…',
    onActivate,
}: SitewiseAskCardProps) {
    return (
        <button
            type="button"
            onClick={onActivate}
            title={placeholder}
            aria-label={placeholder}
            className="sitewise-ask-card p-3 w-full text-left transition-colors hover:bg-white"
            style={{ background: 'white', border: '1px solid var(--sw-rule)' }}
        >
            <span
                className="sitewise-ask-icon-grid hidden h-7 w-7 shrink-0 items-center justify-center border"
                style={{
                    color: '#C93F6A',
                    background: 'rgba(201, 63, 106, 0.14)',
                    borderColor: '#C93F6A',
                }}
            >
                <Sparkles className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <div className="sitewise-ask-label" style={{
                fontFamily: 'var(--sw-font-mono)',
                fontSize: 10,
                color: 'var(--sw-rose-dk)',
                letterSpacing: '0.1em',
                marginBottom: 8,
            }}>
                {'// ASK'}
            </div>
            <div className="sitewise-ask-copy" style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--sw-ink)' }}>
                {placeholder}
            </div>
            <div className="sitewise-ask-footer mt-2 flex justify-between items-center">
                <span style={{
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 10,
                    color: 'var(--sw-muted)',
                }}>
                    ⌘K
                </span>
                <span style={{
                    background: 'var(--sw-rose)',
                    color: 'var(--sw-ink)',
                    padding: '2px 6px',
                    fontSize: 10,
                    fontFamily: 'var(--sw-font-mono)',
                    fontWeight: 700,
                }}>
                    ↵
                </span>
            </div>
        </button>
    );
}
