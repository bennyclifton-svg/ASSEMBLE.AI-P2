'use client';

import { useEffect, useMemo, useState } from 'react';
import { Library, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SeedKnowledgeMarkdown } from '@/components/seed-knowledge/SeedKnowledgeMarkdown';

interface SeedSummary {
    slug: string;
    name: string;
    domainSlug: string;
    domainType: string;
    tags: string[];
    version: string;
    applicableProjectTypes: string[];
    applicableStates: string[];
    updatedAt: string;
}

interface SeedDocument {
    slug: string;
    frontmatter: {
        name: string;
        domainSlug: string;
        domainType: string;
        tags: string[];
        version: string;
        applicableProjectTypes: string[];
        applicableStates: string[];
    };
    body: string;
    updatedAt: string;
}

const ACCENTS = [
    'var(--sw-cyan)',
    'var(--sw-peach)',
    'var(--sw-rose)',
    'var(--sw-lav)',
    'var(--sw-green)',
    'var(--sw-amber)',
];

function accentFor(index: number): string {
    return ACCENTS[index % ACCENTS.length];
}

export default function SeedKnowledgeSettingsPage() {
    const [summaries, setSummaries] = useState<SeedSummary[] | null>(null);
    const [listError, setListError] = useState<string | null>(null);

    const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
    const [doc, setDoc] = useState<SeedDocument | null>(null);
    const [docError, setDocError] = useState<string | null>(null);
    const [docLoading, setDocLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const res = await fetch('/api/seed-knowledge');
                if (!res.ok) throw new Error(`Failed to load seed knowledge (${res.status})`);
                const data: SeedSummary[] = await res.json();
                if (cancelled) return;
                setSummaries(data);
                if (data.length > 0) setSelectedSlug(data[0].slug);
            } catch (err) {
                if (!cancelled) setListError(err instanceof Error ? err.message : 'Unknown error');
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!selectedSlug) {
            setDoc(null);
            return;
        }
        let cancelled = false;
        setDocLoading(true);
        setDocError(null);
        fetch(`/api/seed-knowledge/${selectedSlug}`)
            .then(async (res) => {
                if (!res.ok) throw new Error(`Failed to load (${res.status})`);
                return (await res.json()) as SeedDocument;
            })
            .then((data) => {
                if (cancelled) return;
                setDoc(data);
            })
            .catch((err) => {
                if (cancelled) return;
                setDocError(err instanceof Error ? err.message : 'Unknown error');
                setDoc(null);
            })
            .finally(() => {
                if (!cancelled) setDocLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [selectedSlug]);

    const accentBySlug = useMemo(() => {
        const map = new Map<string, string>();
        (summaries ?? []).forEach((s, i) => map.set(s.slug, accentFor(i)));
        return map;
    }, [summaries]);

    if (listError) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-semibold text-[var(--sw-ink)] mb-2 flex items-center gap-2">
                    <Library className="h-6 w-6" />
                    Seed Knowledge
                </h1>
                <div className="text-[var(--color-error)]">{listError}</div>
            </div>
        );
    }

    if (summaries === null) {
        return (
            <div className="p-8 flex items-center gap-2 text-[var(--sw-muted)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading seed knowledge…</span>
            </div>
        );
    }

    if (summaries.length === 0) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-semibold text-[var(--sw-ink)] mb-2 flex items-center gap-2">
                    <Library className="h-6 w-6" />
                    Seed Knowledge
                </h1>
                <p className="text-[var(--sw-muted)] mt-4">No seed knowledge libraries found.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <header className="px-8 pt-8 pb-4 border-b border-[var(--sw-rule)]">
                <h1 className="text-2xl font-semibold text-[var(--sw-ink)] flex items-center gap-2">
                    <Library className="h-6 w-6" />
                    Seed Knowledge
                </h1>
                <p className="text-sm text-[var(--sw-muted)] mt-1">
                    Reference markdown libraries that seed the AI&rsquo;s domain knowledge. Read-only.
                </p>
            </header>

            <div className="flex-1 min-h-0 overflow-auto p-6">
                <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
                    <section
                        className="min-w-0 self-start overflow-hidden"
                        aria-label="Seed knowledge libraries"
                        style={{
                            background: 'rgba(255, 255, 255, 0.72)',
                            border: '1px solid var(--sw-rule)',
                        }}
                    >
                        <div
                            className="grid h-8 grid-cols-[minmax(0,1fr)_64px] items-center border-b border-[var(--sw-rule-2)] px-3"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 10,
                                letterSpacing: '0.18em',
                                color: 'var(--sw-muted)',
                            }}
                        >
                            <span>library</span>
                            <span className="text-right">version</span>
                        </div>
                        <div>
                            {summaries.map((summary) => {
                                const isActive = summary.slug === selectedSlug;
                                const accent = accentBySlug.get(summary.slug) ?? 'var(--sw-cyan)';
                                return (
                                    <button
                                        key={summary.slug}
                                        type="button"
                                        onClick={() => setSelectedSlug(summary.slug)}
                                        className={cn(
                                            'grid w-full grid-cols-[minmax(0,1fr)_64px] items-center border-b border-l-2 border-[var(--sw-rule-2)] px-3 py-2 text-left transition-colors last:border-b-0',
                                            isActive
                                                ? 'border-l-4 bg-[var(--sw-ink)] text-[var(--sw-paper)] hover:bg-[var(--sw-ink)]'
                                                : 'bg-transparent hover:bg-[var(--sw-canvas)]'
                                        )}
                                        style={{
                                            borderLeftColor: accent,
                                            fontFamily: 'var(--sw-font-mono)',
                                        }}
                                        aria-pressed={isActive}
                                    >
                                        <span className="flex min-w-0 items-center gap-1.5">
                                            <span
                                                aria-hidden="true"
                                                className="h-1.5 w-1.5 shrink-0"
                                                style={{ background: accent }}
                                            />
                                            <span
                                                className={cn(
                                                    'truncate text-[11px] font-semibold',
                                                    isActive
                                                        ? 'text-[var(--sw-paper)]'
                                                        : 'text-[var(--sw-ink)]'
                                                )}
                                                title={summary.name}
                                            >
                                                {summary.name}
                                            </span>
                                        </span>
                                        <span
                                            className={cn(
                                                'truncate text-right text-[10px] tabular-nums',
                                                isActive
                                                    ? 'text-[rgba(232,228,218,0.72)]'
                                                    : 'text-[var(--sw-muted)]'
                                            )}
                                            title={summary.version}
                                        >
                                            {summary.version || '—'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <div className="min-w-0">
                        <section
                            className="min-w-0 overflow-hidden"
                            style={{
                                background: 'var(--sw-shell)',
                                border: '1px solid var(--sw-rule)',
                                borderLeft: doc
                                    ? `3px solid ${accentBySlug.get(doc.slug) ?? 'var(--sw-cyan)'}`
                                    : '1px solid var(--sw-rule)',
                            }}
                        >
                            <header
                                className="flex min-w-0 flex-wrap items-center justify-between gap-2 px-4 py-3"
                                style={{
                                    background: 'var(--sw-ink)',
                                    color: 'var(--sw-paper)',
                                }}
                            >
                                <span
                                    style={{
                                        fontFamily: 'var(--sw-font-mono)',
                                        fontSize: 10,
                                        letterSpacing: '0.18em',
                                        textTransform: 'uppercase',
                                        fontWeight: 600,
                                    }}
                                >
                                    {doc?.frontmatter.name ?? 'seed knowledge'}
                                </span>
                                {doc ? (
                                    <span
                                        className="truncate text-[10px]"
                                        style={{
                                            fontFamily: 'var(--sw-font-mono)',
                                            color: 'rgba(232,228,218,0.6)',
                                        }}
                                    >
                                        {doc.frontmatter.domainSlug} · v{doc.frontmatter.version}
                                    </span>
                                ) : null}
                            </header>

                            {docError ? (
                                <div className="p-6 text-[var(--color-error)]">{docError}</div>
                            ) : docLoading || !doc ? (
                                <div className="p-6 flex items-center gap-2 text-[var(--sw-muted)]">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Loading…</span>
                                </div>
                            ) : (
                                <>
                                    {(doc.frontmatter.tags?.length ||
                                        doc.frontmatter.applicableProjectTypes?.length ||
                                        doc.frontmatter.applicableStates?.length) ? (
                                        <div
                                            className="flex flex-wrap items-center gap-2 px-4 py-2"
                                            style={{ borderBottom: '1px solid var(--sw-rule-2)' }}
                                        >
                                            {doc.frontmatter.tags?.map((t) => (
                                                <span
                                                    key={`tag-${t}`}
                                                    className="px-2 py-0.5 text-[10px]"
                                                    style={{
                                                        fontFamily: 'var(--sw-font-mono)',
                                                        border: '1px solid var(--sw-rule)',
                                                        color: 'var(--sw-muted)',
                                                    }}
                                                >
                                                    {t}
                                                </span>
                                            ))}
                                            {doc.frontmatter.applicableProjectTypes?.map((t) => (
                                                <span
                                                    key={`pt-${t}`}
                                                    className="px-2 py-0.5 text-[10px]"
                                                    style={{
                                                        fontFamily: 'var(--sw-font-mono)',
                                                        border: '1px solid var(--sw-rule)',
                                                        color: 'var(--sw-cyan)',
                                                    }}
                                                >
                                                    {t}
                                                </span>
                                            ))}
                                            {doc.frontmatter.applicableStates?.map((s) => (
                                                <span
                                                    key={`st-${s}`}
                                                    className="px-2 py-0.5 text-[10px]"
                                                    style={{
                                                        fontFamily: 'var(--sw-font-mono)',
                                                        border: '1px solid var(--sw-rule)',
                                                        color: 'var(--sw-peach)',
                                                    }}
                                                >
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    ) : null}
                                    <div className="p-6">
                                        <SeedKnowledgeMarkdown source={doc.body} />
                                    </div>
                                </>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
