import {
    Check,
    FileSearch,
    ClipboardCheck,
    Target,
    Paperclip,
    Play,
} from 'lucide-react';
import { ScrollReveal } from './shared/ScrollReveal';

type Workflow = {
    code: string;
    title: string;
    description: string;
    command: string;
    commandIcon: typeof FileSearch;
    accent: string;
    cardTitle: string;
    cardStats: { label: string; value: string }[];
    cardLines: string[];
    duration: string;
};

const WORKFLOWS: Workflow[] = [
    {
        code: '01',
        title: 'Draft a tender from a one-line brief.',
        description:
            'Type the request. Sitewise drafts a complete RFT package — scope, deliverables, fee schedule, references — for your approval in seconds.',
        command: 'Create RFT for electrical consultant.',
        commandIcon: FileSearch,
        accent: 'var(--sw-rose-dk)',
        cardTitle: 'RFT — Electrical Consultant',
        cardStats: [
            { label: 'Documents', value: '14' },
            { label: 'Pages', value: '38' },
            { label: 'Refs', value: 'NCC · AS' },
        ],
        cardLines: [
            'Scope of services drafted',
            'Deliverables list assembled',
            'Fee schedule template attached',
        ],
        duration: '0:42',
    },
    {
        code: '02',
        title: 'Build a 20-activity program in seconds.',
        description:
            'Describe the project shape. Sitewise proposes a sequenced program with milestones and durations. Edit, approve, done.',
        command: 'Create a program of 20 activities, today to 2 years.',
        commandIcon: ClipboardCheck,
        accent: 'var(--sw-peach)',
        cardTitle: 'Master Programme — Draft',
        cardStats: [
            { label: 'Activities', value: '20' },
            { label: 'Milestones', value: '5' },
            { label: 'Duration', value: '104w' },
        ],
        cardLines: [
            'Start sequenced to today',
            'PC milestone set at +24 months',
            'Lead times applied to procurement',
        ],
        duration: '0:28',
    },
    {
        code: '03',
        title: 'Extract objectives from any document.',
        description:
            'Attach the project brief, scope, or DA conditions. One click extracts a full objectives list, grounded in curated knowledge libraries.',
        command: 'Extract objectives from attached brief.',
        commandIcon: Target,
        accent: 'var(--sw-cyan)',
        cardTitle: 'Project Objectives — Draft',
        cardStats: [
            { label: 'Objectives', value: '18' },
            { label: 'Source', value: 'brief.pdf' },
            { label: 'Refs', value: '4 libs' },
        ],
        cardLines: [
            'Functional objectives drafted',
            'Compliance objectives mapped to NCC',
            'Quality and program objectives included',
        ],
        duration: '0:36',
    },
];

export function WorkflowGallerySection() {
    return (
        <section
            id="workflows"
            className="relative overflow-hidden py-24"
            style={{ background: 'var(--sw-canvas)', fontFamily: 'var(--sw-font-sans)' }}
        >
            <div className="relative max-w-[1280px] mx-auto px-8">
                <ScrollReveal>
                    <p
                        className="mb-3"
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 11,
                            color: 'var(--sw-rose-dk)',
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                        }}
                    >
                        {'// Real workflows · real outputs'}
                    </p>
                    <h2
                        className="m-0 max-w-[860px] text-balance"
                        style={{
                            fontFamily: 'var(--sw-font-sans)',
                            fontSize: 'clamp(34px, 4.4vw, 54px)',
                            fontWeight: 800,
                            lineHeight: 1.04,
                            letterSpacing: '-0.03em',
                            color: 'var(--sw-ink)',
                        }}
                    >
                        Type a request. Approve the draft. Move on.
                    </h2>
                    <p
                        className="mt-5 max-w-[680px]"
                        style={{
                            fontFamily: 'var(--sw-font-body)',
                            fontSize: 17,
                            lineHeight: 1.6,
                            color: 'var(--sw-muted)',
                        }}
                    >
                        Every output lands in an approval card. You edit, approve, or reject. The record
                        only changes when you say so.
                    </p>
                </ScrollReveal>

                <div className="mt-14 space-y-14">
                    {WORKFLOWS.map((workflow, index) => (
                        <WorkflowRow key={workflow.code} workflow={workflow} reverse={index % 2 === 1} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function WorkflowRow({ workflow, reverse }: { workflow: Workflow; reverse: boolean }) {
    return (
        <ScrollReveal>
            <article
                className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center"
                style={{ direction: reverse ? 'rtl' : 'ltr' }}
            >
                <div style={{ direction: 'ltr' }}>
                    <DemoFrame workflow={workflow} />
                </div>
                <div style={{ direction: 'ltr' }}>
                    <WorkflowCopy workflow={workflow} />
                </div>
            </article>
        </ScrollReveal>
    );
}

function WorkflowCopy({ workflow }: { workflow: Workflow }) {
    const CommandIcon = workflow.commandIcon;
    return (
        <div>
            <div
                className="inline-flex items-center gap-2 mb-4"
                style={{
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 10,
                    color: workflow.accent,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                }}
            >
                <CommandIcon size={14} strokeWidth={1.8} style={{ color: workflow.accent }} />
                <span>Workflow {workflow.code}</span>
            </div>

            <h3
                className="m-0 mb-4"
                style={{
                    fontFamily: 'var(--sw-font-sans)',
                    fontSize: 'clamp(24px, 2.6vw, 34px)',
                    fontWeight: 800,
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                    color: 'var(--sw-ink)',
                }}
            >
                {workflow.title}
            </h3>

            <p
                className="m-0 mb-5"
                style={{
                    fontFamily: 'var(--sw-font-body)',
                    fontSize: 16,
                    lineHeight: 1.6,
                    color: 'var(--sw-muted)',
                    maxWidth: 540,
                }}
            >
                {workflow.description}
            </p>

            <div
                className="flex items-center gap-2 px-3 py-2.5 max-w-[540px]"
                style={{
                    background: 'var(--sw-paper)',
                    border: '1px solid var(--sw-rule)',
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 13,
                    color: 'var(--sw-ink)',
                }}
            >
                <span style={{ color: 'var(--sw-muted)' }}>&gt;</span>
                <span>{workflow.command}</span>
            </div>
        </div>
    );
}

function DemoFrame({ workflow }: { workflow: Workflow }) {
    return (
        <div
            className="overflow-hidden"
            style={{
                background: 'var(--sw-paper-2)',
                border: '1px solid var(--sw-rule-dk)',
                boxShadow: '0 30px 60px -20px rgba(14,16,20,0.28)',
            }}
        >
            <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{
                    borderBottom: '1px solid var(--sw-rule-dk)',
                    fontFamily: 'var(--sw-font-mono)',
                    fontSize: 10,
                }}
            >
                <span style={{ color: 'rgba(232,228,218,0.55)' }}>
                    demo · workflow {workflow.code}
                </span>
                <span
                    className="inline-flex items-center gap-1.5"
                    style={{ color: 'rgba(232,228,218,0.55)' }}
                >
                    <Play size={11} strokeWidth={2} style={{ color: 'var(--sw-amber)' }} />
                    <span>{workflow.duration}</span>
                </span>
            </div>

            <div className="p-5">
                {workflow.code === '03' && (
                    <div
                        className="mb-3 inline-flex items-center gap-2 px-2.5 py-1.5"
                        style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid var(--sw-rule-dk)',
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 11,
                            color: 'rgba(232,228,218,0.78)',
                        }}
                    >
                        <Paperclip size={12} strokeWidth={1.8} aria-hidden="true" />
                        <span>brief.pdf · attached</span>
                    </div>
                )}

                <div
                    className="overflow-hidden"
                    style={{
                        background: 'rgba(255,255,255,0.035)',
                        border: '1px solid var(--sw-rule-dk-2)',
                    }}
                >
                    <div
                        className="px-4 py-2.5 flex items-center justify-between"
                        style={{
                            borderBottom: '1px solid var(--sw-rule-dk)',
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            color: 'rgba(232,228,218,0.6)',
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                        }}
                    >
                        <span>Approval card</span>
                        <span style={{ color: 'var(--sw-amber)' }}>pending</span>
                    </div>

                    <div className="px-4 py-4 space-y-3">
                        <div
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 15,
                                fontWeight: 700,
                                color: '#E8E4DA',
                                letterSpacing: '-0.01em',
                            }}
                        >
                            {workflow.cardTitle}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {workflow.cardStats.map((stat) => (
                                <div
                                    key={stat.label}
                                    className="px-2.5 py-2"
                                    style={{
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid var(--sw-rule-dk)',
                                    }}
                                >
                                    <div
                                        style={{
                                            fontFamily: 'var(--sw-font-mono)',
                                            fontSize: 9,
                                            color: 'rgba(232,228,218,0.5)',
                                            letterSpacing: '0.16em',
                                            textTransform: 'uppercase',
                                            fontWeight: 700,
                                        }}
                                    >
                                        {stat.label}
                                    </div>
                                    <div
                                        className="mt-1"
                                        style={{
                                            fontFamily: 'var(--sw-font-sans)',
                                            fontSize: 13.5,
                                            fontWeight: 700,
                                            color: '#E8E4DA',
                                        }}
                                    >
                                        {stat.value}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <ul
                            className="space-y-1.5 pt-1"
                            style={{
                                fontFamily: 'var(--sw-font-body)',
                                fontSize: 12.5,
                                lineHeight: 1.5,
                                color: 'rgba(232,228,218,0.78)',
                            }}
                        >
                            {workflow.cardLines.map((line) => (
                                <li key={line} className="flex items-start gap-2">
                                    <Check
                                        size={13}
                                        strokeWidth={2}
                                        style={{ color: workflow.accent, marginTop: 2 }}
                                        aria-hidden="true"
                                    />
                                    <span>{line}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="flex items-center gap-2 pt-2">
                            <span
                                className="px-3 py-1.5 font-bold uppercase"
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 10,
                                    background: 'var(--sw-cta)',
                                    color: 'var(--sw-cta-fg)',
                                    letterSpacing: '0.12em',
                                }}
                            >
                                Approve
                            </span>
                            <span
                                className="px-3 py-1.5 uppercase"
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 10,
                                    color: '#E8E4DA',
                                    border: '1px solid var(--sw-rule-dk-2)',
                                    letterSpacing: '0.12em',
                                }}
                            >
                                Edit
                            </span>
                            <span
                                className="px-3 py-1.5 uppercase"
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 10,
                                    color: 'rgba(232,228,218,0.55)',
                                    letterSpacing: '0.12em',
                                }}
                            >
                                Reject
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
