'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Mail, RotateCcw } from 'lucide-react';
import { NavBar } from '@/components/landing/NavBar';

type PillarId = 'design' | 'procure' | 'deliver';

type Question = {
    id: string;
    pillar: PillarId;
    text: string;
};

type Scores = {
    overall: number;
    pillars: Record<PillarId, number>;
    weakest: PillarId;
};

const PILLARS: Record<PillarId, { label: string; code: string; color: string; description: string }> = {
    design: {
        label: 'Design',
        code: '01',
        color: 'var(--sw-rose)',
        description: 'How well the brief, consultant team and design coordination set the project up to be built.',
    },
    procure: {
        label: 'Procure',
        code: '02',
        color: 'var(--sw-peach)',
        description: 'How tightly tenders are scoped, issued, evaluated and awarded.',
    },
    deliver: {
        label: 'Deliver',
        code: '03',
        color: 'var(--sw-cyan)',
        description: 'How contract administration, variations, claims and completion are controlled.',
    },
};

const QUESTIONS: Question[] = [
    // DESIGN (3)
    { id: 'design-brief',        pillar: 'design',  text: 'The project brief is documented and used to test design decisions.' },
    { id: 'design-consultants',  pillar: 'design',  text: 'Consultants are appointed against scopes of service that match the project, with clear deliverables per stage.' },
    { id: 'design-coordination', pillar: 'design',  text: 'Drawings, specifications and reports are coordinated and revision-controlled before issue.' },
    // PROCURE (3)
    { id: 'procure-scope',       pillar: 'procure', text: 'Tender packages have clear scope, inclusions, exclusions and evaluation criteria before issue.' },
    { id: 'procure-rfi',         pillar: 'procure', text: 'RFIs and addenda are managed through one register so every bidder has the same information.' },
    { id: 'procure-award',       pillar: 'procure', text: 'Award recommendations are prepared from captured evidence, not rebuilt manually at the end.' },
    // DELIVER (3)
    { id: 'deliver-ca',          pillar: 'deliver', text: 'Contract administration runs through a structured workflow — directions, instructions, notices, EOTs.' },
    { id: 'deliver-cost',        pillar: 'deliver', text: 'Variations, progress claims and contingency are tracked against the contract sum month-on-month.' },
    { id: 'deliver-completion',  pillar: 'deliver', text: 'Practical completion, defects and final account run from a known checklist, not a scramble.' },
];

const SCALE = [
    { value: 1, label: 'Not in place' },
    { value: 2, label: 'Inconsistent' },
    { value: 3, label: 'Partly controlled' },
    { value: 4, label: 'Mostly controlled' },
    { value: 5, label: 'Repeatable standard' },
];

const RISK_COPY: Record<PillarId, { diagnosis: string; actions: string[]; agent: string }> = {
    design: {
        diagnosis: 'Your project starts on the back foot. Weak briefs, late consultant scopes or uncoordinated documents lock in cost and rework before tender.',
        actions: [
            'Tighten the brief and use it to test every major design decision.',
            'Lock consultant scopes of service against the project shape and stage deliverables.',
            'Run a coordination check across drawings, specs and reports before each issue.',
        ],
        agent: 'Design Agent',
    },
    procure: {
        diagnosis: 'Your procurement is leaking value. Loose scopes, scattered RFIs or end-of-tender scrambling can change the award and the price.',
        actions: [
            'Standardise package scope, inclusions, exclusions and evaluation criteria before issue.',
            'Run RFIs and addenda through one register so all bidders see the same information.',
            'Draft the award recommendation from live evidence, not a memory exercise at the end.',
        ],
        agent: 'Procurement Agent',
    },
    deliver: {
        diagnosis: 'Your delivery is exposed. Ad-hoc CA, late variation tracking or a scramble at completion is where margin and time disappear.',
        actions: [
            'Run contract admin through a structured workflow — directions, instructions, notices, EOTs.',
            'Track variations, progress claims and contingency against the contract sum each month.',
            'Use a known checklist for practical completion, defects and final account.',
        ],
        agent: 'Delivery Agent',
    },
};

const ALWAYS_ON_AGENTS = ['Finance Agent', 'Program Agent', 'Correspondence Agent'];

export default function AssessmentPage() {
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const completedCount = Object.keys(answers).length;
    const isComplete = completedCount === QUESTIONS.length;

    const scores = useMemo(() => {
        if (!isComplete) return null;
        return calculateScores(answers);
    }, [answers, isComplete]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!scores || status === 'submitting') return;

        setStatus('submitting');
        setErrorMessage('');

        try {
            const res = await fetch('/api/assessment-waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    name: name || undefined,
                    source: 'assessment_result',
                    overallScore: scores.overall,
                    designScore:  scores.pillars.design,
                    procureScore: scores.pillars.procure,
                    deliverScore: scores.pillars.deliver,
                    weakestPillar: scores.weakest,
                    answers,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setErrorMessage(data.error ?? 'Something went wrong. Try again.');
                setStatus('error');
                return;
            }

            setStatus('success');
        } catch {
            setErrorMessage('Could not reach the server. Check your connection.');
            setStatus('error');
        }
    }

    function resetQuiz() {
        setAnswers({});
        setStatus('idle');
        setErrorMessage('');
    }

    return (
        <>
            <NavBar />
            <main style={{ fontFamily: 'var(--sw-font-sans)' }}>
                <section
                    className="relative overflow-hidden"
                    style={{ background: 'var(--sw-ink)', color: '#E8E4DA' }}
                >
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background:
                                'radial-gradient(1000px 620px at 82% -12%, rgba(248,101,122,0.08), transparent 60%),' +
                                'radial-gradient(760px 420px at -10% 105%, rgba(122,184,194,0.06), transparent 62%)',
                        }}
                    />
                    <div className="relative max-w-[1120px] mx-auto px-8 pt-[132px] pb-[74px]">
                        <div
                            className="inline-flex items-center gap-2 px-2.5 py-1 mb-6 font-semibold"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 11,
                                color: 'var(--sw-rose)',
                                background: 'rgba(248,101,122,0.10)',
                                border: '1px solid rgba(248,101,122,0.25)',
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                            }}
                        >
                            Project Health Check
                        </div>
                        <h1
                            className="m-0 text-balance max-w-[820px]"
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 'clamp(40px, 5.6vw, 70px)',
                                fontWeight: 800,
                                lineHeight: 1,
                                letterSpacing: '-0.035em',
                                color: 'var(--sw-paper)',
                            }}
                        >
                            Score your project before the next package goes out.
                        </h1>
                        <p
                            className="mt-6 max-w-[700px]"
                            style={{
                                fontFamily: 'var(--sw-font-body)',
                                fontSize: 18,
                                lineHeight: 1.58,
                                color: 'rgba(232,228,218,0.74)',
                            }}
                        >
                            Answer 9 questions across design, procurement and delivery. Get an instant score,
                            your weakest pillar, and the agent that closes the gap.
                        </p>
                    </div>
                </section>

                <section style={{ background: 'var(--sw-paper)' }}>
                    <div className="max-w-[1120px] mx-auto px-8 py-20">
                        <div className="grid grid-cols-1 lg:grid-cols-[0.72fr_1.28fr] gap-10 items-start">
                            <aside
                                className="lg:sticky lg:top-24"
                                style={{
                                    border: '1px solid var(--sw-rule)',
                                    background: 'var(--sw-paper-2)',
                                }}
                            >
                                <div className="p-5" style={{ borderBottom: '1px solid var(--sw-rule)' }}>
                                    <p
                                        className="m-0"
                                        style={{
                                            fontFamily: 'var(--sw-font-mono)',
                                            fontSize: 11,
                                            color: 'var(--sw-rose-dk)',
                                            letterSpacing: '0.18em',
                                            textTransform: 'uppercase',
                                            fontWeight: 700,
                                        }}
                                    >
                                        Progress
                                    </p>
                                    <div
                                        className="mt-4 h-2"
                                        style={{ background: 'white', border: '1px solid var(--sw-rule)' }}
                                    >
                                        <div
                                            className="h-full transition-all"
                                            style={{
                                                width: `${(completedCount / QUESTIONS.length) * 100}%`,
                                                background: 'var(--sw-rose)',
                                            }}
                                        />
                                    </div>
                                    <p
                                        className="mt-3 m-0"
                                        style={{
                                            fontFamily: 'var(--sw-font-mono)',
                                            fontSize: 12,
                                            color: 'var(--sw-muted)',
                                        }}
                                    >
                                        {completedCount} of {QUESTIONS.length} answered
                                    </p>
                                </div>

                                <div className="p-5 grid gap-3">
                                    {Object.keys(PILLARS).map((id) => (
                                        <PillarSummary key={id} pillarId={id as PillarId} answers={answers} />
                                    ))}
                                </div>
                            </aside>

                            <div>
                                {!scores ? (
                                    <QuestionList answers={answers} onAnswer={setAnswers} />
                                ) : (
                                    <ResultsPanel
                                        scores={scores}
                                        name={name}
                                        email={email}
                                        status={status}
                                        errorMessage={errorMessage}
                                        onNameChange={setName}
                                        onEmailChange={setEmail}
                                        onSubmit={handleSubmit}
                                        onReset={resetQuiz}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}

function QuestionList({
    answers,
    onAnswer,
}: {
    answers: Record<string, number>;
    onAnswer: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}) {
    return (
        <div className="grid gap-5">
            {QUESTIONS.map((question, index) => {
                const pillar = PILLARS[question.pillar];
                const selected = answers[question.id];

                return (
                    <article
                        key={question.id}
                        className="p-5"
                        style={{
                            background: 'white',
                            border: '1px solid var(--sw-rule)',
                            borderLeft: `3px solid ${pillar.color}`,
                        }}
                    >
                        <div className="flex items-start justify-between gap-5">
                            <div>
                                <p
                                    className="mb-2"
                                    style={{
                                        fontFamily: 'var(--sw-font-mono)',
                                        fontSize: 11,
                                        color: pillar.color,
                                        letterSpacing: '0.16em',
                                        textTransform: 'uppercase',
                                        fontWeight: 700,
                                    }}
                                >
                                    Q{String(index + 1).padStart(2, '0')} / {pillar.label}
                                </p>
                                <h2
                                    className="m-0"
                                    style={{
                                        fontFamily: 'var(--sw-font-sans)',
                                        fontSize: 21,
                                        lineHeight: 1.25,
                                        letterSpacing: '-0.015em',
                                        fontWeight: 700,
                                        color: 'var(--sw-ink)',
                                    }}
                                >
                                    {question.text}
                                </h2>
                            </div>
                            {selected ? (
                                <CheckCircle2
                                    size={22}
                                    strokeWidth={1.8}
                                    style={{ color: pillar.color, flex: '0 0 auto' }}
                                />
                            ) : null}
                        </div>

                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-5 gap-2">
                            {SCALE.map((option) => {
                                const active = selected === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() =>
                                            onAnswer((prev) => ({ ...prev, [question.id]: option.value }))
                                        }
                                        className="px-3 py-3 text-left transition-colors"
                                        style={{
                                            background: active ? 'var(--sw-ink)' : 'var(--sw-paper-2)',
                                            color: active ? 'var(--sw-paper)' : 'var(--sw-ink)',
                                            border: active ? '1px solid var(--sw-ink)' : '1px solid var(--sw-rule)',
                                            fontFamily: 'var(--sw-font-mono)',
                                            fontSize: 11,
                                            minHeight: 72,
                                        }}
                                    >
                                        <span
                                            className="block mb-1"
                                            style={{
                                                color: active ? pillar.color : 'var(--sw-muted)',
                                                fontWeight: 700,
                                            }}
                                        >
                                            {option.value}
                                        </span>
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    </article>
                );
            })}
        </div>
    );
}

function PillarSummary({ pillarId, answers }: { pillarId: PillarId; answers: Record<string, number> }) {
    const pillar = PILLARS[pillarId];
    const pillarQuestions = QUESTIONS.filter((question) => question.pillar === pillarId);
    const answered = pillarQuestions.filter((question) => answers[question.id]).length;

    return (
        <div>
            <div className="flex items-center justify-between gap-3">
                <span
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 11,
                        color: pillar.color,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                    }}
                >
                    {pillar.code} / {pillar.label}
                </span>
                <span
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 11,
                        color: 'var(--sw-muted)',
                    }}
                >
                    {answered}/{pillarQuestions.length}
                </span>
            </div>
            <p
                className="mt-1 m-0"
                style={{
                    fontFamily: 'var(--sw-font-body)',
                    fontSize: 13,
                    lineHeight: 1.45,
                    color: 'var(--sw-muted)',
                }}
            >
                {pillar.description}
            </p>
        </div>
    );
}

function ResultsPanel({
    scores,
    name,
    email,
    status,
    errorMessage,
    onNameChange,
    onEmailChange,
    onSubmit,
    onReset,
}: {
    scores: Scores;
    name: string;
    email: string;
    status: 'idle' | 'submitting' | 'success' | 'error';
    errorMessage: string;
    onNameChange: (value: string) => void;
    onEmailChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    onReset: () => void;
}) {
    const weakestPillar = PILLARS[scores.weakest];
    const risk = RISK_COPY[scores.weakest];

    return (
        <div
            className="overflow-hidden"
            style={{ background: 'white', border: '1px solid var(--sw-rule)' }}
        >
            <div
                className="p-8"
                style={{ background: 'var(--sw-ink)', color: 'var(--sw-paper)' }}
            >
                <p
                    className="mb-3"
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 11,
                        color: 'var(--sw-rose)',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                    }}
                >
                    Instant result
                </p>
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div>
                        <h2
                            className="m-0"
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 'clamp(34px, 4.5vw, 56px)',
                                lineHeight: 1,
                                fontWeight: 800,
                                letterSpacing: '-0.035em',
                            }}
                        >
                            {scores.overall}/100
                        </h2>
                        <p
                            className="mt-3 m-0"
                            style={{
                                fontFamily: 'var(--sw-font-body)',
                                fontSize: 17,
                                lineHeight: 1.55,
                                color: 'rgba(232,228,218,0.74)',
                            }}
                        >
                            Your weakest pillar is{' '}
                            <strong style={{ color: weakestPillar.color }}>{weakestPillar.label}</strong>.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onReset}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 font-bold uppercase tracking-[0.12em] transition-colors hover:bg-white/5"
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 11,
                            color: '#E8E4DA',
                            border: '1px solid rgba(255,255,255,0.14)',
                            background: 'transparent',
                        }}
                    >
                        <RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
                        Retake
                    </button>
                </div>
            </div>

            <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.entries(PILLARS).map(([id, pillar]) => (
                        <div
                            key={id}
                            className="p-4"
                            style={{
                                background: 'var(--sw-paper-2)',
                                border: '1px solid var(--sw-rule)',
                                borderTop: `3px solid ${pillar.color}`,
                            }}
                        >
                            <p
                                className="m-0"
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 11,
                                    color: pillar.color,
                                    letterSpacing: '0.16em',
                                    textTransform: 'uppercase',
                                    fontWeight: 700,
                                }}
                            >
                                {pillar.label}
                            </p>
                            <p
                                className="mt-3 mb-0"
                                style={{
                                    fontFamily: 'var(--sw-font-sans)',
                                    fontSize: 34,
                                    fontWeight: 800,
                                    lineHeight: 1,
                                    color: 'var(--sw-ink)',
                                }}
                            >
                                {scores.pillars[id as PillarId]}
                            </p>
                        </div>
                    ))}
                </div>

                <div
                    className="mt-8 p-6"
                    style={{
                        background: 'var(--sw-rose-tint)',
                        border: '1px solid var(--sw-rose)',
                        borderLeft: '4px solid var(--sw-rose)',
                    }}
                >
                    <h3
                        className="m-0"
                        style={{
                            fontFamily: 'var(--sw-font-sans)',
                            fontSize: 24,
                            fontWeight: 800,
                            color: 'var(--sw-ink)',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        What this means
                    </h3>
                    <p
                        className="mt-3 mb-0"
                        style={{
                            fontFamily: 'var(--sw-font-body)',
                            fontSize: 16,
                            lineHeight: 1.6,
                            color: 'var(--sw-ink)',
                        }}
                    >
                        {risk.diagnosis}
                    </p>
                    <ul className="mt-5 grid gap-2">
                        {risk.actions.map((action) => (
                            <li
                                key={action}
                                className="flex items-start gap-3"
                                style={{
                                    fontFamily: 'var(--sw-font-body)',
                                    fontSize: 15,
                                    lineHeight: 1.5,
                                    color: 'var(--sw-ink)',
                                }}
                            >
                                <span
                                    className="mt-2 flex-none"
                                    style={{ width: 6, height: 6, background: 'var(--sw-rose)' }}
                                    aria-hidden="true"
                                />
                                {action}
                            </li>
                        ))}
                    </ul>
                    <div
                        className="mt-6 p-4"
                        style={{
                            background: 'var(--sw-rose-tint)',
                            border: '1px solid var(--sw-rose-dk)',
                        }}
                    >
                        <p
                            className="m-0"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 10,
                                color: 'var(--sw-rose-dk)',
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                            }}
                        >
                            Meet the agent
                        </p>
                        <p
                            className="mt-2 m-0"
                            style={{
                                fontFamily: 'var(--sw-font-body)',
                                fontSize: 15,
                                lineHeight: 1.55,
                                color: 'var(--sw-ink)',
                            }}
                        >
                            Sitewise&apos;s <strong>{RISK_COPY[scores.weakest].agent}</strong> closes this gap.
                            It works alongside your always-on team: {ALWAYS_ON_AGENTS.join(' · ')}.
                        </p>
                    </div>
                </div>

                <form onSubmit={onSubmit} className="mt-8">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                        <label className="block">
                            <span
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 11,
                                    color: 'var(--sw-muted)',
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                Name
                            </span>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => onNameChange(e.target.value)}
                                disabled={status === 'submitting'}
                                className="mt-1.5 w-full px-4 py-3 outline-none transition-colors focus:border-[var(--sw-rose)]"
                                style={{
                                    fontFamily: 'var(--sw-font-body)',
                                    fontSize: 15,
                                    background: 'white',
                                    border: '1px solid var(--sw-rule)',
                                    color: 'var(--sw-ink)',
                                }}
                                placeholder="Optional"
                            />
                        </label>
                        <label className="block">
                            <span
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 11,
                                    color: 'var(--sw-muted)',
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                Work email
                            </span>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => onEmailChange(e.target.value)}
                                disabled={status === 'submitting'}
                                className="mt-1.5 w-full px-4 py-3 outline-none transition-colors focus:border-[var(--sw-rose)]"
                                style={{
                                    fontFamily: 'var(--sw-font-body)',
                                    fontSize: 15,
                                    background: 'white',
                                    border: '1px solid var(--sw-rule)',
                                    color: 'var(--sw-ink)',
                                }}
                                placeholder="you@firm.com.au"
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={status === 'submitting' || !email}
                            className="inline-flex items-center justify-center gap-2 px-5 py-3 font-bold uppercase tracking-[0.12em] transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 12,
                                background: 'var(--sw-rose)',
                                color: 'var(--sw-ink)',
                                border: 'none',
                                minHeight: 50,
                            }}
                        >
                            <Mail size={15} strokeWidth={2} aria-hidden="true" />
                            {status === 'submitting' ? 'Saving' : 'Send plan'}
                        </button>
                    </div>

                    {status === 'success' ? (
                        <p
                            className="mt-4"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 12,
                                color: 'var(--sw-rose-dk)',
                            }}
                        >
                            Saved. Your full action plan is queued for follow-up.
                        </p>
                    ) : null}

                    {status === 'error' ? (
                        <p
                            className="mt-4"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 12,
                                color: 'var(--sw-rose-dk)',
                            }}
                        >
                            {errorMessage}
                        </p>
                    ) : null}
                </form>

                <Link
                    href="/"
                    className="mt-8 inline-flex items-center gap-2 transition-colors hover:text-[var(--sw-rose-dk)]"
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 12,
                        color: 'var(--sw-muted)',
                    }}
                >
                    Back to Sitewise
                    <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                </Link>
            </div>
        </div>
    );
}

function calculateScores(answers: Record<string, number>): Scores {
    const pillars = (Object.keys(PILLARS) as PillarId[]).reduce(
        (acc, pillar) => {
            const pillarQuestions = QUESTIONS.filter((question) => question.pillar === pillar);
            const total = pillarQuestions.reduce((sum, question) => sum + (answers[question.id] ?? 0), 0);
            acc[pillar] = Math.round((total / (pillarQuestions.length * 5)) * 100);
            return acc;
        },
        {} as Record<PillarId, number>,
    );

    const totalScore = QUESTIONS.reduce((sum, question) => sum + (answers[question.id] ?? 0), 0);
    const overall = Math.round((totalScore / (QUESTIONS.length * 5)) * 100);
    const weakest = (Object.keys(pillars) as PillarId[]).sort((a, b) => pillars[a] - pillars[b])[0];

    return { overall, pillars, weakest };
}
