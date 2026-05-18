import {
    BookOpen,
    GitCompare,
    ScrollText,
    MessageSquare,
    Mail,
    FileText,
    Folder,
} from 'lucide-react';
import { ScrollReveal } from './shared/ScrollReveal';

const KNOWLEDGE_CHIPS = [
    'Contract clauses · AS 4000 · AS 2124',
    'NCC compliance',
    'Programme logic',
    'Cost planning',
    'Procurement process',
    'Quality & completion',
];

type Capability = {
    code: string;
    title: string;
    body: string;
    icon: typeof GitCompare;
    accent: string;
};

const CAPABILITIES: Capability[] = [
    {
        code: '01',
        title: 'Tender evaluation',
        body: 'Score price and non-price submissions side by side. Catch scope gaps and qualifications.',
        icon: GitCompare,
        accent: 'var(--sw-rose-dk)',
    },
    {
        code: '02',
        title: 'Recommendation reports',
        body: 'Draft award reports from the evidence already captured in the workspace.',
        icon: ScrollText,
        accent: 'var(--sw-peach)',
    },
    {
        code: '03',
        title: 'RFI automation',
        body: 'Create, track, respond, and register. Time-bar alerts when responses are overdue.',
        icon: MessageSquare,
        accent: 'var(--sw-cyan)',
    },
    {
        code: '04',
        title: 'Email → register',
        body: 'Inbound emails classified, filed against the right project, and linked to the correspondence register.',
        icon: Mail,
        accent: 'var(--sw-lav)',
    },
    {
        code: '05',
        title: 'Document ingestion',
        body: 'Briefs, specs, and reports indexed for RAG search. Ask questions of the project record.',
        icon: FileText,
        accent: 'var(--sw-amber)',
    },
    {
        code: '06',
        title: 'File & drawing management',
        body: 'Versioned drawings, transmittals, and a single document register that stays current.',
        icon: Folder,
        accent: 'var(--sw-rose-dk)',
    },
];

export function CapabilitiesSection() {
    return (
        <section
            id="capabilities"
            className="relative overflow-hidden py-24"
            style={{ background: 'var(--sw-paper)', fontFamily: 'var(--sw-font-sans)' }}
        >
            <div className="relative max-w-[1280px] mx-auto px-8">
                <ScrollReveal>
                    <div className="max-w-3xl">
                        <p
                            className="mb-3 inline-flex items-center gap-2"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 11,
                                color: 'var(--sw-rose-dk)',
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                            }}
                        >
                            <BookOpen size={13} strokeWidth={1.8} aria-hidden="true" />
                            <span>{'// Grounded in seed knowledge'}</span>
                        </p>
                        <h2
                            className="m-0 text-balance"
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 'clamp(34px, 4.4vw, 54px)',
                                fontWeight: 800,
                                lineHeight: 1.05,
                                letterSpacing: '-0.03em',
                                color: 'var(--sw-ink)',
                            }}
                        >
                            Grounded in 15+ curated knowledge libraries.
                        </h2>
                        <p
                            className="mt-5 mb-0 max-w-[680px]"
                            style={{
                                fontFamily: 'var(--sw-font-body)',
                                fontSize: 17,
                                lineHeight: 1.6,
                                color: 'var(--sw-muted)',
                            }}
                        >
                            Every draft is grounded in standards, clauses, and process knowledge built into
                            the product. Your outputs read like they came from someone who&apos;s done this before.
                        </p>
                    </div>

                    <div className="mt-7 flex flex-wrap gap-2 max-w-[860px]">
                        {KNOWLEDGE_CHIPS.map((chip) => (
                            <span
                                key={chip}
                                className="inline-flex items-center px-3 py-1.5"
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 11,
                                    color: 'var(--sw-ink)',
                                    background: 'var(--sw-shell)',
                                    border: '1px solid var(--sw-rule)',
                                    letterSpacing: '0.04em',
                                }}
                            >
                                {chip}
                            </span>
                        ))}
                        <span
                            className="inline-flex items-center px-3 py-1.5"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 11,
                                color: 'var(--sw-muted)',
                                background: 'transparent',
                                border: '1px dashed var(--sw-rule)',
                                letterSpacing: '0.04em',
                            }}
                        >
                            + more
                        </span>
                    </div>
                </ScrollReveal>

                <ScrollReveal>
                    <p
                        className="mt-16 mb-5"
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            color: 'var(--sw-muted)',
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                        }}
                    >
                        And these too
                    </p>
                </ScrollReveal>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {CAPABILITIES.map((capability, index) => {
                        const Icon = capability.icon;
                        return (
                            <ScrollReveal key={capability.title} delay={index * 50}>
                                <article
                                    className="h-full p-5"
                                    style={{
                                        background: 'var(--sw-shell)',
                                        border: '1px solid var(--sw-rule)',
                                        borderTop: `3px solid ${capability.accent}`,
                                    }}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span
                                            style={{
                                                fontFamily: 'var(--sw-font-mono)',
                                                fontSize: 10,
                                                color: capability.accent,
                                                letterSpacing: '0.18em',
                                                fontWeight: 700,
                                            }}
                                        >
                                            C-{capability.code}
                                        </span>
                                        <Icon size={18} strokeWidth={1.8} style={{ color: capability.accent }} />
                                    </div>
                                    <h3
                                        className="mt-5 mb-3"
                                        style={{
                                            fontFamily: 'var(--sw-font-sans)',
                                            fontSize: 18,
                                            fontWeight: 700,
                                            lineHeight: 1.2,
                                            letterSpacing: '-0.015em',
                                            color: 'var(--sw-ink)',
                                        }}
                                    >
                                        {capability.title}
                                    </h3>
                                    <p
                                        className="m-0"
                                        style={{
                                            fontFamily: 'var(--sw-font-body)',
                                            fontSize: 14,
                                            lineHeight: 1.55,
                                            color: 'var(--sw-muted)',
                                        }}
                                    >
                                        {capability.body}
                                    </p>
                                </article>
                            </ScrollReveal>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
