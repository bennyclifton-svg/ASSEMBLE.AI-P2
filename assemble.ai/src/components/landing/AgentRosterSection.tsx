import {
    Compass,
    PencilRuler,
    GavelIcon,
    HardHat,
    Calculator,
    Calendar,
    Mail,
} from 'lucide-react';
import { ScrollReveal } from './shared/ScrollReveal';

type Agent = {
    code: string;
    name: string;
    role: string;
    icon: typeof Compass;
    accent: string;
};

const PHASE_AGENTS: Agent[] = [
    {
        code: '01',
        name: 'Feasibility Agent',
        role: 'Site, planning, environmental DD, stakeholders.',
        icon: Compass,
        accent: 'var(--sw-rose)',
    },
    {
        code: '02',
        name: 'Design Agent',
        role: 'Brief, consultants, design review, DA.',
        icon: PencilRuler,
        accent: 'var(--sw-peach)',
    },
    {
        code: '03',
        name: 'Procurement Agent',
        role: 'Tender, evaluation, contract execution.',
        icon: GavelIcon,
        accent: 'var(--sw-cyan)',
    },
    {
        code: '04',
        name: 'Delivery Agent',
        role: 'Contract admin, variations, claims, defects.',
        icon: HardHat,
        accent: 'var(--sw-lav)',
    },
];

const ALWAYS_ON_AGENTS: Agent[] = [
    {
        code: '05',
        name: 'Finance Agent',
        role: 'Cost plan, cashflow, contingency, monthly reporting.',
        icon: Calculator,
        accent: 'var(--sw-amber)',
    },
    {
        code: '06',
        name: 'Program Agent',
        role: 'Master programme, milestones, delays, EOT support.',
        icon: Calendar,
        accent: 'var(--sw-amber)',
    },
    {
        code: '07',
        name: 'Correspondence Agent',
        role: 'Emails, letters, RFIs, transmittals, register.',
        icon: Mail,
        accent: 'var(--sw-amber)',
    },
];

export function AgentRosterSection() {
    return (
        <section
            id="team"
            className="relative overflow-hidden py-24"
            style={{ background: 'var(--sw-paper-2)', fontFamily: 'var(--sw-font-sans)' }}
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
                        // Your client-side team
                    </p>
                    <h2
                        className="m-0 max-w-[820px] text-balance"
                        style={{
                            fontFamily: 'var(--sw-font-sans)',
                            fontSize: 'clamp(34px, 4.4vw, 54px)',
                            fontWeight: 800,
                            lineHeight: 1.04,
                            letterSpacing: '-0.03em',
                            color: 'var(--sw-ink)',
                        }}
                    >
                        Seven specialists. One workspace. Always on.
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
                        Sitewise gives you a virtual team built for the client side of the table.
                        Four agents move with the project. Three more work across every phase.
                    </p>
                </ScrollReveal>

                <ScrollReveal>
                    <div
                        className="mt-12"
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            color: 'var(--sw-muted)',
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            marginBottom: 12,
                        }}
                    >
                        Phase team
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {PHASE_AGENTS.map((agent) => (
                            <AgentCard key={agent.code} agent={agent} />
                        ))}
                    </div>
                </ScrollReveal>

                <ScrollReveal>
                    <div
                        className="mt-10"
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            color: 'var(--sw-muted)',
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            marginBottom: 12,
                        }}
                    >
                        Always-on team
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {ALWAYS_ON_AGENTS.map((agent) => (
                            <AgentCard key={agent.code} agent={agent} />
                        ))}
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
}

function AgentCard({ agent }: { agent: Agent }) {
    const Icon = agent.icon;
    return (
        <div
            className="p-5"
            style={{
                background: 'var(--sw-paper)',
                border: '1px solid var(--sw-rule)',
            }}
        >
            <div className="flex items-center gap-2.5">
                <Icon
                    size={18}
                    strokeWidth={1.8}
                    style={{ color: agent.accent }}
                    aria-hidden="true"
                />
                <span
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        color: agent.accent,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                    }}
                >
                    {agent.code}
                </span>
            </div>
            <div
                className="mt-3"
                style={{
                    fontFamily: 'var(--sw-font-sans)',
                    fontSize: 17,
                    fontWeight: 700,
                    color: 'var(--sw-ink)',
                    letterSpacing: '-0.01em',
                }}
            >
                {agent.name}
            </div>
            <div
                className="mt-2"
                style={{
                    fontFamily: 'var(--sw-font-body)',
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: 'var(--sw-muted)',
                }}
            >
                {agent.role}
            </div>
        </div>
    );
}
