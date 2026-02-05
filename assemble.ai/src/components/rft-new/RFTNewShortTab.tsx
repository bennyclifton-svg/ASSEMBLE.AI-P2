/**
 * RFTNewShortTab Component
 * Renders the SHORT tab content for RFT NEW reports
 * Includes: Project Info, Objectives, Brief, Program, Fee, and Transmittal sections
 */

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { type RftNew } from '@/lib/hooks/use-rft-new';
import { RFTNewTransmittalSchedule } from './RFTNewTransmittalSchedule';
import { Textarea } from '@/components/ui/textarea';
import { DiamondIcon } from '@/components/ui/diamond-icon';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useFieldGeneration } from '@/lib/hooks/use-field-generation';
import { RichTextEditor } from '@/components/ui/RichTextEditor';

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
    functionalQuality?: string;
    planningCompliance?: string;
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

type ZoomLevel = 'week' | 'month';
const ZOOM_STORAGE_KEY = 'program-zoom-level';

interface RFTNewShortTabProps {
    projectId: string;
    rftNew: RftNew;
    contextName: string;
    stakeholderId?: string | null;
    onDateChange?: (date: string) => void;
    onSaveTransmittal?: () => void;
    onLoadTransmittal?: () => void;
    onDownloadTransmittal?: () => void;
    canSaveTransmittal?: boolean;
    hasTransmittal?: boolean;
    documentCount?: number;
    isDownloading?: boolean;
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

function generateTimelineColumns(startDate: Date, endDate: Date, zoomLevel: ZoomLevel): TimelineColumn[] {
    const columns: TimelineColumn[] = [];
    const current = zoomLevel === 'week' ? getWeekStart(startDate) : new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    while (current <= end) {
        columns.push({
            start: new Date(current),
            label: zoomLevel === 'week' ? current.getDate().toString() : months[current.getMonth()],
            month: months[current.getMonth()],
            year: current.getFullYear(),
        });
        if (zoomLevel === 'week') {
            current.setDate(current.getDate() + 7);
        } else {
            current.setMonth(current.getMonth() + 1);
        }
    }
    return columns;
}

// Group columns by month for header
function groupColumnsByMonth(columns: TimelineColumn[], zoomLevel: ZoomLevel): { label: string; count: number }[] {
    // In month view, each column IS a month, so just return one per column
    if (zoomLevel === 'month') {
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

// Program Gantt Section Component - matches Program module appearance
function ProgramGanttSection({ activities, zoomLevel }: { activities: ProgramActivity[]; zoomLevel: ZoomLevel }) {
    // Filter visible activities based on collapsed state
    const visibleActivities = flattenVisibleActivities(activities);

    // Filter activities with dates and calculate date range
    const activitiesWithDates = visibleActivities.filter(a => a.startDate && a.endDate);

    if (activitiesWithDates.length === 0) {
        return (
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                    Program
                </h3>
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

    // Generate timeline columns based on zoom level
    const timelineColumns = generateTimelineColumns(minDate, maxDate, zoomLevel);
    const monthGroups = groupColumnsByMonth(timelineColumns, zoomLevel);
    const totalDuration = maxDate.getTime() - minDate.getTime();
    // Use different column widths for week vs month view
    const columnWidth = zoomLevel === 'week' ? 50 : 80;

    // Use the already-filtered visibleActivities for rendering
    const orderedActivities = visibleActivities;

    // Calculate bar position for an activity
    const calculateBarPosition = (activity: ProgramActivity) => {
        if (!activity.startDate || !activity.endDate) return null;

        const activityStart = new Date(activity.startDate);
        const activityEnd = new Date(activity.endDate);

        if (totalDuration === 0) {
            return { left: 0, width: timelineColumns.length * columnWidth };
        }

        const leftPercent = (activityStart.getTime() - minDate.getTime()) / totalDuration;
        const widthPercent = (activityEnd.getTime() - activityStart.getTime()) / totalDuration;
        const totalWidth = timelineColumns.length * columnWidth;

        return {
            left: Math.max(0, leftPercent * totalWidth),
            width: Math.max(30, widthPercent * totalWidth), // min 30px to show some text
        };
    };

    // All bars use consistent teal/blue color with transparency matching Program module
    const getActivityColor = (): string => {
        return 'rgba(13, 148, 136, 0.7)'; // Teal color with transparency
    };

    // Today line position
    const today = new Date();
    const todayPosition = totalDuration > 0
        ? ((today.getTime() - minDate.getTime()) / totalDuration) * (timelineColumns.length * columnWidth)
        : null;
    const showTodayLine = todayPosition !== null && todayPosition >= 0 && todayPosition <= timelineColumns.length * columnWidth;

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                Program
            </h3>
            <div className="border border-[var(--color-border)] rounded overflow-hidden bg-[var(--color-bg-primary)]">
                <div className="overflow-x-auto">
                    <div style={{ minWidth: `${160 + timelineColumns.length * columnWidth}px` }}>
                        {/* Header: Month row */}
                        <div className="flex border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                            <div className="w-40 flex-shrink-0 px-3 py-1.5 text-[var(--color-text-muted)] text-xs font-medium border-r border-[var(--color-border)]">
                                Activity
                            </div>
                            <div className="flex">
                                {monthGroups.map((group, i) => (
                                    <div
                                        key={i}
                                        className="text-center text-[var(--color-text-muted)] text-xs py-1.5 border-r border-[var(--color-border)] last:border-r-0"
                                        style={{ width: `${group.count * columnWidth}px` }}
                                    >
                                        {group.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Header: Day/Week numbers row - only show in week view */}
                        {zoomLevel === 'week' && (
                            <div className="flex border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                                <div className="w-40 flex-shrink-0 border-r border-[var(--color-border)]" />
                                <div className="flex">
                                    {timelineColumns.map((col, i) => (
                                        <div
                                            key={i}
                                            className="text-center text-[var(--color-text-muted)] text-xs py-1 border-r border-[var(--color-border)] last:border-r-0"
                                            style={{ width: `${columnWidth}px` }}
                                        >
                                            {col.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

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
                                        className={`w-40 flex-shrink-0 py-2 border-r border-[var(--color-border)] flex items-center gap-2 ${isChild ? 'pl-6 pr-2' : 'px-3'}`}
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

                                    {/* Timeline cell */}
                                    <div
                                        className="relative py-2"
                                        style={{ width: `${timelineColumns.length * columnWidth}px` }}
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

                                        {/* Activity bar with name - square edges */}
                                        {barPos && (
                                            <div
                                                className="absolute top-1/2 -translate-y-1/2 h-5 flex items-center justify-center overflow-hidden"
                                                style={{
                                                    left: `${barPos.left}px`,
                                                    width: `${barPos.width}px`,
                                                    backgroundColor: color,
                                                }}
                                                title={activity.name}
                                            >
                                                <span className="text-[10px] text-white font-medium truncate px-1">
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

export function RFTNewShortTab({
    projectId,
    rftNew,
    contextName,
    stakeholderId,
    onDateChange,
    onSaveTransmittal,
    onLoadTransmittal,
    onDownloadTransmittal,
    canSaveTransmittal,
    hasTransmittal,
    documentCount,
    isDownloading,
}: RFTNewShortTabProps) {
    const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
    const [objectives, setObjectives] = useState<ProfilerObjectives>({});
    const [programActivities, setProgramActivities] = useState<ProgramActivity[]>([]);
    const [briefData, setBriefData] = useState({ service: '', deliverables: '' });
    const [isSavingBrief, setIsSavingBrief] = useState(false);
    const [costLines, setCostLines] = useState<CostLine[]>([]);

    // Read zoom level from localStorage to match Program tab configuration
    const [zoomLevel] = useState<ZoomLevel>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(ZOOM_STORAGE_KEY);
            if (stored === 'week' || stored === 'month') {
                return stored;
            }
        }
        return 'week';
    });

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

    // Polish loading states (using same API but with existing content)
    const [isPolishingService, setIsPolishingService] = useState(false);
    const [isPolishingDeliverables, setIsPolishingDeliverables] = useState(false);
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

    // Fetch all data when component mounts
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
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
                            functionalQuality: objectivesData.data.functionalQuality?.content || '',
                            planningCompliance: objectivesData.data.planningCompliance?.content || '',
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
                            service: stakeholderData.briefServices || stakeholderData.scopeWorks || '',
                            deliverables: stakeholderData.briefDeliverables || stakeholderData.scopeDeliverables || '',
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
                setIsLoading(false);
            }
        };

        fetchData();
    }, [projectId, stakeholderId]);

    /**
     * Build informative description of sources used for generation
     */
    const buildSourceDescription = (metadata: { usedRAG: boolean; usedProjectContext: boolean; usedProfiler: boolean; usedObjectives: boolean; ragDocumentCount: number; ragChunkCount: number }, sourceCount: number): string => {
        const parts: string[] = [];
        if (metadata.usedRAG && sourceCount > 0) {
            parts.push(`${sourceCount} Knowledge Source document(s)`);
        }
        if (metadata.usedProfiler) {
            parts.push('Project Profile');
        }
        if (metadata.usedObjectives) {
            parts.push('Project Objectives');
        }
        if (metadata.usedProjectContext && !metadata.usedProfiler && !metadata.usedObjectives) {
            parts.push('Project Context');
        }
        if (!metadata.usedRAG) {
            parts.push('(no Knowledge Source)');
        }
        return parts.length > 0 ? `Generated using: ${parts.join(', ')}` : 'Generated using project context';
    };

    /**
     * Generate Service field from scratch using Unified Field Generation
     */
    const handleGenerateService = useCallback(async () => {
        try {
            const result = await generateServiceApi('');
            setBriefData(prev => ({
                ...prev,
                service: result.content,
            }));
            // Persist generated content to database
            if (stakeholderId) {
                await fetch(`/api/projects/${projectId}/stakeholders/${stakeholderId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ briefServices: result.content }),
                });
            }
            toast({
                title: 'Service Generated',
                description: buildSourceDescription(result.metadata, result.sources.length),
            });
        } catch (error) {
            toast({
                title: 'Generation Failed',
                description: error instanceof Error ? error.message : 'Failed to generate',
                variant: 'destructive',
            });
        }
    }, [generateServiceApi, toast, stakeholderId, projectId]);

    /**
     * Polish Service field by enhancing existing content
     */
    const handlePolishService = useCallback(async () => {
        if (!hasContent(briefData.service)) {
            toast({
                title: 'Nothing to Polish',
                description: 'Enter some content first, then polish it',
                variant: 'destructive',
            });
            return;
        }
        setIsPolishingService(true);
        try {
            const result = await generateServiceApi(briefData.service);
            setBriefData(prev => ({
                ...prev,
                service: result.content,
            }));
            // Persist polished content to database
            if (stakeholderId) {
                await fetch(`/api/projects/${projectId}/stakeholders/${stakeholderId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ briefServices: result.content }),
                });
            }
            toast({
                title: 'Service Polished',
                description: buildSourceDescription(result.metadata, result.sources.length),
            });
        } catch (error) {
            toast({
                title: 'Polish Failed',
                description: error instanceof Error ? error.message : 'Failed to polish',
                variant: 'destructive',
            });
        } finally {
            setIsPolishingService(false);
        }
    }, [generateServiceApi, briefData.service, toast, stakeholderId, projectId]);

    /**
     * Generate Deliverables field from scratch using Unified Field Generation
     */
    const handleGenerateDeliverables = useCallback(async () => {
        try {
            const result = await generateDeliverablesApi('');
            setBriefData(prev => ({
                ...prev,
                deliverables: result.content,
            }));
            // Persist generated content to database
            if (stakeholderId) {
                await fetch(`/api/projects/${projectId}/stakeholders/${stakeholderId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ briefDeliverables: result.content }),
                });
            }
            toast({
                title: 'Deliverables Generated',
                description: buildSourceDescription(result.metadata, result.sources.length),
            });
        } catch (error) {
            toast({
                title: 'Generation Failed',
                description: error instanceof Error ? error.message : 'Failed to generate',
                variant: 'destructive',
            });
        }
    }, [generateDeliverablesApi, toast, stakeholderId, projectId]);

    /**
     * Polish Deliverables field by enhancing existing content
     */
    const handlePolishDeliverables = useCallback(async () => {
        if (!hasContent(briefData.deliverables)) {
            toast({
                title: 'Nothing to Polish',
                description: 'Enter some content first, then polish it',
                variant: 'destructive',
            });
            return;
        }
        setIsPolishingDeliverables(true);
        try {
            const result = await generateDeliverablesApi(briefData.deliverables);
            setBriefData(prev => ({
                ...prev,
                deliverables: result.content,
            }));
            // Persist polished content to database
            if (stakeholderId) {
                await fetch(`/api/projects/${projectId}/stakeholders/${stakeholderId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ briefDeliverables: result.content }),
                });
            }
            toast({
                title: 'Deliverables Polished',
                description: buildSourceDescription(result.metadata, result.sources.length),
            });
        } catch (error) {
            toast({
                title: 'Polish Failed',
                description: error instanceof Error ? error.message : 'Failed to polish',
                variant: 'destructive',
            });
        } finally {
            setIsPolishingDeliverables(false);
        }
    }, [generateDeliverablesApi, briefData.deliverables, toast, stakeholderId, projectId]);

    if (isLoading) {
        return (
            <div className="p-8 text-center text-[var(--color-text-muted)]">
                <p>Loading RFT data...</p>
            </div>
        );
    }

    const rftLabel = `RFT ${contextName}`;

    // Helper to check if HTML content has actual text (not just empty tags)
    const hasContent = (html: string) => {
        const textContent = html.replace(/<[^>]*>/g, '').trim();
        return textContent.length > 0;
    };

    const handleBriefChange = (field: 'service' | 'deliverables', value: string) => {
        setBriefData(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveBrief = async (field: 'service' | 'deliverables') => {
        if (!stakeholderId) return;
        setIsSavingBrief(true);
        try {
            const payload: Record<string, string> = {};
            if (field === 'service') payload.briefServices = briefData.service;
            if (field === 'deliverables') payload.briefDeliverables = briefData.deliverables;
            await fetch(`/api/projects/${projectId}/stakeholders/${stakeholderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        } catch (error) {
            console.error('Failed to save brief', error);
        } finally {
            setIsSavingBrief(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* 1. Project Information Table */}
            <div className="overflow-hidden rounded-lg">
                <table className="w-full text-sm">
                    <tbody>
                        <tr className="border-b border-[var(--color-border)]">
                            <td className="w-36 px-4 py-2.5 text-[var(--color-document-header)] font-medium">
                                Project Name
                            </td>
                            <td className="px-4 py-2.5 text-[var(--color-text-primary)]" colSpan={2}>
                                {projectDetails?.projectName || 'Loading...'}
                            </td>
                        </tr>
                        <tr className="border-b border-[var(--color-border)]">
                            <td className="px-4 py-2.5 text-[var(--color-document-header)] font-medium">
                                Address
                            </td>
                            <td className="px-4 py-2.5 text-[var(--color-text-primary)]" colSpan={2}>
                                {projectDetails?.address || '-'}
                            </td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2.5 text-[var(--color-document-header)] font-medium">
                                Document
                            </td>
                            <td className="px-4 py-2.5 text-[var(--color-text-primary)] font-semibold">
                                {rftLabel}
                            </td>
                            <td
                                className="w-44 px-4 py-2.5 text-[var(--color-document-header)] font-medium cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors relative text-right"
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
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                    Objectives
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    {/* Left: Functional & Quality */}
                    <div className="overflow-hidden rounded-lg">
                        <div className="px-4 py-2.5 text-[var(--color-document-header)] font-medium text-sm border-b border-[var(--color-border)]">
                            Functional & Quality
                        </div>
                        <div className="px-4 py-2.5 text-[var(--color-text-primary)] text-sm">
                            {objectives.functionalQuality ? (
                                objectives.functionalQuality.includes('<') ? (
                                    <div
                                        className="[&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_u]:underline"
                                        dangerouslySetInnerHTML={{ __html: objectives.functionalQuality }}
                                    />
                                ) : (
                                    <div className="whitespace-pre-wrap">{objectives.functionalQuality}</div>
                                )
                            ) : '-'}
                        </div>
                    </div>
                    {/* Right: Planning & Compliance */}
                    <div className="overflow-hidden rounded-lg">
                        <div className="px-4 py-2.5 text-[var(--color-document-header)] font-medium text-sm border-b border-[var(--color-border)]">
                            Planning & Compliance
                        </div>
                        <div className="px-4 py-2.5 text-[var(--color-text-primary)] text-sm">
                            {objectives.planningCompliance ? (
                                objectives.planningCompliance.includes('<') ? (
                                    <div
                                        className="[&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_u]:underline"
                                        dangerouslySetInnerHTML={{ __html: objectives.planningCompliance }}
                                    />
                                ) : (
                                    <div className="whitespace-pre-wrap">{objectives.planningCompliance}</div>
                                )
                            ) : '-'}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Brief Section - Service & Deliverables side by side */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                    Brief
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    {/* Left: Service */}
                    <div className="overflow-hidden rounded-lg">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
                            <span className="text-[var(--color-document-header)] font-medium text-sm">Service</span>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleGenerateService}
                                    disabled={isGeneratingService || isPolishingService}
                                    className={`
                                        flex items-center gap-1.5 text-sm font-medium transition-all
                                        ${isGeneratingService
                                            ? 'text-[var(--color-accent-copper)] cursor-wait'
                                            : isPolishingService
                                                ? 'text-[var(--color-text-muted)] cursor-not-allowed opacity-50'
                                                : 'text-[var(--color-accent-copper)] hover:opacity-80'
                                        }
                                    `}
                                    title="Generate short bullet points (2-5 words each)"
                                >
                                    <DiamondIcon className={cn('w-4 h-4', isGeneratingService && 'animate-spin [animation-duration:2.5s]')} variant="empty" />
                                    <span className={isGeneratingService ? 'animate-text-aurora' : ''}>{isGeneratingService ? 'Generating...' : 'Generate'}</span>
                                </button>
                                <button
                                    onClick={handlePolishService}
                                    disabled={isGeneratingService || isPolishingService || !hasContent(briefData.service)}
                                    className={`
                                        flex items-center gap-1.5 text-sm font-medium transition-all
                                        ${isPolishingService
                                            ? 'text-[var(--color-accent-copper)] cursor-wait'
                                            : (isGeneratingService || !hasContent(briefData.service))
                                                ? 'text-[var(--color-text-muted)] cursor-not-allowed opacity-50'
                                                : 'text-[var(--color-accent-copper)] hover:opacity-80'
                                        }
                                    `}
                                    title="Expand bullets to full descriptions (10-15 words)"
                                >
                                    <DiamondIcon className={cn('w-4 h-4', isPolishingService && 'animate-spin [animation-duration:2.5s]')} variant="filled" />
                                    <span className={isPolishingService ? 'animate-text-aurora' : ''}>{isPolishingService ? 'Polishing...' : 'Polish'}</span>
                                </button>
                            </div>
                        </div>
                        <RichTextEditor
                            content={briefData.service}
                            onChange={(content) => handleBriefChange('service', content)}
                            onBlur={() => handleSaveBrief('service')}
                            placeholder="Enter service details..."
                            disabled={isGeneratingService || isPolishingService}
                            variant="mini"
                            toolbarVariant="mini"
                            transparentBg
                            className="border-0 rounded-none"
                            editorClassName="bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-primary)] transition-colors [&_strong]:text-black [&_strong]:font-semibold"
                        />
                    </div>
                    {/* Right: Deliverables */}
                    <div className="overflow-hidden rounded-lg">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
                            <span className="text-[var(--color-document-header)] font-medium text-sm">Deliverables</span>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleGenerateDeliverables}
                                    disabled={isGeneratingDeliverables || isPolishingDeliverables}
                                    className={`
                                        flex items-center gap-1.5 text-sm font-medium transition-all
                                        ${isGeneratingDeliverables
                                            ? 'text-[var(--color-accent-copper)] cursor-wait'
                                            : isPolishingDeliverables
                                                ? 'text-[var(--color-text-muted)] cursor-not-allowed opacity-50'
                                                : 'text-[var(--color-accent-copper)] hover:opacity-80'
                                        }
                                    `}
                                    title="Generate short bullet points (2-5 words each)"
                                >
                                    <DiamondIcon className={cn('w-4 h-4', isGeneratingDeliverables && 'animate-spin [animation-duration:2.5s]')} variant="empty" />
                                    <span className={isGeneratingDeliverables ? 'animate-text-aurora' : ''}>{isGeneratingDeliverables ? 'Generating...' : 'Generate'}</span>
                                </button>
                                <button
                                    onClick={handlePolishDeliverables}
                                    disabled={isGeneratingDeliverables || isPolishingDeliverables || !hasContent(briefData.deliverables)}
                                    className={`
                                        flex items-center gap-1.5 text-sm font-medium transition-all
                                        ${isPolishingDeliverables
                                            ? 'text-[var(--color-accent-copper)] cursor-wait'
                                            : (isGeneratingDeliverables || !hasContent(briefData.deliverables))
                                                ? 'text-[var(--color-text-muted)] cursor-not-allowed opacity-50'
                                                : 'text-[var(--color-accent-copper)] hover:opacity-80'
                                        }
                                    `}
                                    title="Expand bullets to full descriptions (10-15 words)"
                                >
                                    <DiamondIcon className={cn('w-4 h-4', isPolishingDeliverables && 'animate-spin [animation-duration:2.5s]')} variant="filled" />
                                    <span className={isPolishingDeliverables ? 'animate-text-aurora' : ''}>{isPolishingDeliverables ? 'Polishing...' : 'Polish'}</span>
                                </button>
                            </div>
                        </div>
                        <RichTextEditor
                            content={briefData.deliverables}
                            onChange={(content) => handleBriefChange('deliverables', content)}
                            onBlur={() => handleSaveBrief('deliverables')}
                            placeholder="Enter deliverables..."
                            disabled={isGeneratingDeliverables || isPolishingDeliverables}
                            variant="mini"
                            toolbarVariant="mini"
                            transparentBg
                            className="border-0 rounded-none"
                            editorClassName="bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-primary)] transition-colors [&_strong]:text-black [&_strong]:font-semibold"
                        />
                    </div>
                </div>
                {isSavingBrief && (
                    <span className="text-xs text-[var(--color-accent-copper)]">Saving...</span>
                )}
            </div>

            {/* 4. Program Section - Visual Gantt */}
            <ProgramGanttSection activities={programActivities} zoomLevel={zoomLevel} />

            {/* 5. Fee Section */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                    Fee
                </h3>
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
