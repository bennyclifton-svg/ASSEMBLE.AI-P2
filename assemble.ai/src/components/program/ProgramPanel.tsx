'use client';

import React, { useState, useMemo, createContext, useContext, useEffect } from 'react';
import { useProgram, buildActivityTree } from '@/lib/hooks/use-program';
import { ProgramToolbar } from './ProgramToolbar';
import { ProgramTable } from './ProgramTable';
import type { ZoomLevel } from '@/types/program';

// Context for refetch function
const RefetchContext = createContext<() => void>(() => {});
export const useRefetch = () => useContext(RefetchContext);

const ZOOM_STORAGE_KEY = 'program-zoom-level';

interface ProgramPanelProfileData {
    subclass?: string[];
    scaleData?: Record<string, number>;
    complexity?: Record<string, string | string[]>;
    workScope?: string[];
}

interface ProgramPanelProps {
    projectId: string;
    projectName?: string;
    buildingClass?: string | null;
    projectType?: string | null;
    profileData?: ProgramPanelProfileData;
}

const muted = 'var(--sw-muted)';

function slugifyProjectName(projectName: string): string {
    return projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

function deriveProfileCompletion(args: {
    buildingClass?: string | null;
    projectType?: string | null;
    profile?: ProgramPanelProfileData;
}): number {
    const { buildingClass, projectType, profile } = args;
    let filled = 0;
    if (buildingClass) filled++;
    if (projectType) filled++;
    if ((profile?.subclass?.length ?? 0) > 0) filled++;
    if (profile?.scaleData?.gfa_sqm != null) filled++;
    if (profile?.scaleData?.storeys != null) filled++;
    if (profile?.scaleData?.units != null) filled++;
    if (profile?.complexity && Object.keys(profile.complexity).length >= 5) filled++;
    if ((profile?.workScope?.length ?? 0) > 0) filled++;
    return Math.round((filled / 8) * 100);
}

function formatProgrammeDate(date: Date): string {
    return date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
}

function ProgrammeBreadcrumb({
    projectName,
    activeCrumb,
}: {
    projectName: string;
    activeCrumb: string;
}) {
    return (
        <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2"
            style={{
                fontFamily: 'var(--sw-font-mono)',
                fontSize: 12,
                color: muted,
            }}
        >
            <span>{slugifyProjectName(projectName)}</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span style={{ color: 'var(--sw-ink)' }}>PROGRAMME</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span style={{ color: 'var(--sw-ink)' }}>{activeCrumb}</span>
        </nav>
    );
}

function StatusPill({ label, tone }: { label: string; tone?: 'dark' }) {
    const isDark = tone === 'dark';
    return (
        <span
            style={{
                fontFamily: 'var(--sw-font-mono)',
                fontSize: 11,
                padding: '4px 10px',
                background: isDark ? 'var(--sw-ink)' : 'var(--sw-paper)',
                border: isDark ? '1px solid var(--sw-ink)' : '1px solid var(--sw-rule)',
                color: isDark ? 'var(--sw-paper)' : 'var(--sw-ink)',
                letterSpacing: '0.02em',
            }}
        >
            {label}
        </span>
    );
}

export function ProgramPanel({
    projectId,
    projectName = 'project',
    buildingClass,
    projectType,
    profileData,
}: ProgramPanelProps) {
    const { data, isLoading, error, refetch } = useProgram(projectId);
    const activities = data?.activities;
    const milestones = data?.milestones;
    const dependencies = data?.dependencies;
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(ZOOM_STORAGE_KEY);
            if (stored === 'week' || stored === 'month') {
                return stored;
            }
        }
        return 'week';
    });

    // Persist zoom level to localStorage
    useEffect(() => {
        localStorage.setItem(ZOOM_STORAGE_KEY, zoomLevel);
    }, [zoomLevel]);

    // Build hierarchical tree from flat activities
    const activityTree = useMemo(() => {
        if (!activities) return [];
        return buildActivityTree(activities);
    }, [activities]);

    // Calculate date range from activities
    const dateRange = useMemo(() => {
        const now = new Date();

        if (!activities) {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 24, 0);
            return { start, end };
        }

        const dates: Date[] = [];
        for (const activity of activities) {
            if (activity.startDate) dates.push(new Date(activity.startDate));
            if (activity.endDate) dates.push(new Date(activity.endDate));
        }
        for (const milestone of milestones || []) {
            if (milestone.date) dates.push(new Date(milestone.date));
        }

        if (dates.length === 0) {
            // Default to current month + 24 months
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 24, 0);
            return { start, end };
        }

        const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
        let maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

        // Ensure timeline extends at least 18 months from today
        const eighteenMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 18, 0);
        if (maxDate < eighteenMonthsFromNow) {
            maxDate = eighteenMonthsFromNow;
        }

        // Add padding (1 week before and 1 month after)
        minDate.setDate(minDate.getDate() - 7);
        maxDate.setMonth(maxDate.getMonth() + 1);

        return { start: minDate, end: maxDate };
    }, [activities, milestones]);

    const activityCount = activities?.length ?? 0;
    const scheduledCount = activities?.filter((activity) => activity.startDate && activity.endDate).length ?? 0;
    const milestoneCount = milestones?.length ?? 0;
    const dependencyCount = dependencies?.length ?? 0;
    const profileCompletionPct = useMemo(
        () => deriveProfileCompletion({ buildingClass, projectType, profile: profileData }),
        [buildingClass, projectType, profileData]
    );
    const programmeSubtitle = activityCount > 0
        ? `${activityCount} activities / ${scheduledCount} scheduled / ${milestoneCount} milestones / ${dependencyCount} dependencies / ${formatProgrammeDate(dateRange.start)} - ${formatProgrammeDate(dateRange.end)}`
        : 'No activities yet / add an activity or insert a template';
    const activeCrumb = zoomLevel === 'week' ? 'WEEK VIEW' : 'MONTH VIEW';

    if (isLoading && !data) {
        return (
            <div
                className="flex h-full items-center justify-center"
                style={{
                    background: 'var(--sw-paper)',
                    color: muted,
                    fontFamily: 'var(--sw-font-mono)',
                }}
            >
                <div className="text-sm">Loading programme...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div
                className="flex h-full items-center justify-center"
                style={{
                    background: 'var(--sw-paper)',
                    color: 'var(--sw-rose-dk)',
                    fontFamily: 'var(--sw-font-mono)',
                }}
            >
                <div className="text-sm">Failed to load programme</div>
            </div>
        );
    }

    return (
        <RefetchContext.Provider value={refetch}>
            <div
                className="program-workspace flex h-full min-h-0 flex-col overflow-hidden"
                style={{ background: 'var(--sw-paper)' }}
            >
                <header className="shrink-0 px-2 pt-2">
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <ProgrammeBreadcrumb projectName={projectName} activeCrumb={activeCrumb} />
                        <div className="flex shrink-0 gap-1.5">
                            <StatusPill label={`profile: ${profileCompletionPct}% complete`} />
                            <StatusPill label="stage: detail design" tone="dark" />
                        </div>
                    </div>

                    <div className="mb-3 flex items-end justify-between gap-3">
                        <div className="min-w-0">
                            <h1
                                style={{
                                    fontFamily: 'var(--sw-font-sans)',
                                    fontSize: 30,
                                    fontWeight: 700,
                                    letterSpacing: '-0.025em',
                                    margin: 0,
                                    lineHeight: 1.1,
                                    color: 'var(--sw-ink)',
                                }}
                            >
                                Programme
                            </h1>
                            <div
                                className="truncate"
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 12,
                                    color: muted,
                                    marginTop: 4,
                                    minHeight: 18,
                                }}
                            >
                                {programmeSubtitle}
                            </div>
                        </div>

                        <ProgramToolbar
                            projectId={projectId}
                            zoomLevel={zoomLevel}
                            onZoomChange={setZoomLevel}
                        />
                    </div>
                </header>

                <div className="min-h-0 flex-1 overflow-hidden px-2 pb-3">
                    <ProgramTable
                        projectId={projectId}
                        activities={activityTree}
                        allActivities={activities || []}
                        dependencies={dependencies || []}
                        milestones={milestones || []}
                        dateRange={dateRange}
                        zoomLevel={zoomLevel}
                    />
                </div>
            </div>
        </RefetchContext.Provider>
    );
}
