/**
 * RFTNewShortTab Component
 * Renders the SHORT tab content for RFT NEW reports
 * Includes: Project Info, Objectives, Brief, Program, Fee, and Transmittal sections
 */

'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { type RftNew } from '@/lib/hooks/use-rft-new';
import { RFTNewTransmittalSchedule } from './RFTNewTransmittalSchedule';
import { DiamondIcon } from '@/components/ui/diamond-icon';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useFieldGeneration } from '@/lib/hooks/use-field-generation';
import { useProjectEvents } from '@/lib/hooks/use-project-events';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { ObjectivesReadOnlyList } from '@/components/profiler/objectives/ObjectivesReadOnlyList';
import type { ObjectiveRow } from '@/components/profiler/objectives/ObjectivesWorkspace';

const RFT_HIGHLIGHT_COLOR = 'var(--sw-cyan)';

function formatDisplayDate(dateString: string): string {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

interface ProjectDetails {
    projectName: string;
    address: string;
}

interface ProfilerObjectives {
    planning: ObjectiveRow[];
    functional: ObjectiveRow[];
    quality: ObjectiveRow[];
    compliance: ObjectiveRow[];
}

interface CostLine {
    id: string;
    activity: string;
    quantity?: number | null;
    unit?: string | null;
    rate?: number | null;
    amount?: number | null;
}

interface ProgramActivity {
    id: string;
    parentId: string | null;
    name: string;
    startDate: string | null;
    endDate: string | null;
    collapsed: boolean;
    color: string | null;
    sortOrder: number;
}

type TimelineGranularity = 'week' | 'month';

interface RFTNewShortTabProps {
    projectId: string;
    rftNew: RftNew;
    contextName: string;
    stakeholderId?: string | null;
    onDateChange?: (date: string) => void;
    onToggleObjectivesVisible?: (visible: boolean) => void;
    onToggleProgramVisible?: (visible: boolean) => void;
    onSaveTransmittal?: () => void;
    onLoadTransmittal?: () => void;
    onDownloadTransmittal?: () => void;
    canSaveTransmittal?: boolean;
    hasTransmittal?: boolean;
    documentCount?: number;
    isDownloading?: boolean;
    surface?: 'procurement' | 'record';
}

// Helper to get week start (Monday) for a date
function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Generate timeline columns with month grouping (supports both week and month zoom)
interface TimelineColumn {
    start: Date;
    label: string;
    month: string;
    year: number;
}

function generateTimelineColumns(startDate: Date, endDate: Date, granularity: TimelineGranularity): TimelineColumn[] {
    const columns: TimelineColumn[] = [];
    const current = granularity === 'week' ? getWeekStart(startDate) : new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    while (current <= end) {
        columns.push({
            start: new Date(current),
            label: granularity === 'week' ? current.getDate().toString() : months[current.getMonth()],
            month: months[current.getMonth()],
            year: current.getFullYear(),
        });
        if (granularity === 'week') {
            current.setDate(current.getDate() + 7);
        } else {
            current.setMonth(current.getMonth() + 1);
        }
    }
    return columns;
}

// Group columns by month for header
function groupColumnsByMonth(columns: TimelineColumn[], granularity: TimelineGranularity): { label: string; count: number }[] {
    // In month view, each column IS a month, so just return one per column
    if (granularity === 'month') {
        return columns.map(col => ({
            label: `${col.month} ${col.year}`,
            count: 1,
        }));
    }

    const groups: { label: string; count: number }[] = [];
    let currentGroup: { label: string; count: number } | null = null;

    columns.forEach(col => {
        const label = `${col.month} ${col.year}`;
        if (!currentGroup || currentGroup.label !== label) {
            if (currentGroup) groups.push(currentGroup);
            currentGroup = { label, count: 1 };
        } else {
            currentGroup.count++;
        }
    });
    if (currentGroup) groups.push(currentGroup);
    return groups;
}

// Flatten activities respecting collapsed state (hide children of collapsed parents)
function flattenVisibleActivities(activities: ProgramActivity[]): ProgramActivity[] {
    // Build a map of parent -> children
    const parentActivities = activities.filter(a => !a.parentId);
    const childActivities = activities.filter(a => a.parentId);

    const result: ProgramActivity[] = [];

    parentActivities.forEach(parent => {
        result.push(parent);
        // Only include children if parent is not collapsed
        if (!parent.collapsed) {
            const children = childActivities.filter(c => c.parentId === parent.id);
            children.sort((a, b) => a.sortOrder - b.sortOrder);
            result.push(...children);
        }
    });

    // Add any orphaned activities (children without valid parent in the list)
    childActivities.filter(c => !parentActivities.some(p => p.id === c.parentId)).forEach(a => {
        result.push(a);
    });

    return result;
}

// Format date as DD/MM/YY for display
function formatDateDisplay(dateStr: string | null): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
}

// Program Gantt Section Component - matches Program module appearance
function ProgramGanttSection({
    activities,
    visible,
    onToggleVisible,
}: {
    activities: ProgramActivity[];
    visible: boolean;
    onToggleVisible?: (v: boolean) => void;
}) {
    const chartRef = useRef<HTMLDivElement>(null);
    const [chartWidth, setChartWidth] = useState(0);

    // Filter visible activities based on collapsed state
    const visibleActivities = flattenVisibleActivities(activities);

    // Filter activities with dates and calculate date range
    const activitiesWithDates = visibleActivities.filter(a => a.startDate && a.endDate);

    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        const updateChartWidth = () => {
            setChartWidth(chart.clientWidth);
        };

        updateChartWidth();

        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', updateChartWidth);
            return () => window.removeEventListener('resize', updateChartWidth);
        }

        const observer = new ResizeObserver(updateChartWidth);
        observer.observe(chart);
        return () => observer.disconnect();
    }, [visible, activitiesWithDates.length]);

    const headerRow = (
        <div className="flex items-center gap-2 px-4">
            <RFTSectionHeading muted={!visible}>
                Program
            </RFTSectionHeading>
            <button
                type="button"
                onClick={() => onToggleVisible?.(!visible)}
                aria-label={visible ? 'Hide program' : 'Show program'}
                aria-expanded={visible}
                title={
                    visible
                        ? 'Hide program (also excluded from PDF/Word export)'
                        : 'Show program (also included in PDF/Word export)'
                }
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors p-1 -m-1"
            >
                {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
        </div>
    );

    if (!visible) {
        return <div className="space-y-2">{headerRow}</div>;
    }

    if (activitiesWithDates.length === 0) {
        return (
            <div className="space-y-2">
                {headerRow}
                <div className="border border-[var(--color-border)] rounded overflow-hidden">
                    <div className="px-4 py-3 text-[var(--color-text-muted)] text-sm">
                        No program activities with dates.
                    </div>
                </div>
            </div>
        );
    }

    // Calculate overall date range
    const allDates = activitiesWithDates.flatMap(a => [
        new Date(a.startDate!),
        new Date(a.endDate!),
    ]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    // The RFT programme always uses its own fitted month view. It deliberately
    // ignores the editable Programme tab's Week / Month / Fit state.
    const timelineColumns = generateTimelineColumns(minDate, maxDate, 'month');
    const monthGroups = groupColumnsByMonth(timelineColumns, 'month');
    const totalDuration = maxDate.getTime() - minDate.getTime();
    const fittedWidth = chartWidth > 0 ? chartWidth : 720;
    const activityColumnWidth = Math.min(160, fittedWidth * 0.36);
    const dateColumnWidth = Math.min(70, fittedWidth * 0.13);
    const timelineWidth = Math.max(1, fittedWidth - activityColumnWidth - (dateColumnWidth * 2));
    const columnWidth = timelineColumns.length > 0 ? timelineWidth / timelineColumns.length : timelineWidth;

    // Use the already-filtered visibleActivities for rendering
    const orderedActivities = visibleActivities;

    // Calculate bar position for an activity
    const calculateBarPosition = (activity: ProgramActivity) => {
        if (!activity.startDate || !activity.endDate) return null;

        const activityStart = new Date(activity.startDate);
        const activityEnd = new Date(activity.endDate);

        if (totalDuration === 0) {
            return { left: 0, width: timelineWidth };
        }

        const leftPercent = (activityStart.getTime() - minDate.getTime()) / totalDuration;
        const widthPercent = (activityEnd.getTime() - activityStart.getTime()) / totalDuration;
        const totalWidth = timelineWidth;
        const minBarWidth = Math.min(30, totalWidth);
        const width = Math.min(totalWidth, Math.max(minBarWidth, widthPercent * totalWidth));
        const left = Math.min(Math.max(0, leftPercent * totalWidth), Math.max(0, totalWidth - width));

        return {
            left,
            width,
        };
    };

    // All bars use consistent teal/blue color with transparency matching Program module
    const getActivityColor = (): string => {
        return 'rgba(13, 148, 136, 0.7)'; // Teal color with transparency
    };

    // Today line position
    const today = new Date();
    const todayPosition = totalDuration > 0
        ? ((today.getTime() - minDate.getTime()) / totalDuration) * timelineWidth
        : null;
    const showTodayLine = todayPosition !== null && todayPosition >= 0 && todayPosition <= timelineWidth;

    return (
        <div className="space-y-2">
            {headerRow}
            <div ref={chartRef} className="border border-[var(--color-border)] rounded overflow-hidden bg-[var(--color-bg-primary)]">
                <div className="overflow-hidden">
                    <div style={{ width: '100%' }}>
                        {/* Header: Month row */}
                        <div className="flex border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                            <div
                                className="flex-shrink-0 px-3 py-1.5 text-[var(--color-text-muted)] text-xs font-medium border-r border-[var(--color-border)] truncate"
                                style={{ width: `${activityColumnWidth}px` }}
                            >
                                Activity
                            </div>
                            <div
                                className="flex-shrink-0 px-2 py-1.5 text-[var(--color-text-muted)] text-xs font-medium border-r border-[var(--color-border)] text-center truncate"
                                style={{ width: `${dateColumnWidth}px` }}
                            >
                                Start
                            </div>
                            <div
                                className="flex-shrink-0 px-2 py-1.5 text-[var(--color-text-muted)] text-xs font-medium border-r border-[var(--color-border)] text-center truncate"
                                style={{ width: `${dateColumnWidth}px` }}
                            >
                                End
                            </div>
                            <div className="flex">
                                {monthGroups.map((group, i) => (
                                    <div
                                        key={i}
                                        className="truncate whitespace-nowrap text-center text-[var(--color-text-muted)] text-xs py-1.5 px-1 border-r border-[var(--color-border)] last:border-r-0"
                                        style={{ width: `${group.count * columnWidth}px` }}
                                        title={group.label}
                                    >
                                        {group.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Activity rows */}
                        {orderedActivities.map((activity) => {
                            const barPos = calculateBarPosition(activity);
                            const isChild = !!activity.parentId;
                            const hasChildren = activities.some(a => a.parentId === activity.id);
                            const color = getActivityColor();

                            return (
                                <div
                                    key={activity.id}
                                    className="flex border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-bg-tertiary)]"
                                >
                                    {/* Activity name cell with indentation for children */}
                                    <div
                                        className={`flex-shrink-0 py-2 border-r border-[var(--color-border)] flex items-center gap-2 ${isChild ? 'pl-6 pr-2' : 'px-3'}`}
                                        style={{ width: `${activityColumnWidth}px` }}
                                    >
                                        {/* Collapse indicator for parents - show expanded/collapsed state */}
                                        {!isChild && hasChildren && (
                                            <svg
                                                className={`w-3 h-3 text-[var(--color-text-muted)] flex-shrink-0 transition-transform ${activity.collapsed ? '' : 'rotate-90'}`}
                                                viewBox="0 0 12 12"
                                                fill="currentColor"
                                            >
                                                <path d="M4 2l4 4-4 4V2z" />
                                            </svg>
                                        )}
                                        {/* Spacer for parents without children */}
                                        {!isChild && !hasChildren && (
                                            <div className="w-3 flex-shrink-0" />
                                        )}
                                        {/* Color indicator for children */}
                                        {isChild && (
                                            <div
                                                className="w-1 h-4 flex-shrink-0"
                                                style={{ backgroundColor: color }}
                                            />
                                        )}
                                        <span className={`text-xs truncate ${isChild ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)] font-medium'}`}>
                                            {activity.name}
                                        </span>
                                    </div>

                                    {/* Start date cell */}
                                    <div
                                        className="flex-shrink-0 px-2 py-2 border-r border-[var(--color-border)] text-center"
                                        style={{ width: `${dateColumnWidth}px` }}
                                    >
                                        <span className="text-xs text-[var(--color-text-muted)]">
                                            {formatDateDisplay(activity.startDate)}
                                        </span>
                                    </div>
                                    {/* End date cell */}
                                    <div
                                        className="flex-shrink-0 px-2 py-2 border-r border-[var(--color-border)] text-center"
                                        style={{ width: `${dateColumnWidth}px` }}
                                    >
                                        <span className="text-xs text-[var(--color-text-muted)]">
                                            {formatDateDisplay(activity.endDate)}
                                        </span>
                                    </div>

                                    {/* Timeline cell */}
                                    <div
                                        className="relative py-2"
                                        style={{ width: `${timelineWidth}px` }}
                                    >
                                        {/* Grid lines */}
                                        <div className="absolute inset-0 flex">
                                            {timelineColumns.map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="border-r border-[var(--color-border)] last:border-r-0"
                                                    style={{ width: `${columnWidth}px` }}
                                                />
                                            ))}
                                        </div>

                                        {/* Today line */}
                                        {showTodayLine && (
                                            <div
                                                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                                                style={{ left: `${todayPosition}px` }}
                                            />
                                        )}

                                        {/* Activity bar with name - square edges, inverted (border + colored text on transparent fill) */}
                                        {barPos && (
                                            <div
                                                className="absolute top-1/2 -translate-y-1/2 h-5 flex items-center justify-center overflow-hidden border"
                                                style={{
                                                    left: `${barPos.left}px`,
                                                    width: `${barPos.width}px`,
                                                    backgroundColor: 'transparent',
                                                    borderColor: color,
                                                    color,
                                                }}
                                                title={activity.name}
                                            >
                                                <span className="text-[10px] font-medium truncate px-1">
                                                    {activity.name}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Brief sub-section (Services / Deliverables) ──────────────────────────────
//
// Mirrors the Objectives SectionGroup pattern (header bar with segmented
// Short/Long toggle + single DiamondIcon refresh, no trash). The .brief-section
// class on the editor wrapper drives a CSS counter (see globals.css) that
// renders list items as 1., 2., 3. … and continues across to deliverables.
type BriefField = 'services' | 'deliverables';
interface BriefSub {
    short: string;
    long: string;
    viewMode: 'short' | 'long';
}

function RFTSectionHeading({
    children,
    muted = false,
}: {
    children: React.ReactNode;
    muted?: boolean;
}) {
    return (
        <h3
            className={cn(
                'flex items-center gap-2 text-sm font-semibold transition-colors',
                muted ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'
            )}
        >
            <span aria-hidden="true" className="h-1.5 w-1.5 bg-[var(--sw-cyan)]" />
            {children}
        </h3>
    );
}

function BriefSubSection({
    field, label, sub, isGenerating, isAnyGenerating, counterStart, isLast,
    onChange, onSave, onRefresh, onToggle,
}: {
    field: BriefField;
    label: string;
    sub: BriefSub;
    isGenerating: boolean;
    isAnyGenerating: boolean;
    counterStart: number;
    isLast?: boolean;
    onChange: (f: BriefField, v: string) => void;
    onSave: (f: BriefField) => void | Promise<void>;
    onRefresh: (f: BriefField) => void | Promise<void>;
    onToggle: (f: BriefField, m: 'short' | 'long') => void | Promise<void>;
}) {
    const longTextLength = sub.long.replace(/<[^>]*>/g, '').trim().length;
    const hasShortText = sub.short.replace(/<[^>]*>/g, '').trim().length > 0;
    const hasLongContent = longTextLength > 0;
    // Until Long has been generated for the first time, clicking the Long
    // toggle should keep the Short text visible as a preview rather than
    // showing an empty editor. Once Long has content, the toggle swaps
    // between Short and Long normally.
    const isLongPreviewingShort = sub.viewMode === 'long' && !hasLongContent && hasShortText;
    const activeContent = sub.viewMode === 'short' || isLongPreviewingShort ? sub.short : sub.long;

    return (
        <div className={cn('flex flex-col', !isLast && 'border-b border-[var(--sw-rule-2)]')}>
            {/* Header bar — matches the procurement card shell: white surface,
                thin bottom rule, mono lowercase label, sw-token controls. */}
            <div
                className="flex items-center justify-between px-3 py-2"
                style={{
                    background: 'var(--sw-paper)',
                    borderBottom: '1px solid var(--sw-rule-2)',
                }}
            >
                <span
                    style={{
                        fontFamily: 'var(--sw-font-mono)',
                        fontSize: 10,
                        letterSpacing: '0.18em',
                        textTransform: 'lowercase',
                        color: 'var(--sw-muted)',
                        fontWeight: 600,
                    }}
                >
                    {label}
                </span>
                <div className="flex items-center gap-1">
                    {/* Segmented Short/Long toggle */}
                    <div
                        className="inline-flex items-center overflow-hidden text-[10px]"
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            letterSpacing: '0.05em',
                            border: '1px solid var(--sw-rule)',
                        }}
                        role="group"
                        aria-label="View mode"
                    >
                        <button
                            type="button"
                            onClick={() => onToggle(field, 'short')}
                            className="px-2 py-1 transition-colors"
                            style={{
                                background: sub.viewMode === 'short' ? 'var(--sw-ink)' : 'transparent',
                                color: sub.viewMode === 'short' ? 'var(--sw-paper)' : 'var(--sw-muted)',
                                borderRight: '1px solid var(--sw-rule)',
                            }}
                        >
                            Short
                        </button>
                        <button
                            type="button"
                            onClick={() => onToggle(field, 'long')}
                            title={!hasLongContent && hasShortText ? 'Long view is empty — click the diamond to polish' : undefined}
                            className={cn('px-2 py-1 transition-colors', !hasLongContent && hasShortText && sub.viewMode !== 'long' && 'italic')}
                            style={{
                                background: sub.viewMode === 'long' ? 'var(--sw-ink)' : 'transparent',
                                color: sub.viewMode === 'long'
                                    ? 'var(--sw-paper)'
                                    : !hasLongContent && hasShortText
                                        ? 'var(--color-text-muted)'
                                        : 'var(--sw-muted)',
                            }}
                        >
                            Long
                        </button>
                    </div>

                    {/* Refresh — DiamondIcon with spin animation while generating.
                        Sized + bordered to match the procurement icon button. */}
                    <button
                        type="button"
                        onClick={() => onRefresh(field)}
                        disabled={isAnyGenerating}
                        title={`Regenerate ${sub.viewMode} content`}
                        aria-label={`Regenerate ${sub.viewMode} content`}
                        className={cn(
                            'flex shrink-0 items-center justify-center transition-colors',
                            isAnyGenerating && 'cursor-not-allowed opacity-40',
                        )}
                        style={{
                            width: 24,
                            height: 22,
                            border: '1px solid var(--sw-rule)',
                            background: 'transparent',
                            color: isAnyGenerating ? 'var(--sw-muted)' : 'var(--sw-rose-dk)',
                        }}
                    >
                        <DiamondIcon
                            variant="empty"
                            className={cn('w-4 h-4', isGenerating && 'animate-diamond-spin')}
                        />
                    </button>
                </div>
            </div>

            {/* Editor body — wrapped in .brief-section so the CSS counter applies.
                --brief-start-index is the seed value for the brief-counter (the
                actual ::before increments by 1 per <li>, so we set it to the
                count of preceding items). Mirrors the objectives editor's
                --objectives-start-index pattern. */}
            <div
                className="brief-section"
                data-field={field}
                style={{
                    background: 'var(--sw-paper)',
                    ['--brief-start-index' as string]: counterStart,
                } as React.CSSProperties}
            >
                <RichTextEditor
                    content={activeContent}
                    onChange={(c) => onChange(field, c)}
                    onBlur={() => onSave(field)}
                    placeholder={`Enter ${label.toLowerCase()}...`}
                    disabled={isAnyGenerating || isLongPreviewingShort}
                    variant="mini"
                    toolbarVariant="none"
                    transparentBg
                    className="border-0 rounded-none"
                    editorClassName="bg-transparent hover:bg-[var(--sw-shell)] transition-colors [&_strong]:text-[var(--sw-ink)] [&_strong]:font-semibold"
                />
            </div>
        </div>
    );
}

export function RFTNewShortTab({
    projectId,
    rftNew,
    contextName,
    stakeholderId,
    onDateChange,
    onToggleObjectivesVisible,
    onToggleProgramVisible,
    onSaveTransmittal,
    onLoadTransmittal,
    onDownloadTransmittal,
    canSaveTransmittal,
    hasTransmittal,
    documentCount,
    isDownloading,
    surface = 'procurement',
}: RFTNewShortTabProps) {
    const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
    const [objectives, setObjectives] = useState<ProfilerObjectives>({ planning: [], functional: [], quality: [], compliance: [] });
    const [programActivities, setProgramActivities] = useState<ProgramActivity[]>([]);
    const [briefData, setBriefData] = useState<{
        services:     { short: string; long: string; viewMode: 'short' | 'long' };
        deliverables: { short: string; long: string; viewMode: 'short' | 'long' };
    }>({
        services:     { short: '', long: '', viewMode: 'short' },
        deliverables: { short: '', long: '', viewMode: 'short' },
    });
    const [isSavingBrief, setIsSavingBrief] = useState(false);
    const [costLines, setCostLines] = useState<CostLine[]>([]);

    // Unified Field Generation hooks for Brief fields
    const {
        generate: generateServiceApi,
        isGenerating: isGeneratingService,
    } = useFieldGeneration({
        fieldType: 'brief.service',
        projectId,
        stakeholderId: stakeholderId || undefined,
    });

    const {
        generate: generateDeliverablesApi,
        isGenerating: isGeneratingDeliverables,
    } = useFieldGeneration({
        fieldType: 'brief.deliverables',
        projectId,
        stakeholderId: stakeholderId || undefined,
    });

    const [isLoading, setIsLoading] = useState(true);
    const [rftDate, setRftDate] = useState(rftNew.rftDate || new Date().toISOString().split('T')[0]);
    const dateInputRef = useRef<HTMLInputElement>(null);
    const hasAutoSavedDateRef = useRef(false);
    const { toast } = useToast();

    // Update rftDate when rftNew changes, and persist default if not set
    useEffect(() => {
        const defaultDate = new Date().toISOString().split('T')[0];
        setRftDate(rftNew.rftDate || defaultDate);

        // If RFT has no date set, persist the default date to the database
        // This ensures TRR can retrieve the date without manual user intervention
        // Use ref to prevent duplicate saves in React Strict Mode or edge cases
        if (!rftNew.rftDate && onDateChange && !hasAutoSavedDateRef.current) {
            hasAutoSavedDateRef.current = true;
            onDateChange(defaultDate);
        }
    }, [rftNew.rftDate, onDateChange]);

    const handleDateClick = useCallback(() => {
        dateInputRef.current?.showPicker();
    }, []);

    const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        setRftDate(newDate);
        onDateChange?.(newDate);
    }, [onDateChange]);

    const fetchData = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        try {
            // Fetch all planning data from consolidated endpoint
            const planningRes = await fetch(`/api/planning/${projectId}`);
            if (planningRes.ok) {
                const data = await planningRes.json();

                // Set Details
                if (data.details) {
                    setProjectDetails({
                        projectName: data.details.projectName || 'Untitled Project',
                        address: data.details.address || '',
                    });
                } else {
                    // Fallback if details are missing but we need to show something (or rely on initial null)
                    setProjectDetails({
                        projectName: 'Untitled Project',
                        address: '',
                    });
                }

            }

            // Fetch Objectives from new profilerObjectives API
            const objectivesRes = await fetch(`/api/projects/${projectId}/objectives`);
            if (objectivesRes.ok) {
                const objectivesData = await objectivesRes.json();
                if (objectivesData.success && objectivesData.data) {
                    setObjectives({
                        planning: objectivesData.data.planning ?? [],
                        functional: objectivesData.data.functional ?? [],
                        quality: objectivesData.data.quality ?? [],
                        compliance: objectivesData.data.compliance ?? [],
                    });
                }
            }

            // Fetch Program Activities
            const programRes = await fetch(`/api/projects/${projectId}/program`);
            if (programRes.ok) {
                const programData = await programRes.json();
                if (Array.isArray(programData.activities)) {
                    setProgramActivities(programData.activities.sort((a: ProgramActivity, b: ProgramActivity) => a.sortOrder - b.sortOrder));
                }
            }

            // Fetch cost lines filtered by stakeholder
            let costUrl = `/api/projects/${projectId}/cost-lines`;
            if (stakeholderId) {
                costUrl += `?stakeholderId=${stakeholderId}`;

                // Fetch Stakeholder Brief info
                const stakeholderRes = await fetch(`/api/projects/${projectId}/stakeholders/${stakeholderId}`);
                if (stakeholderRes.ok) {
                    const stakeholderData = await stakeholderRes.json();
                    setBriefData({
                        services: {
                            short:    stakeholderData.briefServices ?? stakeholderData.scopeWorks ?? '',
                            long:     stakeholderData.briefServicesPolished ?? '',
                            viewMode: stakeholderData.briefServicesViewMode === 'long' ? 'long' : 'short',
                        },
                        deliverables: {
                            short:    stakeholderData.briefDeliverables ?? stakeholderData.scopeDeliverables ?? '',
                            long:     stakeholderData.briefDeliverablesPolished ?? '',
                            viewMode: stakeholderData.briefDeliverablesViewMode === 'long' ? 'long' : 'short',
                        },
                    });
                }
            }

            const costRes = await fetch(costUrl);
            if (costRes.ok) {
                const costData = await costRes.json();
                setCostLines(costData || []);
            } else {
                setCostLines([]);
            }
        } catch (error) {
            console.error('Error fetching RFT data:', error);
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, [projectId, stakeholderId]);

    // Fetch all data when component mounts.
    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    useProjectEvents(projectId, (event) => {
        if (
            event.type === 'entity_updated' &&
            (
                (event.entity === 'stakeholder' && event.id === stakeholderId) ||
                event.entity === 'cost_line'
            )
        ) {
            void fetchData(false);
        }
    });

    /**
     * Build informative description of sources used for generation
     */
    const buildSourceDescription = (metadata: {
        usedRAG: boolean;
        usedProjectContext: boolean;
        usedProfiler: boolean;
        usedObjectives: boolean;
        usedFeeSchedule?: boolean;
        usedProjectDocuments?: boolean;
        usedDisciplineSeedKnowledge?: boolean;
        usedSeedKnowledge?: boolean;
        usedStakeholderContext?: boolean;
        ragDocumentCount: number;
        ragChunkCount: number;
    }, sourceCount: number): string => {
        const parts: string[] = [];
        if ((metadata.usedProjectDocuments || metadata.usedRAG) && sourceCount > 0) {
            parts.push(`${sourceCount} project document source(s)`);
        }
        if (metadata.usedFeeSchedule) {
            parts.push('Fee schedule');
        }
        if (metadata.usedStakeholderContext) {
            parts.push('Stakeholder context');
        }
        if (metadata.usedProfiler) {
            parts.push('Project Profile');
        }
        if (metadata.usedObjectives) {
            parts.push('Project Objectives');
        }
        if (metadata.usedDisciplineSeedKnowledge) {
            parts.push('Discipline seed knowledge');
        }
        if (metadata.usedSeedKnowledge && !metadata.usedDisciplineSeedKnowledge) {
            parts.push('Seed knowledge');
        }
        if (metadata.usedProjectContext && !metadata.usedProfiler && !metadata.usedObjectives) {
            parts.push('Project Context');
        }
        if (!metadata.usedRAG && !metadata.usedProjectDocuments && !metadata.usedSeedKnowledge) {
            parts.push('(no project documents)');
        }
        return parts.length > 0 ? `Generated using: ${parts.join(', ')}` : 'Generated using project context';
    };

    // Single refresh handler — replaces the previous Generate/Polish quartet.
    // Short mode: empty input regenerates short bullets and saves to brief_services /
    // brief_deliverables. Long mode: passes the current short content as input to
    // produce polished long-form text and saves to brief_services_polished /
    // brief_deliverables_polished. The opposite mode's content is preserved.
    const handleRefresh = useCallback(async (field: 'services' | 'deliverables') => {
        const sub = briefData[field];
        const generateApi = field === 'services' ? generateServiceApi : generateDeliverablesApi;

        if (sub.viewMode === 'long' && sub.short.replace(/<[^>]*>/g, '').trim().length === 0) {
            toast({
                title: 'Nothing to polish',
                description: 'Generate the short version first, then switch to Long.',
                variant: 'destructive',
            });
            return;
        }

        try {
            const input = sub.viewMode === 'short' ? '' : sub.short;
            const result = await generateApi(input);

            setBriefData(prev => ({
                ...prev,
                [field]: {
                    ...prev[field],
                    ...(sub.viewMode === 'short' ? { short: result.content } : { long: result.content }),
                },
            }));

            if (stakeholderId) {
                const patchKey =
                    field === 'services'
                        ? (sub.viewMode === 'short' ? 'briefServices' : 'briefServicesPolished')
                        : (sub.viewMode === 'short' ? 'briefDeliverables' : 'briefDeliverablesPolished');
                await fetch(`/api/projects/${projectId}/stakeholders/${stakeholderId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ [patchKey]: result.content }),
                });
            }

            toast({
                title: `${field === 'services' ? 'Services' : 'Deliverables'} ${sub.viewMode === 'short' ? 'generated' : 'polished'}`,
                description: buildSourceDescription(result.metadata, result.sources.length),
                variant: 'success',
            });
        } catch (error) {
            toast({
                title: sub.viewMode === 'short' ? 'Generation Failed' : 'Polish Failed',
                description: error instanceof Error ? error.message : 'Unknown error',
                variant: 'destructive',
            });
        }
    }, [briefData, generateServiceApi, generateDeliverablesApi, stakeholderId, projectId, toast]);

    // Persist the per-sub-section view mode so the toggle is sticky across reloads
    // and the export honours what the user is looking at.
    const handleViewToggle = useCallback(async (field: 'services' | 'deliverables', mode: 'short' | 'long') => {
        setBriefData(prev => ({ ...prev, [field]: { ...prev[field], viewMode: mode } }));
        if (!stakeholderId) return;
        const patchKey = field === 'services' ? 'briefServicesViewMode' : 'briefDeliverablesViewMode';
        await fetch(`/api/projects/${projectId}/stakeholders/${stakeholderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [patchKey]: mode }),
        });
    }, [stakeholderId, projectId]);

    // Continuous numbering across Services → Deliverables. Counts <li> elements
    // in whichever services view is currently visible (short or long); the
    // deliverables container starts its CSS counter at this value.
    // Must live above the early return below so the hook order is stable.
    const servicesActiveHtml = briefData.services.viewMode === 'short'
        ? briefData.services.short
        : briefData.services.long;
    const servicesItemCount = useMemo(() => {
        if (typeof document === 'undefined' || !servicesActiveHtml) return 0;
        const div = document.createElement('div');
        div.innerHTML = servicesActiveHtml;
        return div.querySelectorAll('li').length;
    }, [servicesActiveHtml]);

    if (isLoading) {
        return (
            <div className="p-8 text-center text-[var(--color-text-muted)]">
                <p>Loading RFT data...</p>
            </div>
        );
    }

    const rftNum = String(rftNew.rftNumber).padStart(2, '0');
    const rftLabel = `Request For Tender, ${contextName} ${rftNum}`;
    const usesRecordSurface = surface === 'record';

    // Edits route to the currently-visible version (short or long) so toggling
    // does not clobber the off-screen variant.
    const handleBriefChange = (field: 'services' | 'deliverables', value: string) => {
        setBriefData(prev => ({
            ...prev,
            [field]: {
                ...prev[field],
                ...(prev[field].viewMode === 'short' ? { short: value } : { long: value }),
            },
        }));
    };

    const handleSaveBrief = async (field: 'services' | 'deliverables') => {
        if (!stakeholderId) return;
        setIsSavingBrief(true);
        try {
            const sub = briefData[field];
            const value = sub.viewMode === 'short' ? sub.short : sub.long;
            const patchKey =
                field === 'services'
                    ? (sub.viewMode === 'short' ? 'briefServices' : 'briefServicesPolished')
                    : (sub.viewMode === 'short' ? 'briefDeliverables' : 'briefDeliverablesPolished');
            await fetch(`/api/projects/${projectId}/stakeholders/${stakeholderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [patchKey]: value }),
            });
        } catch (error) {
            console.error('Failed to save brief', error);
        } finally {
            setIsSavingBrief(false);
        }
    };

    return (
        <div
            className={cn('space-y-6', usesRecordSurface && 'pb-4')}
            style={usesRecordSurface ? { backgroundColor: 'white', color: 'var(--color-text-primary)' } : undefined}
        >
            {/* 1. Project Information Table */}
            <div
                className={usesRecordSurface ? 'overflow-hidden' : 'overflow-hidden rounded-lg'}
                style={usesRecordSurface ? { borderBottom: '1px solid var(--sw-rule-2)' } : undefined}
            >
                <table className="w-full text-sm">
                    <tbody>
                        <tr
                            className={usesRecordSurface ? undefined : 'border-b border-[var(--color-border)]'}
                            style={usesRecordSurface ? { borderBottom: '1px solid var(--sw-rule-2)' } : undefined}
                        >
                            <td className="w-36 px-4 py-2.5 font-medium" style={{ color: RFT_HIGHLIGHT_COLOR }}>
                                Project Name
                            </td>
                            <td className="px-4 py-2.5 text-[var(--color-text-primary)]" colSpan={2}>
                                {projectDetails?.projectName || 'Loading...'}
                            </td>
                        </tr>
                        <tr
                            className={usesRecordSurface ? undefined : 'border-b border-[var(--color-border)]'}
                            style={usesRecordSurface ? { borderBottom: '1px solid var(--sw-rule-2)' } : undefined}
                        >
                            <td className="px-4 py-2.5 font-medium" style={{ color: RFT_HIGHLIGHT_COLOR }}>
                                Address
                            </td>
                            <td className="px-4 py-2.5 text-[var(--color-text-primary)]" colSpan={2}>
                                {projectDetails?.address || '-'}
                            </td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2.5 font-medium" style={{ color: RFT_HIGHLIGHT_COLOR }}>
                                Document
                            </td>
                            <td className="px-4 py-2.5 text-[var(--color-text-primary)] font-semibold">
                                {rftLabel}
                            </td>
                            <td
                                className="w-44 px-4 py-2.5 font-medium cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors relative text-right"
                                style={{ color: RFT_HIGHLIGHT_COLOR }}
                                onClick={handleDateClick}
                            >
                                <span className="select-none">Issued {formatDisplayDate(rftDate)}</span>
                                <input
                                    ref={dateInputRef}
                                    type="date"
                                    value={rftDate}
                                    onChange={handleDateChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    tabIndex={-1}
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* 2. Objectives Section */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 px-4">
                    <RFTSectionHeading muted={!rftNew.objectivesVisible}>
                        Objectives
                    </RFTSectionHeading>
                    <button
                        type="button"
                        onClick={() => onToggleObjectivesVisible?.(!rftNew.objectivesVisible)}
                        aria-label={rftNew.objectivesVisible ? 'Hide objectives' : 'Show objectives'}
                        aria-expanded={rftNew.objectivesVisible}
                        title={
                            rftNew.objectivesVisible
                                ? 'Hide objectives (also excluded from PDF/Word export)'
                                : 'Show objectives (also included in PDF/Word export)'
                        }
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors p-1 -m-1"
                    >
                        {rftNew.objectivesVisible
                            ? <EyeOff className="w-4 h-4" />
                            : <Eye className="w-4 h-4" />
                        }
                    </button>
                </div>
                {rftNew.objectivesVisible && (
                    <ObjectivesReadOnlyList data={objectives} />
                )}
            </div>

            {/* 3. Brief Section — services stacked above deliverables, single
                outer card with continuous numbering across both. Mirrors the
                Objectives SectionGroup pattern: segmented Short/Long toggle +
                single DiamondIcon refresh in each sub-section header. */}
            <div className="space-y-2">
                <div className="px-4">
                    <RFTSectionHeading>
                        Brief
                    </RFTSectionHeading>
                </div>
                <div className="rounded border border-[var(--color-border)]/50 overflow-hidden">
                    <BriefSubSection
                        field="services"
                        label="Services"
                        sub={briefData.services}
                        isGenerating={isGeneratingService}
                        isAnyGenerating={isGeneratingService || isGeneratingDeliverables}
                        counterStart={0}
                        onChange={handleBriefChange}
                        onSave={handleSaveBrief}
                        onRefresh={handleRefresh}
                        onToggle={handleViewToggle}
                    />
                    <BriefSubSection
                        field="deliverables"
                        label="Deliverables"
                        sub={briefData.deliverables}
                        isGenerating={isGeneratingDeliverables}
                        isAnyGenerating={isGeneratingService || isGeneratingDeliverables}
                        counterStart={servicesItemCount}
                        isLast
                        onChange={handleBriefChange}
                        onSave={handleSaveBrief}
                        onRefresh={handleRefresh}
                        onToggle={handleViewToggle}
                    />
                </div>
                {isSavingBrief && (
                    <span className="text-xs text-[var(--color-accent-copper)]">Saving...</span>
                )}
            </div>

            {/* 4. Program Section - Visual Gantt */}
            <ProgramGanttSection
                activities={programActivities}
                visible={rftNew.programVisible}
                onToggleVisible={onToggleProgramVisible}
            />

            {/* 5. Fee Section */}
            <div className="space-y-2">
                <div className="px-4">
                    <RFTSectionHeading>
                        Fee
                    </RFTSectionHeading>
                </div>
                <div className="overflow-hidden rounded-lg">
                    {costLines.length > 0 ? (
                        <table className="w-full text-sm table-fixed">
                            <thead>
                                <tr className="border-b border-[var(--color-border)]">
                                    <th className="px-4 py-2.5 text-left text-[var(--color-document-header)] font-medium" style={{ width: '66%' }}>Description</th>
                                    <th className="px-4 py-2.5 text-left text-[var(--color-document-header)] font-medium" style={{ width: '34%' }}>Amount (Excl. GST)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {costLines.map((line) => (
                                    <tr key={line.id}>
                                        <td className="px-4 py-2.5 text-[var(--color-text-primary)]">{line.activity}</td>
                                        <td className="px-4 py-2.5 text-[var(--color-text-muted)] text-left">$</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="px-4 py-3 text-[var(--color-text-muted)] text-sm">
                            No cost plan items for this {contextName}
                        </div>
                    )}
                </div>
            </div>

            {/* 6. Transmittal Section */}
            <div className="space-y-2">
                <RFTNewTransmittalSchedule
                    rftNewId={rftNew.id}
                    onSaveTransmittal={onSaveTransmittal}
                    onLoadTransmittal={onLoadTransmittal}
                    onDownloadTransmittal={onDownloadTransmittal}
                    canSaveTransmittal={canSaveTransmittal}
                    hasTransmittal={hasTransmittal}
                    documentCount={documentCount}
                    isDownloading={isDownloading}
                />
            </div>
        </div>
    );
}
