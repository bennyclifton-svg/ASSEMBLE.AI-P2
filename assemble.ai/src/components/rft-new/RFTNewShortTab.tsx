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
import { AIGenerateIcon } from '@/components/ui/ai-generate-icon';
import { useToast } from '@/components/ui/use-toast';
import { useFieldGeneration } from '@/lib/hooks/use-field-generation';

function formatDisplayDate(dateString: string): string {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

interface ProjectDetails {
    projectName: string;
    address: string;
}

interface PlanningObjectives {
    functional?: string;
    quality?: string;
    budget?: string;
    program?: string;
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
    color: string | null;
    sortOrder: number;
}

interface RFTNewShortTabProps {
    projectId: string;
    rftNew: RftNew;
    contextName: string;
    contextType: 'discipline' | 'trade';
    disciplineId?: string | null;
    tradeId?: string | null;
    onDateChange?: (date: string) => void;
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

// Generate weekly columns with month grouping
interface WeekColumn {
    start: Date;
    dayLabel: number;
    month: string;
    year: number;
}

function generateWeekColumnsWithMonths(startDate: Date, endDate: Date): WeekColumn[] {
    const columns: WeekColumn[] = [];
    const current = getWeekStart(startDate);
    const end = new Date(endDate);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    while (current <= end) {
        columns.push({
            start: new Date(current),
            dayLabel: current.getDate(),
            month: months[current.getMonth()],
            year: current.getFullYear(),
        });
        current.setDate(current.getDate() + 7);
    }
    return columns;
}

// Group columns by month for header
function groupColumnsByMonth(columns: WeekColumn[]): { label: string; count: number }[] {
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

// Program Gantt Section Component - matches Program module appearance
function ProgramGanttSection({ activities }: { activities: ProgramActivity[] }) {
    // Filter activities with dates and calculate date range
    const activitiesWithDates = activities.filter(a => a.startDate && a.endDate);

    if (activitiesWithDates.length === 0) {
        return (
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[#cccccc] uppercase tracking-wide">
                    Program
                </h3>
                <div className="border border-[#3e3e42] rounded overflow-hidden">
                    <div className="px-4 py-3 text-[#858585] text-sm">
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

    // Generate week columns with month info
    const weekColumns = generateWeekColumnsWithMonths(minDate, maxDate);
    const monthGroups = groupColumnsByMonth(weekColumns);
    const totalDuration = maxDate.getTime() - minDate.getTime();
    const columnWidth = 50; // pixels per week column

    // Build hierarchy (parent activities first, then children)
    const parentActivities = activities.filter(a => !a.parentId);
    const childActivities = activities.filter(a => a.parentId);

    // Order activities: parent followed by its children
    const orderedActivities: ProgramActivity[] = [];
    parentActivities.forEach(parent => {
        orderedActivities.push(parent);
        const children = childActivities.filter(c => c.parentId === parent.id);
        children.sort((a, b) => a.sortOrder - b.sortOrder);
        orderedActivities.push(...children);
    });
    // Add any orphaned activities
    childActivities.filter(c => !parentActivities.some(p => p.id === c.parentId)).forEach(a => {
        orderedActivities.push(a);
    });

    // Calculate bar position for an activity
    const calculateBarPosition = (activity: ProgramActivity) => {
        if (!activity.startDate || !activity.endDate) return null;

        const activityStart = new Date(activity.startDate);
        const activityEnd = new Date(activity.endDate);

        if (totalDuration === 0) {
            return { left: 0, width: weekColumns.length * columnWidth };
        }

        const leftPercent = (activityStart.getTime() - minDate.getTime()) / totalDuration;
        const widthPercent = (activityEnd.getTime() - activityStart.getTime()) / totalDuration;
        const totalWidth = weekColumns.length * columnWidth;

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
        ? ((today.getTime() - minDate.getTime()) / totalDuration) * (weekColumns.length * columnWidth)
        : null;
    const showTodayLine = todayPosition !== null && todayPosition >= 0 && todayPosition <= weekColumns.length * columnWidth;

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#cccccc] uppercase tracking-wide">
                Program
            </h3>
            <div className="border border-[#3e3e42] rounded overflow-hidden bg-[#1e1e1e]">
                <div className="overflow-x-auto">
                    <div style={{ minWidth: `${160 + weekColumns.length * columnWidth}px` }}>
                        {/* Header: Month row */}
                        <div className="flex border-b border-[#3e3e42] bg-[#252526]">
                            <div className="w-40 flex-shrink-0 px-3 py-1.5 text-[#858585] text-xs font-medium border-r border-[#3e3e42]">
                                Activity
                            </div>
                            <div className="flex">
                                {monthGroups.map((group, i) => (
                                    <div
                                        key={i}
                                        className="text-center text-[#858585] text-xs py-1.5 border-r border-[#3e3e42] last:border-r-0"
                                        style={{ width: `${group.count * columnWidth}px` }}
                                    >
                                        {group.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Header: Day numbers row */}
                        <div className="flex border-b border-[#3e3e42] bg-[#252526]">
                            <div className="w-40 flex-shrink-0 border-r border-[#3e3e42]" />
                            <div className="flex">
                                {weekColumns.map((col, i) => (
                                    <div
                                        key={i}
                                        className="text-center text-[#858585] text-xs py-1 border-r border-[#3e3e42] last:border-r-0"
                                        style={{ width: `${columnWidth}px` }}
                                    >
                                        {col.dayLabel}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Activity rows */}
                        {orderedActivities.map((activity) => {
                            const barPos = calculateBarPosition(activity);
                            const isChild = !!activity.parentId;
                            const color = getActivityColor();

                            return (
                                <div
                                    key={activity.id}
                                    className="flex border-b border-[#3e3e42] last:border-b-0 hover:bg-[#2a2a2a]"
                                >
                                    {/* Activity name cell with indentation for children */}
                                    <div
                                        className={`w-40 flex-shrink-0 py-2 border-r border-[#3e3e42] flex items-center gap-2 ${isChild ? 'pl-6 pr-2' : 'px-3'}`}
                                    >
                                        {/* Collapse indicator for parents */}
                                        {!isChild && (
                                            <svg className="w-3 h-3 text-[#858585] flex-shrink-0" viewBox="0 0 12 12" fill="currentColor">
                                                <path d="M4 2l4 4-4 4V2z" />
                                            </svg>
                                        )}
                                        {/* Color indicator for children */}
                                        {isChild && (
                                            <div
                                                className="w-1 h-4 flex-shrink-0"
                                                style={{ backgroundColor: color }}
                                            />
                                        )}
                                        <span className={`text-xs truncate ${isChild ? 'text-[#a0a0a0]' : 'text-[#cccccc] font-medium'}`}>
                                            {activity.name}
                                        </span>
                                    </div>

                                    {/* Timeline cell */}
                                    <div
                                        className="relative py-2"
                                        style={{ width: `${weekColumns.length * columnWidth}px` }}
                                    >
                                        {/* Grid lines */}
                                        <div className="absolute inset-0 flex">
                                            {weekColumns.map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="border-r border-[#3e3e42] last:border-r-0"
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
    contextType,
    disciplineId,
    tradeId,
    onDateChange,
}: RFTNewShortTabProps) {
    const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
    const [objectives, setObjectives] = useState<PlanningObjectives>({});
    const [programActivities, setProgramActivities] = useState<ProgramActivity[]>([]);
    const [briefData, setBriefData] = useState({ service: '', deliverables: '' });
    const [isSavingBrief, setIsSavingBrief] = useState(false);
    const [costLines, setCostLines] = useState<CostLine[]>([]);

    // Unified Field Generation hooks for Brief fields
    const {
        generate: generateService,
        isGenerating: isGeneratingService,
    } = useFieldGeneration({
        fieldType: 'brief.service',
        projectId,
        disciplineId: disciplineId || undefined,
        tradeId: tradeId || undefined,
    });

    const {
        generate: generateDeliverables,
        isGenerating: isGeneratingDeliverables,
    } = useFieldGeneration({
        fieldType: 'brief.deliverables',
        projectId,
        disciplineId: disciplineId || undefined,
        tradeId: tradeId || undefined,
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

                    // Set Objectives
                    if (data.objectives) {
                        setObjectives({
                            functional: data.objectives.functional || '',
                            quality: data.objectives.quality || '',
                            budget: data.objectives.budget || '',
                            program: data.objectives.program || '',
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

                // Fetch cost lines filtered by discipline/trade
                let costUrl = `/api/projects/${projectId}/cost-lines`;
                if (disciplineId) {
                    costUrl += `?disciplineId=${disciplineId}`;

                    // Fetch Consultant Brief info
                    const discRes = await fetch(`/api/planning/${projectId}/consultants/${disciplineId}`);
                    if (discRes.ok) {
                        const discData = await discRes.json();
                        setBriefData({
                            service: discData.briefServices || '',
                            deliverables: discData.briefDeliverables || '',
                        });
                    }
                } else if (tradeId) {
                    costUrl += `?tradeId=${tradeId}`;

                    // Fetch Contractor Scope info
                    const tradeRes = await fetch(`/api/planning/${projectId}/contractors/${tradeId}`);
                    if (tradeRes.ok) {
                        const tradeData = await tradeRes.json();
                        setBriefData({
                            service: tradeData.scopeWorks || '',
                            deliverables: tradeData.scopeDeliverables || '',
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
    }, [projectId, disciplineId, tradeId]);

    /**
     * Generate Service field using Unified Field Generation
     * Uses existing text as input for interpretation (instruction, enhance, generate)
     */
    const handleGenerateService = useCallback(async () => {
        try {
            const result = await generateService(briefData.service);
            setBriefData(prev => ({
                ...prev,
                service: result.content,
            }));
            toast({
                title: 'Service Generated',
                description: `Generated using ${result.sources.length} source(s) from Knowledge Source`,
            });
        } catch (error) {
            toast({
                title: 'Generation Failed',
                description: error instanceof Error ? error.message : 'Failed to generate',
                variant: 'destructive',
            });
        }
    }, [generateService, briefData.service, toast]);

    /**
     * Generate Deliverables field using Unified Field Generation
     */
    const handleGenerateDeliverables = useCallback(async () => {
        try {
            const result = await generateDeliverables(briefData.deliverables);
            setBriefData(prev => ({
                ...prev,
                deliverables: result.content,
            }));
            toast({
                title: 'Deliverables Generated',
                description: `Generated using ${result.sources.length} source(s) from Knowledge Source`,
            });
        } catch (error) {
            toast({
                title: 'Generation Failed',
                description: error instanceof Error ? error.message : 'Failed to generate',
                variant: 'destructive',
            });
        }
    }, [generateDeliverables, briefData.deliverables, toast]);

    if (isLoading) {
        return (
            <div className="p-8 text-center text-[#858585]">
                <p>Loading RFT data...</p>
            </div>
        );
    }

    const rftLabel = `RFT ${contextName}`;

    const handleBriefChange = (field: 'service' | 'deliverables', value: string) => {
        setBriefData(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveBrief = async (field: 'service' | 'deliverables') => {
        setIsSavingBrief(true);
        try {
            const payload: Record<string, string> = {};
            if (disciplineId) {
                if (field === 'service') payload.briefServices = briefData.service;
                if (field === 'deliverables') payload.briefDeliverables = briefData.deliverables;
                await fetch(`/api/planning/${projectId}/consultants/${disciplineId}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
            } else if (tradeId) {
                if (field === 'service') payload.scopeWorks = briefData.service;
                if (field === 'deliverables') payload.scopeDeliverables = briefData.deliverables;
                await fetch(`/api/planning/${projectId}/contractors/${tradeId}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
            }
        } catch (error) {
            console.error('Failed to save brief', error);
        } finally {
            setIsSavingBrief(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* 1. Project Information Table */}
            <div className="border border-[#3e3e42] rounded overflow-hidden">
                <table className="w-full text-sm">
                    <tbody>
                        <tr className="border-b border-[#3e3e42]">
                            <td className="w-36 px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium">
                                Project Name
                            </td>
                            <td className="px-4 py-2.5 text-[#cccccc]" colSpan={2}>
                                {projectDetails?.projectName || 'Loading...'}
                            </td>
                        </tr>
                        <tr className="border-b border-[#3e3e42]">
                            <td className="px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium">
                                Address
                            </td>
                            <td className="px-4 py-2.5 text-[#cccccc]" colSpan={2}>
                                {projectDetails?.address || '-'}
                            </td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium">
                                Document
                            </td>
                            <td className="px-4 py-2.5 text-[#cccccc] font-semibold">
                                {rftLabel}
                            </td>
                            <td
                                className="w-36 px-4 py-2.5 text-[rgb(187,235,255)] border-l border-[#3e3e42] cursor-pointer hover:bg-[#2a2a2a] transition-colors relative"
                                onClick={handleDateClick}
                            >
                                <span className="select-none">{formatDisplayDate(rftDate)}</span>
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
                <h3 className="text-sm font-semibold text-[#cccccc] uppercase tracking-wide">
                    Objectives
                </h3>
                <div className="border border-[#3e3e42] rounded overflow-hidden">
                    <table className="w-full text-sm">
                        <tbody>
                            <tr className="border-b border-[#3e3e42]">
                                <td className="w-36 px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium">
                                    Functional
                                </td>
                                <td className="px-4 py-2.5 text-[#cccccc] whitespace-pre-wrap">
                                    {objectives.functional || '-'}
                                </td>
                            </tr>
                            <tr className="border-b border-[#3e3e42]">
                                <td className="px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium">
                                    Quality
                                </td>
                                <td className="px-4 py-2.5 text-[#cccccc] whitespace-pre-wrap">
                                    {objectives.quality || '-'}
                                </td>
                            </tr>
                            <tr className="border-b border-[#3e3e42]">
                                <td className="px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium">
                                    Budget
                                </td>
                                <td className="px-4 py-2.5 text-[#cccccc] whitespace-pre-wrap">
                                    {objectives.budget || '-'}
                                </td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium">
                                    Program
                                </td>
                                <td className="px-4 py-2.5 text-[#cccccc] whitespace-pre-wrap">
                                    {objectives.program || '-'}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 3. Brief Section */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#cccccc] uppercase tracking-wide">
                        Brief
                    </h3>
                    {isSavingBrief && (
                        <span className="text-xs text-[#4fc1ff]">Saving...</span>
                    )}
                </div>
                <div className="border border-[#3e3e42] rounded overflow-hidden">
                    <table className="w-full text-sm">
                        <tbody>
                            <tr className="border-b border-[#3e3e42]">
                                <td className="w-36 px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium align-top pt-4">
                                    <div className="flex items-center gap-2">
                                        <span>Service</span>
                                        <AIGenerateIcon
                                            size={12}
                                            className="text-[#4fc1ff] hover:text-[#6fd1ff]"
                                            onClick={handleGenerateService}
                                            isLoading={isGeneratingService}
                                            disabled={isGeneratingService}
                                            title="Generate service description with AI"
                                        />
                                    </div>
                                </td>
                                <td className="p-0">
                                    <Textarea
                                        value={briefData.service}
                                        onChange={(e) => handleBriefChange('service', e.target.value)}
                                        onBlur={() => handleSaveBrief('service')}
                                        placeholder="Enter service details or instructions for AI (e.g., 'list 4 key services')..."
                                        disabled={isGeneratingService}
                                        className="w-full border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-[#1a1a1a] text-[#cccccc] resize-y min-h-[100px] p-4 border-l-2 border-l-[#4fc1ff]/30 hover:border-l-[#4fc1ff] hover:bg-[#1e1e1e] transition-colors cursor-text disabled:opacity-70"
                                        style={{ fieldSizing: 'content' } as React.CSSProperties}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium align-top pt-4">
                                    <div className="flex items-center gap-2">
                                        <span>Deliverables</span>
                                        <AIGenerateIcon
                                            size={12}
                                            className="text-[#4fc1ff] hover:text-[#6fd1ff]"
                                            onClick={handleGenerateDeliverables}
                                            isLoading={isGeneratingDeliverables}
                                            disabled={isGeneratingDeliverables}
                                            title="Generate deliverables with AI"
                                        />
                                    </div>
                                </td>
                                <td className="p-0">
                                    <Textarea
                                        value={briefData.deliverables}
                                        onChange={(e) => handleBriefChange('deliverables', e.target.value)}
                                        onBlur={() => handleSaveBrief('deliverables')}
                                        placeholder="Enter deliverables or instructions for AI..."
                                        disabled={isGeneratingDeliverables}
                                        className="w-full border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-[#1a1a1a] text-[#cccccc] resize-y min-h-[100px] p-4 border-l-2 border-l-[#4fc1ff]/30 hover:border-l-[#4fc1ff] hover:bg-[#1e1e1e] transition-colors cursor-text disabled:opacity-70"
                                        style={{ fieldSizing: 'content' } as React.CSSProperties}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 4. Program Section - Visual Gantt */}
            <ProgramGanttSection activities={programActivities} />

            {/* 5. Fee Section */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[#cccccc] uppercase tracking-wide">
                    Fee
                </h3>
                <div className="border border-[#3e3e42] rounded overflow-hidden">
                    {costLines.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead className="bg-[#2d2d30]">
                                <tr className="border-b border-[#3e3e42]">
                                    <th className="px-4 py-2.5 text-left text-[#858585] font-medium w-[70%]">Description</th>
                                    <th className="px-4 py-2.5 text-left text-[#858585] font-medium w-[30%]">Amount (Excl. GST)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Existing Cost Lines */}
                                {costLines.map((line) => (
                                    <tr key={line.id} className="border-b border-[#3e3e42]">
                                        <td className="px-4 py-2.5 text-[#cccccc]">{line.activity}</td>
                                        <td className="px-4 py-2.5 text-[#cccccc]">
                                            {/* Amount left empty for consultant to nominate */}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="px-4 py-3 text-[#858585] text-sm">
                            No cost plan items for this {contextType}
                        </div>
                    )}
                </div>
            </div>

            {/* 6. Transmittal Section */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[#cccccc] uppercase tracking-wide">
                    Transmittal
                </h3>
                <RFTNewTransmittalSchedule rftNewId={rftNew.id} />
            </div>
        </div>
    );
}
