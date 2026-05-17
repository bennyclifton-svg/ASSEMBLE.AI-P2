import Link from 'next/link';
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Cpu,
    Database,
    HardDrive,
    KeyRound,
    Layers,
    RefreshCw,
    Server,
    Workflow,
    Wrench,
    type LucideIcon,
} from 'lucide-react';
import {
    APPLIANCE_COMPONENT_ORDER,
    getApplianceHealth,
    type ApplianceComponentId,
    type ApplianceStatus,
} from '@/lib/health/appliance-health';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<ApplianceStatus, {
    label: string;
    Icon: LucideIcon;
    badge: string;
    border: string;
    dot: string;
}> = {
    healthy: {
        label: 'ready',
        Icon: CheckCircle2,
        badge: 'border-[#9BC8A5] bg-[#EFF8F1] text-[#19572C]',
        border: 'border-[#9BC8A5]',
        dot: 'bg-[#348A4D]',
    },
    degraded: {
        label: 'needs setup',
        Icon: AlertTriangle,
        badge: 'border-[#E3BE64] bg-[#FFF7E1] text-[#654900]',
        border: 'border-[#E3BE64]',
        dot: 'bg-[#B98213]',
    },
    unhealthy: {
        label: 'not ready',
        Icon: AlertTriangle,
        badge: 'border-[#D88980] bg-[#FFF0EE] text-[#7C2117]',
        border: 'border-[#D88980]',
        dot: 'bg-[#B83A2E]',
    },
};

const COMPONENT_ICONS: Record<ApplianceComponentId, LucideIcon> = {
    app: Activity,
    database: Database,
    rag: Layers,
    redis: Server,
    workers: Workflow,
    storage: HardDrive,
    migrations: Wrench,
    modelProviders: KeyRound,
};

function formattedCheckedAt(value: string) {
    return new Intl.DateTimeFormat('en-AU', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

export default async function SetupStatusPage() {
    const health = await getApplianceHealth();
    const overallTone = STATUS_TONE[health.status];
    const OverallIcon = overallTone.Icon;

    return (
        <div className="sitewise-control-surface min-h-screen bg-[var(--sw-paper)] text-[var(--sw-ink)]">
            <header className="border-b border-[var(--sw-rule)] bg-[var(--sw-paper-2)]">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center border border-[var(--sw-rule)] bg-white">
                            <Cpu className="h-4 w-4 text-[var(--sw-ink)]" />
                        </span>
                        <div>
                            <div className="sitewise-page-kicker">sitewise appliance</div>
                            <h1 className="text-xl font-semibold leading-tight">Setup Status</h1>
                        </div>
                    </div>
                    <Link href="/setup/status" prefetch={false} className="sitewise-button sitewise-button-muted">
                        <RefreshCw className="h-3.5 w-3.5" />
                        Refresh
                    </Link>
                </div>
            </header>

            <main className="sitewise-graphic-field min-h-[calc(100vh-73px)]">
                <div className="sitewise-page-frame">
                    <section className={cn('sitewise-card mb-4 border-l-4 p-5', overallTone.border)}>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="max-w-3xl">
                                <div className="sitewise-page-kicker">current readiness</div>
                                <div className="mt-3 flex flex-wrap items-center gap-3">
                                    <span className={cn('inline-flex items-center gap-2 border px-3 py-1.5 font-mono text-xs font-semibold uppercase', overallTone.badge)}>
                                        <OverallIcon className="h-4 w-4" />
                                        {overallTone.label}
                                    </span>
                                    <span className="sitewise-status-pill">version {health.version}</span>
                                    <span className="sitewise-status-pill">{health.environment}</span>
                                </div>
                                <p className="mt-4 max-w-2xl font-mono text-sm leading-6 text-[var(--sw-muted)]">
                                    {health.status === 'healthy'
                                        ? 'All appliance checks are passing.'
                                        : health.status === 'degraded'
                                            ? 'The app is running, but setup needs attention before all project workflows are reliable.'
                                            : 'One or more critical services are not ready.'}
                                </p>
                            </div>
                            <div className="text-right font-mono text-xs text-[var(--sw-muted)]">
                                <div>Checked</div>
                                <div className="mt-1 text-[var(--sw-ink)]">{formattedCheckedAt(health.checkedAt)}</div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                        {(['healthy', 'degraded', 'unhealthy'] as ApplianceStatus[]).map((status) => {
                            const tone = STATUS_TONE[status];
                            return (
                                <div key={status} className="sitewise-card flex items-center justify-between p-4">
                                    <div className="flex items-center gap-3">
                                        <span className={cn('h-2.5 w-2.5', tone.dot)} />
                                        <span className="font-mono text-xs font-semibold uppercase text-[var(--sw-muted)]">
                                            {tone.label}
                                        </span>
                                    </div>
                                    <span className="font-mono text-2xl font-semibold text-[var(--sw-ink)]">
                                        {health.summary[status]}
                                    </span>
                                </div>
                            );
                        })}
                    </section>

                    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {APPLIANCE_COMPONENT_ORDER.map((id) => {
                            const component = health.components[id];
                            const tone = STATUS_TONE[component.status];
                            const ComponentIcon = COMPONENT_ICONS[id];

                            return (
                                <article key={id} className={cn('sitewise-card border-t-4 p-4', tone.border)}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--sw-rule)] bg-[var(--sw-paper)]">
                                                <ComponentIcon className="h-4 w-4" />
                                            </span>
                                            <div className="min-w-0">
                                                <h2 className="truncate text-sm font-semibold">{component.label}</h2>
                                                {component.latencyMs !== undefined ? (
                                                    <p className="mt-0.5 font-mono text-[11px] text-[var(--sw-muted)]">
                                                        {component.latencyMs} ms
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                        <span className={cn('shrink-0 border px-2 py-1 font-mono text-[10px] font-semibold uppercase', tone.badge)}>
                                            {tone.label}
                                        </span>
                                    </div>
                                    <p className="mt-4 min-h-[4.5rem] font-mono text-xs leading-5 text-[var(--sw-muted)]">
                                        {component.message}
                                    </p>
                                </article>
                            );
                        })}
                    </section>
                </div>
            </main>
        </div>
    );
}
