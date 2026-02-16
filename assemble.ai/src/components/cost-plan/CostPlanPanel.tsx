'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Plus, Trash, GripVertical, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCostPlan, useCostLineMutations } from '@/lib/hooks/cost-plan';
import { useStakeholders } from '@/lib/hooks/use-stakeholders';
import { formatCurrency } from '@/lib/calculations/cost-plan-formulas';
import { VariationsPanel } from './VariationsPanel';
import { InvoicesPanel } from './InvoicesPanel';
import { PaymentSchedulePanel } from './PaymentSchedulePanel';
import { ApplyEstimateDialog, type BudgetUpdate, type NewBudgetLine } from './ApplyEstimateDialog';
import { DisciplineDropdown } from './cells/DisciplineDropdown';
import { DiamondIcon } from '@/components/ui/diamond-icon';
import { ProgramActivitySelector } from './ProgramActivitySelector';
import { AuroraConfirmDialog } from '@/components/ui/aurora-confirm-dialog';
import type { CostLineSection, CostLineWithCalculations, GroupedLine, GroupedLineTotals } from '@/types/cost-plan';
import type { ProgramActivity } from '@/types/program';

// App color palette - Aurora theme with explicit colors
const COLORS = {
    bg: {
        primary: 'var(--color-bg-primary)',
        secondary: 'var(--color-bg-secondary)',
        tertiary: 'var(--color-bg-tertiary)',
        hover: 'var(--color-bg-tertiary)',
    },
    text: {
        primary: 'var(--color-text-primary)',
        secondary: 'var(--color-text-muted)',
        muted: 'var(--color-text-muted)',
    },
    border: {
        primary: 'var(--color-border)',
        secondary: 'var(--color-border)',
    },
    accent: {
        blue: '#0080FF',           // Aurora Blue
        cyan: '#1776c1',           // Aurora Cyan (primary accent)
        teal: '#14B8A6',           // Aurora Teal
        costPlan: '#1776c1',       // Aurora Cyan - unified accent
        variation: '#1776c1',      // Aurora Cyan - unified accent
        invoice: '#1776c1',        // Aurora Cyan - unified accent
    },
    status: {
        positive: '#4ade80',
        negative: '#f87171',
    },
};

const SECTION_NAMES: Record<CostLineSection, string> = {
    FEES: 'DEVELOPER',
    CONSULTANTS: 'CONSULTANTS',
    CONSTRUCTION: 'CONSTRUCTION',
    CONTINGENCY: 'CONTINGENCY',
};

const SECTIONS: CostLineSection[] = ['FEES', 'CONSULTANTS', 'CONSTRUCTION', 'CONTINGENCY'];

interface CostPlanPanelProps {
    projectId: string;
}

export function CostPlanPanel({ projectId }: CostPlanPanelProps) {
    const [activeTab, setActiveTab] = useState('cost-plan');

    return (
        <div className="h-full flex flex-col">
            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex-1 flex flex-col min-h-0"
            >
                <TabsList className="w-full justify-start bg-transparent border-b border-[var(--color-border)]/50 rounded-none h-auto p-0 pl-[20%]">
                    <TabsTrigger
                        value="cost-plan"
                        className="tab-aurora-sub rounded-none px-4 py-2 text-[var(--color-text-muted)] text-xs font-medium transition-all duration-200 hover:text-[var(--color-text-primary)] hover:bg-white/10 data-[state=active]:bg-transparent data-[state=active]:text-[var(--color-text-primary)]"
                    >
                        Cost Plan
                    </TabsTrigger>
                    <TabsTrigger
                        value="variations"
                        className="tab-aurora-sub rounded-none px-4 py-2 text-[var(--color-text-muted)] text-xs font-medium transition-all duration-200 hover:text-[var(--color-text-primary)] hover:bg-white/10 data-[state=active]:bg-transparent data-[state=active]:text-[var(--color-text-primary)]"
                    >
                        Variations
                    </TabsTrigger>
                    <TabsTrigger
                        value="invoices"
                        className="tab-aurora-sub rounded-none px-4 py-2 text-[var(--color-text-muted)] text-xs font-medium transition-all duration-200 hover:text-[var(--color-text-primary)] hover:bg-white/10 data-[state=active]:bg-transparent data-[state=active]:text-[var(--color-text-primary)]"
                    >
                        Invoices
                    </TabsTrigger>
                    <TabsTrigger
                        value="payment-schedule"
                        className="tab-aurora-sub rounded-none px-4 py-2 text-[var(--color-text-muted)] text-xs font-medium transition-all duration-200 hover:text-[var(--color-text-primary)] hover:bg-white/10 data-[state=active]:bg-transparent data-[state=active]:text-[var(--color-text-primary)]"
                    >
                        Payment Schedule
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="cost-plan" className="flex-1 flex flex-col mt-0 min-h-0 overflow-hidden">
                    <CostPlanSpreadsheet projectId={projectId} />
                </TabsContent>

                <TabsContent value="variations" className="flex-1 flex flex-col mt-0 min-h-0 overflow-hidden">
                    <VariationsPanel projectId={projectId} />
                </TabsContent>

                <TabsContent value="invoices" className="flex-1 flex flex-col mt-0 min-h-0 overflow-hidden">
                    <InvoicesPanel projectId={projectId} />
                </TabsContent>

                <TabsContent value="payment-schedule" className="flex-1 flex flex-col mt-0 min-h-0 overflow-hidden">
                    <PaymentSchedulePanel projectId={projectId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

interface CostPlanSpreadsheetProps {
    projectId: string;
}

function CostPlanSpreadsheet({ projectId }: CostPlanSpreadsheetProps) {
    // Month selector state - defaults to current month
    const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number }>({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
    });

    const { costLines, totals, isLoading, error, refetch } = useCostPlan(projectId, selectedMonth);
    const { createCostLine, updateCostLine, deleteCostLine, bulkDeleteCostLines, reorderCostLines, isSubmitting } = useCostLineMutations(projectId);

    // Fetch stakeholders for dropdown options (replaces old disciplines/trades)
    const { stakeholders } = useStakeholders({ projectId });

    // Map stakeholders to dropdown options by group
    // CONSULTANTS section uses consultant stakeholders
    // CONSTRUCTION section uses contractor stakeholders
    // Note: stakeholder.name now contains the short discipline name (aligned with disciplineOrTrade)
    const disciplineOptions = stakeholders
        .filter(s => s.stakeholderGroup === 'consultant' && s.isEnabled)
        .map((s, index) => ({
            id: s.id,
            name: s.name || s.disciplineOrTrade || 'Unknown',
            isEnabled: true,
            order: s.sortOrder ?? index,
        }));
    const tradeOptions = stakeholders
        .filter(s => s.stakeholderGroup === 'contractor' && s.isEnabled)
        .map((s, index) => ({
            id: s.id,
            name: s.name || s.disciplineOrTrade || 'Unknown',
            isEnabled: true,
            order: s.sortOrder ?? index,
        }));

    const [showAddRow, setShowAddRow] = useState<CostLineSection | null>(null);
    const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; activity: string } | null>(null);
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
    const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
    const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [estimateDialogOpen, setEstimateDialogOpen] = useState(false);

    // Profiler estimate data for Apply Budget Estimate
    const [profilerData, setProfilerData] = useState<{
        buildingClass: string | null;
        estimateLowCents: number;
        estimateHighCents: number;
    } | null>(null);

    // Fetch profiler data on mount
    useEffect(() => {
        async function fetchProfile() {
            try {
                const res = await fetch(`/api/projects/${projectId}/profile`);
                if (!res.ok) return;
                const json = await res.json();
                const data = json.data || json;
                if (!data?.buildingClass || !data?.scaleData) return;

                const { buildingClass, subclass, scaleData, complexity } = data;
                const region = data.region || 'AU';

                // Replicate ContextChips NCC class lookup
                const NCC_CLASS_MAP: Record<string, Record<string, string>> = {
                    residential: { house: 'Class 1a', apartments: 'Class 2', townhouses: 'Class 1a/2', btr: 'Class 2', student_housing: 'Class 3', retirement_living_ilu: 'Class 1a/2/3', aged_care_9c: 'Class 9c', social_affordable: 'Class 2' },
                    commercial: { office: 'Class 5', retail_shopping: 'Class 6', retail_standalone: 'Class 6', hotel: 'Class 3', food_beverage: 'Class 6', serviced_office: 'Class 5' },
                    industrial: { warehouse: 'Class 7b', logistics: 'Class 7b', manufacturing: 'Class 8', cold_storage: 'Class 7b', data_centre: 'Class 7b', dangerous_goods: 'Class 7a' },
                    institution: { education_early: 'Class 9b', education_school: 'Class 9b', education_tertiary: 'Class 9b', healthcare_hospital: 'Class 9a', healthcare_medical: 'Class 5/9a', healthcare_clinic: 'Class 5/9a', government: 'Class 5/9b', religious: 'Class 9b' },
                };
                const nccClass = NCC_CLASS_MAP[buildingClass]?.[subclass?.[0]] || null;

                // Replicate ContextChips cost range lookup
                const COST_RANGES: Record<string, { low: number; high: number }> = {
                    residential_standard: { low: 2500, high: 4500 },
                    residential_premium: { low: 4000, high: 7500 },
                    residential_luxury: { low: 6000, high: 12000 },
                    commercial_office: { low: 3000, high: 6000 },
                    commercial_hotel: { low: 4000, high: 10000 },
                    commercial_retail: { low: 2500, high: 6000 },
                    industrial_warehouse: { low: 800, high: 2000 },
                    industrial_data_centre: { low: 15000, high: 30000 },
                    institution_education: { low: 3500, high: 7000 },
                    institution_healthcare: { low: 6000, high: 18000 },
                };
                const qualityTierValue = complexity?.quality_tier || complexity?.grade;
                const qualityTier = (Array.isArray(qualityTierValue) ? qualityTierValue[0] : qualityTierValue) || 'standard';
                const costKey = `${buildingClass}_${qualityTier}`;
                const altKey = `${buildingClass}_${subclass?.[0]}`;
                const costRange = COST_RANGES[costKey] || COST_RANGES[altKey];

                const gfa = scaleData.gfa_sqm || scaleData.nla_sqm || scaleData.total_gfa_sqm || 0;

                if (nccClass && costRange && gfa > 0) {
                    setProfilerData({
                        buildingClass: nccClass,
                        estimateLowCents: Math.round(gfa * costRange.low * 100),
                        estimateHighCents: Math.round(gfa * costRange.high * 100),
                    });
                }
            } catch {
                // Profiler not available - button stays disabled
            }
        }
        fetchProfile();
    }, [projectId]);

    // Drag and drop state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [localLinesBySection, setLocalLinesBySection] = useState<Record<CostLineSection, CostLineWithCalculations[]>>({} as Record<CostLineSection, CostLineWithCalculations[]>);

    // Roll-up mode state
    const [isRollUpMode, setIsRollUpMode] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Section generation state
    const [generatingSection, setGeneratingSection] = useState<CostLineSection | null>(null);

    // Program activity selector dialog state
    const [programSelectorOpen, setProgramSelectorOpen] = useState(false);
    const [programSelectorSourceLine, setProgramSelectorSourceLine] = useState<CostLineWithCalculations | null>(null);

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px movement before drag starts
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleAddLine = (section: CostLineSection) => {
        setShowAddRow(section);
    };

    const handleCreateLine = async (section: CostLineSection, data: { activity: string; budgetCents?: number; approvedContractCents?: number }) => {
        await createCostLine({
            section,
            activity: data.activity,
            budgetCents: data.budgetCents,
            approvedContractCents: data.approvedContractCents,
            sortOrder: costLines.filter(l => l.section === section).length,
        });
        setShowAddRow(null);
        refetch();
    };

    const handleCellChange = async (id: string, field: string, value: string | number | null) => {
        let processedValue: string | number | null = value;

        if (['budgetCents', 'approvedContractCents'].includes(field)) {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            processedValue = numValue !== null ? Math.round(numValue * 100) : null;
        }

        // Virtual Developer option for FEES — don't persist as a real stakeholderId
        if (field === 'stakeholderId' && value === '_developer') {
            return;
        }

        // stakeholderId can be null (to clear assignment)
        await updateCostLine(id, { [field]: processedValue });
        setEditingCell(null);
        refetch();
    };

    const handleDeleteLine = async (id: string) => {
        await deleteCostLine(id);
        setDeleteConfirm(null);
        refetch();
    };

    const handleClearAllClick = () => {
        if (costLines.length === 0) {
            alert('Cost plan is already empty');
            return;
        }
        setClearAllDialogOpen(true);
    };

    const handleConfirmClearAll = async () => {
        setIsLoadingTemplate(true);
        try {
            const response = await fetch(`/api/projects/${projectId}/cost-plan/clear`, {
                method: 'DELETE',
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to clear cost plan');
            }

            // Success - refetch the cost plan
            await refetch();
        } catch (error) {
            console.error('Failed to clear cost plan:', error);
        } finally {
            setIsLoadingTemplate(false);
        }
    };

    const handleApplyEstimate = async (updates: BudgetUpdate[], newLines: NewBudgetLine[]) => {
        // Update existing cost lines
        for (const update of updates) {
            await updateCostLine(update.costLineId, { budgetCents: update.budgetCents });
        }
        // Create new cost lines, tracking sort order per section
        const sectionCounts: Record<string, number> = {};
        for (const cl of costLines) {
            sectionCounts[cl.section] = (sectionCounts[cl.section] || 0) + 1;
        }
        for (const newLine of newLines) {
            const sortOrder = sectionCounts[newLine.section] || 0;
            await createCostLine({
                section: newLine.section,
                activity: newLine.activity,
                budgetCents: newLine.budgetCents,
                sortOrder,
            });
            sectionCounts[newLine.section] = sortOrder + 1;
        }
        await refetch();
    };

    const handleLoadTemplateClick = () => {
        if (isLoadingTemplate) return;

        // Check if there are existing cost lines and offer to clear them first
        if (costLines.length > 0) {
            setTemplateDialogOpen(true);
        } else {
            // No existing items, just load template directly
            loadTemplateWithoutClearing();
        }
    };

    const loadTemplateWithoutClearing = async () => {
        setIsLoadingTemplate(true);
        try {
            const response = await fetch(`/api/projects/${projectId}/cost-plan/generate-from-template`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to load template');
            }

            // Success - refetch the cost plan
            await refetch();

            alert(`Successfully loaded ${result.data.linesCreated} cost plan items from ${result.data.projectType} template`);
        } catch (error) {
            console.error('Failed to load template:', error);
            alert(error instanceof Error ? error.message : 'Failed to load template');
        } finally {
            setIsLoadingTemplate(false);
        }
    };

    const handleConfirmReplaceAndLoad = async () => {
        // User chose to clear first, then load template
        try {
            setIsLoadingTemplate(true);
            const clearResponse = await fetch(`/api/projects/${projectId}/cost-plan/clear`, {
                method: 'DELETE',
            });

            if (!clearResponse.ok) {
                throw new Error('Failed to clear existing items');
            }

            await refetch();
            await loadTemplateWithoutClearing();
        } catch (error) {
            console.error('Failed to clear cost plan:', error);
            alert(error instanceof Error ? error.message : 'Failed to clear cost plan');
            setIsLoadingTemplate(false);
        }
    };


    // Handler for generating a single section from stakeholders
    const handleGenerateSection = async (section: CostLineSection) => {
        if (generatingSection) return;

        setGeneratingSection(section);
        try {
            const response = await fetch(`/api/projects/${projectId}/cost-plan/generate-section`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to generate section');

            await refetch();
        } catch (error) {
            console.error('Failed to generate section:', error);
            alert(error instanceof Error ? error.message : 'Failed to generate section');
        } finally {
            setGeneratingSection(null);
        }
    };

    // Handle opening program activity selector for a line
    const handleGenerateFromProgram = (line: CostLineWithCalculations) => {
        setProgramSelectorSourceLine(line);
        setProgramSelectorOpen(true);
    };

    // Handle confirmation from program activity selector
    const handleProgramActivitiesSelected = async (selectedActivities: ProgramActivity[]) => {
        if (!programSelectorSourceLine || selectedActivities.length === 0) return;

        const sourceLine = programSelectorSourceLine;
        const sectionLines = linesBySection[sourceLine.section] || [];
        const sourceIndex = sectionLines.findIndex(l => l.id === sourceLine.id);

        // Create new cost lines for each selected activity (they'll be added at end initially)
        const newLineIds: string[] = [];
        for (const activity of selectedActivities) {
            const result = await createCostLine({
                section: sourceLine.section,
                activity: activity.name,
                stakeholderId: sourceLine.stakeholderId,
            });
            if (result?.id) {
                newLineIds.push(result.id);
            }
        }

        // Reorder to place new lines directly after source line
        if (newLineIds.length > 0 && sourceIndex !== -1) {
            // Build new order: lines before source + source + new lines + lines after source
            const updates: Array<{ id: string; sortOrder: number }> = [];
            let order = 1;

            // Lines before and including source
            for (let i = 0; i <= sourceIndex; i++) {
                updates.push({ id: sectionLines[i].id, sortOrder: order++ });
            }

            // New lines
            for (const newId of newLineIds) {
                updates.push({ id: newId, sortOrder: order++ });
            }

            // Lines after source
            for (let i = sourceIndex + 1; i < sectionLines.length; i++) {
                updates.push({ id: sectionLines[i].id, sortOrder: order++ });
            }

            await reorderCostLines(updates);
        }

        await refetch();
        setProgramSelectorOpen(false);
        setProgramSelectorSourceLine(null);
    };

    // Update local state when costLines change
    useEffect(() => {
        const grouped = SECTIONS.reduce((acc, section) => {
            const sectionLines = costLines.filter(line => line.section === section);

            if (section === 'CONSULTANTS') {
                // Sort CONSULTANTS alphabetically by discipline name, then by sortOrder within each discipline
                acc[section] = sectionLines.sort((a, b) => {
                    const nameA = a.stakeholder?.disciplineOrTrade || a.stakeholder?.name || '';
                    const nameB = b.stakeholder?.disciplineOrTrade || b.stakeholder?.name || '';
                    const nameCompare = nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
                    if (nameCompare !== 0) return nameCompare;
                    return a.sortOrder - b.sortOrder;
                });
            } else {
                // Other sections: sort by sortOrder only
                acc[section] = sectionLines.sort((a, b) => a.sortOrder - b.sortOrder);
            }
            return acc;
        }, {} as Record<CostLineSection, CostLineWithCalculations[]>);
        setLocalLinesBySection(grouped);
    }, [costLines]);

    // Find section for a given line ID
    const findSectionForLine = useCallback((lineId: string): CostLineSection | null => {
        for (const section of SECTIONS) {
            const lines = localLinesBySection[section] || [];
            if (lines.some(l => l.id === lineId)) {
                return section;
            }
        }
        return null;
    }, [localLinesBySection]);

    // Selection handlers
    const handleRowClick = useCallback((lineId: string, section: CostLineSection, e: React.MouseEvent) => {
        const lines = localLinesBySection[section] || [];

        // Prevent text selection on shift+click
        if (e.shiftKey) {
            e.preventDefault();
        }

        if (e.shiftKey && lastSelectedId) {
            // Shift+click: select range (only within same section)
            const lastSection = findSectionForLine(lastSelectedId);
            if (lastSection === section) {
                const lastIdx = lines.findIndex(l => l.id === lastSelectedId);
                const currentIdx = lines.findIndex(l => l.id === lineId);
                if (lastIdx !== -1 && currentIdx !== -1) {
                    const start = Math.min(lastIdx, currentIdx);
                    const end = Math.max(lastIdx, currentIdx);
                    const rangeIds = lines.slice(start, end + 1).map(l => l.id);
                    setSelectedIds(new Set(rangeIds));
                }
            } else {
                // Different section - just select the clicked item
                setSelectedIds(new Set([lineId]));
                setLastSelectedId(lineId);
            }
        } else if (e.ctrlKey || e.metaKey) {
            // Ctrl/Cmd+click: toggle selection (allow cross-section selection)
            setSelectedIds(prev => {
                const next = new Set(prev);
                if (next.has(lineId)) {
                    next.delete(lineId);
                } else {
                    next.add(lineId);
                }
                return next;
            });
            setLastSelectedId(lineId);
        } else {
            // Plain click: clear and select single
            setSelectedIds(new Set([lineId]));
            setLastSelectedId(lineId);
        }
    }, [lastSelectedId, localLinesBySection, findSectionForLine]);

    // Clear selection when clicking outside
    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
        setLastSelectedId(null);
    }, []);

    // Bulk delete handler
    const handleBulkDelete = async () => {
        const idsToDelete = Array.from(selectedIds);
        try {
            await bulkDeleteCostLines(idsToDelete);
            setSelectedIds(new Set());
            setLastSelectedId(null);
            setBulkDeleteConfirm(false);
            refetch();
        } catch (error) {
            console.error('Bulk delete failed:', error);
        }
    };

    // Keyboard shortcuts for selection
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // ESC to clear selection
            if (e.key === 'Escape' && selectedIds.size > 0) {
                setSelectedIds(new Set());
                setLastSelectedId(null);
            }
            // DELETE to open bulk delete confirmation
            if (e.key === 'Delete' && selectedIds.size > 0 && !isSubmitting) {
                setBulkDeleteConfirm(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIds, isSubmitting]);

    // Drag handlers
    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        // If dragging an unselected item, select only that item
        if (!selectedIds.has(event.active.id as string)) {
            setSelectedIds(new Set([event.active.id as string]));
        }
    }, [selectedIds]);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over || active.id === over.id) return;

        // Find the section of the active item
        const activeSection = findSectionForLine(active.id as string);
        const overSection = findSectionForLine(over.id as string);

        // Only allow reordering within the same section
        if (!activeSection || !overSection || activeSection !== overSection) return;

        const section = activeSection;
        const lines = localLinesBySection[section] || [];
        const oldIndex = lines.findIndex(l => l.id === active.id);
        const newIndex = lines.findIndex(l => l.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        // Get all selected IDs that are in this section
        const selectedInSection = lines.filter(l => selectedIds.has(l.id)).map(l => l.id);
        const idsToMove = selectedInSection.length > 0 && selectedInSection.includes(active.id as string)
            ? selectedInSection
            : [active.id as string];

        // Calculate new order
        const remainingLines = lines.filter(l => !idsToMove.includes(l.id));
        const movingLines = lines.filter(l => idsToMove.includes(l.id));

        // Find where to insert
        const overIndex = remainingLines.findIndex(l => l.id === over.id);
        const insertIndex = overIndex === -1 ? remainingLines.length : overIndex;

        // Build new array
        const reordered = [
            ...remainingLines.slice(0, insertIndex),
            ...movingLines,
            ...remainingLines.slice(insertIndex),
        ];

        // Update local state immediately (optimistic update)
        setLocalLinesBySection(prev => ({
            ...prev,
            [section]: reordered,
        }));

        // Prepare sort order updates
        const updates = reordered.map((line, idx) => ({
            id: line.id,
            sortOrder: idx,
        }));

        // Send to API
        try {
            await reorderCostLines(updates);
            refetch();
        } catch (err) {
            // Revert on error
            refetch();
        }
    }, [localLinesBySection, selectedIds, reorderCostLines, refetch, findSectionForLine]);

    // Get active line for drag overlay
    const activeLine = activeId ? costLines.find(l => l.id === activeId) : null;

    const linesBySection = localLinesBySection;

    const getSectionTotals = (lines: CostLineWithCalculations[]): GroupedLineTotals => {
        return lines.reduce((acc, line) => ({
            budget: acc.budget + line.budgetCents,
            approvedContract: acc.approvedContract + line.approvedContractCents,
            forecastVars: acc.forecastVars + line.calculated.forecastVariationsCents,
            approvedVars: acc.approvedVars + line.calculated.approvedVariationsCents,
            finalForecast: acc.finalForecast + line.calculated.finalForecastCents,
            variance: acc.variance + line.calculated.varianceToBudgetCents,
            claimed: acc.claimed + line.calculated.claimedToDateCents,
            currentMonth: acc.currentMonth + line.calculated.currentMonthCents,
            etc: acc.etc + line.calculated.etcCents,
        }), {
            budget: 0, approvedContract: 0, forecastVars: 0, approvedVars: 0,
            finalForecast: 0, variance: 0, claimed: 0, currentMonth: 0, etc: 0
        });
    };

    // Roll-up helper functions
    const getGroupKey = (section: CostLineSection, id: string | null): string => {
        return `${section}:${id ?? 'UNASSIGNED'}`;
    };

    const toggleGroupExpanded = useCallback((groupKey: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupKey)) {
                next.delete(groupKey);
            } else {
                next.add(groupKey);
            }
            return next;
        });
    }, []);

    // Toggle roll-up mode (called from column header chevron)
    const toggleRollUpMode = useCallback(() => {
        setIsRollUpMode(prev => {
            if (prev) {
                // Turning off roll-up, clear expanded groups
                setExpandedGroups(new Set());
            }
            return !prev;
        });
    }, []);

    // Group lines by discipline (CONSULTANTS) or trade (CONSTRUCTION)
    const groupLinesByDisciplineOrTrade = useCallback((
        lines: CostLineWithCalculations[],
        section: CostLineSection
    ): GroupedLine[] => {
        if (section !== 'CONSULTANTS' && section !== 'CONSTRUCTION') {
            return [];
        }

        const groupMap = new Map<string, CostLineWithCalculations[]>();

        lines.forEach(line => {
            // Group by stakeholderId (unified FK for both consultants and contractors)
            const groupId = line.stakeholderId ?? null;

            const key = groupId ?? 'UNASSIGNED';
            if (!groupMap.has(key)) {
                groupMap.set(key, []);
            }
            groupMap.get(key)!.push(line);
        });

        const groups: GroupedLine[] = [];
        groupMap.forEach((groupLines, key) => {
            const isUnassigned = key === 'UNASSIGNED';
            let groupName = 'Unassigned';

            if (!isUnassigned) {
                // Find stakeholder in appropriate options list based on section
                if (section === 'CONSULTANTS') {
                    const discipline = disciplineOptions.find(d => d.id === key);
                    groupName = discipline?.name || 'Unknown Discipline';
                } else {
                    const trade = tradeOptions.find(t => t.id === key);
                    groupName = trade?.name || 'Unknown Trade';
                }
            }

            groups.push({
                groupKey: getGroupKey(section, isUnassigned ? null : key),
                groupName,
                groupId: isUnassigned ? null : key,
                lines: groupLines.sort((a, b) => a.sortOrder - b.sortOrder),
                totals: getSectionTotals(groupLines),
            });
        });

        // Sort: alphanumerically by name, with Unassigned last
        return groups.sort((a, b) => {
            if (a.groupId === null) return 1;
            if (b.groupId === null) return -1;

            return a.groupName.localeCompare(b.groupName, undefined, { numeric: true, sensitivity: 'base' });
        });
    }, [disciplineOptions, tradeOptions]);

    // Memoized grouped sections data
    const groupedSections = useMemo(() => {
        if (!isRollUpMode) return null;
        return {
            CONSULTANTS: groupLinesByDisciplineOrTrade(linesBySection['CONSULTANTS'] || [], 'CONSULTANTS'),
            CONSTRUCTION: groupLinesByDisciplineOrTrade(linesBySection['CONSTRUCTION'] || [], 'CONSTRUCTION'),
        };
    }, [isRollUpMode, linesBySection, groupLinesByDisciplineOrTrade]);

    if (error) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <p className="text-[var(--color-accent-coral)] mb-2">Failed to load cost plan</p>
                    <button onClick={() => refetch()} className="text-sm text-[var(--color-accent-teal)] hover:opacity-80">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Generate month options (last 24 months up to current month)
    const generateMonthOptions = () => {
        const options: { year: number; month: number; label: string; value: string }[] = [];
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1-indexed

        // Generate from 24 months ago to current month
        for (let i = 23; i >= 0; i--) {
            const date = new Date(currentYear, currentMonth - 1 - i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;

            // Only include up to current month (no future months)
            if (year > currentYear || (year === currentYear && month > currentMonth)) {
                continue;
            }

            const label = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            const value = `${year}-${String(month).padStart(2, '0')}`;

            options.push({ year, month, label, value });
        }

        return options;
    };

    const monthOptions = generateMonthOptions();

    return (
        <div className="flex-1 flex flex-col min-h-0">
            {/* Toolbar */}
            <div
                className="flex items-center justify-end px-4 py-2 border-b border-[var(--color-border)]/50 backdrop-blur-sm flex-shrink-0"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-tertiary) 30%, transparent)' }}
            >
                {/* Right side - Apply Estimate + Clear All + Month Selector */}
                <div className="flex gap-2 items-center">
                    <button
                        onClick={() => setEstimateDialogOpen(true)}
                        disabled={!profilerData}
                        className="text-xs bg-[#1776c1] text-white px-3 py-1.5 rounded hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#1776c1] focus:ring-opacity-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!profilerData ? 'Complete the building profiler first to generate an estimate' : 'Distribute budget estimate across cost plan items'}
                    >
                        Apply Budget Estimate
                    </button>
                    <button
                        onClick={handleClearAllClick}
                        disabled={isLoadingTemplate || costLines.length === 0}
                        className="text-xs bg-[var(--color-accent-coral)] text-white px-3 py-1.5 rounded hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-coral)] focus:ring-opacity-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Clear all cost plan items"
                    >
                        Clear All
                    </button>
                    <select
                    value={`${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`}
                    onChange={(e) => {
                        const [year, month] = e.target.value.split('-').map(Number);
                        setSelectedMonth({ year, month });
                    }}
                    className="text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-2 py-1 rounded hover:border-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent-teal)] transition-colors cursor-pointer"
                    title="Select reporting month"
                >
                    {monthOptions.map(option => (
                        <option key={option.value} value={option.value} className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]">
                            {option.label}
                        </option>
                    ))}
                </select>
                </div>
            </div>

            {/* Spreadsheet */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div
                    className="cost-plan-container flex-1 h-0 overflow-x-auto overflow-y-auto"
                    style={{ scrollbarGutter: 'stable', backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 40%, transparent)' }}
                >
                    <table className="border-collapse text-xs w-full select-none">
                        <thead
                            className="sticky top-0 z-10 backdrop-blur-sm shadow-[0_2px_4px_-1px_rgba(0,0,0,0.06)]"
                            style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 50%, transparent)' }}
                        >
                            <tr>
                                <th className="px-0 py-1.5 w-8 border-b border-b-[var(--color-border)]" rowSpan={2}>
                                    <div className="flex items-center justify-center px-1">
                                        <button
                                            onClick={toggleRollUpMode}
                                            className="p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                                            title={isRollUpMode ? "Expand all rows" : "Roll up by discipline/trade"}
                                        >
                                            {isRollUpMode ? (
                                                <ChevronDown className="h-3.5 w-3.5" />
                                            ) : (
                                                <ChevronRight className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </th>
                                <th className="px-1.5 py-1.5 text-[var(--color-text-primary)] font-bold text-left w-20 border-b border-b-[var(--color-border)]" rowSpan={2}>Discipline</th>
                                <th className="px-1.5 py-1.5 text-[var(--color-text-primary)] font-bold text-left w-[200px] border-b border-b-[var(--color-border)]" rowSpan={2}>Description</th>
                                <th className="px-1.5 py-1.5 text-[var(--color-text-primary)] font-bold text-right w-[72px] border-b border-b-[var(--color-border)]" rowSpan={2}>Budget</th>
                                <th className="px-1.5 py-1.5 text-[var(--color-text-primary)] font-bold text-right w-[72px] border-b border-b-[var(--color-border)]" rowSpan={2}>Contract</th>
                                <th className="col-priority-3 px-1.5 py-1.5 text-center text-[var(--color-text-primary)] font-bold w-[120px] border-b border-b-[var(--color-border)]" colSpan={2}>VARIATIONS</th>
                                <th className="col-priority-3 px-1.5 py-1.5 text-[var(--color-text-primary)] font-bold text-right w-[72px] border-b border-b-[var(--color-border)]" rowSpan={2}>Forecast</th>
                                <th className="col-priority-2 px-1.5 py-1.5 text-[var(--color-text-primary)] font-bold text-right w-[72px] border-b border-b-[var(--color-border)]" rowSpan={2}>Variance</th>
                                <th className="col-priority-2 px-1.5 py-1.5 text-[var(--color-text-primary)] font-bold text-right w-[72px] border-b border-b-[var(--color-border)]" rowSpan={2}>Claimed</th>
                                <th className="col-priority-1 px-1.5 py-1.5 text-[var(--color-text-primary)] font-bold text-right w-[60px] border-b border-b-[var(--color-border)]" rowSpan={2}>Month</th>
                                <th className="col-priority-1 px-1.5 py-1.5 text-[var(--color-text-primary)] font-bold text-right w-[72px] border-b border-b-[var(--color-border)]" rowSpan={2}>Remaining</th>
                                <th className="px-1 py-1.5 w-7 border-b border-b-[var(--color-border)]" rowSpan={2}></th>
                                <th className="px-1 py-1.5 w-7 border-b border-b-[var(--color-border)]" rowSpan={2}>
                                    {selectedIds.size > 0 && (
                                        <button
                                            onClick={() => setBulkDeleteConfirm(true)}
                                            className="p-0.5 text-[var(--color-accent-coral)] hover:opacity-80 transition-colors"
                                            title={`Delete ${selectedIds.size} selected item${selectedIds.size > 1 ? 's' : ''}`}
                                        >
                                            <Trash className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </th>
                            </tr>
                            <tr>
                                <th className="col-priority-3 px-1.5 py-1 text-center text-[var(--color-text-primary)] font-bold w-[60px] border-b border-b-[var(--color-border)]">Forecast</th>
                                <th className="col-priority-3 px-1.5 py-1 text-center text-[var(--color-text-primary)] font-bold w-[60px] border-b border-b-[var(--color-border)]">Approved</th>
                            </tr>
                        </thead>
                        <tbody>
                            {SECTIONS.map(section => {
                                const lines = linesBySection[section] || [];
                                const sectionTotals = getSectionTotals(lines);
                                // Get grouped data for this section (only CONSULTANTS and CONSTRUCTION)
                                const groupedData = groupedSections?.[section as 'CONSULTANTS' | 'CONSTRUCTION'] || [];

                                return (
                                    <SectionBlock
                                        key={section}
                                        section={section}
                                        lines={lines}
                                        sectionTotals={sectionTotals}
                                        onAddLine={() => handleAddLine(section)}
                                        editingCell={editingCell}
                                        onStartEdit={(id, field) => setEditingCell({ id, field })}
                                        onCellChange={handleCellChange}
                                        onCancelEdit={() => setEditingCell(null)}
                                        onDeleteLine={(id, activity) => setDeleteConfirm({ id, activity })}
                                        selectedIds={selectedIds}
                                        onRowClick={handleRowClick}
                                        showAddRow={showAddRow === section}
                                        onSaveNewLine={(data) => handleCreateLine(section, data)}
                                        onCancelNewLine={() => setShowAddRow(null)}
                                        isSubmitting={isSubmitting}
                                        disciplines={disciplineOptions}
                                        trades={tradeOptions}
                                        isRollUpMode={isRollUpMode}
                                        expandedGroups={expandedGroups}
                                        onToggleGroup={toggleGroupExpanded}
                                        groupedData={groupedData}
                                        onGenerateSection={handleGenerateSection}
                                        isGeneratingSection={generatingSection === section}
                                        onGenerateFromProgram={handleGenerateFromProgram}
                                    />
                                );
                            })}

                            {/* GRAND TOTAL Row */}
                            <tr className="font-semibold" style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-tertiary) 50%, transparent)' }}>
                                <td className="border border-[var(--color-border)] px-0.5 py-1.5 w-8"></td>
                                <td className="border border-[var(--color-border)] px-1.5 py-1.5 text-[var(--color-text-primary)]" colSpan={2}>GRAND TOTAL</td>
                                <td className="border border-[var(--color-border)] px-1.5 py-1.5 text-right text-[var(--color-text-primary)]">{formatCurrency(totals?.budgetCents || 0)}</td>
                                <td className="border border-[var(--color-border)] px-1.5 py-1.5 text-right text-[var(--color-text-primary)]">{formatCurrency(totals?.approvedContractCents || 0)}</td>
                                <td className="col-priority-3 border border-[var(--color-border)] px-1.5 py-1.5 text-right text-[var(--color-text-primary)]">{formatCurrency(totals?.forecastVariationsCents || 0)}</td>
                                <td className="col-priority-3 border border-[var(--color-border)] px-1.5 py-1.5 text-right text-[var(--color-text-primary)]">{formatCurrency(totals?.approvedVariationsCents || 0)}</td>
                                <td className="col-priority-3 border border-[var(--color-border)] px-1.5 py-1.5 text-right text-[var(--color-text-primary)]">{formatCurrency(totals?.finalForecastCents || 0)}</td>
                                <td className="col-priority-2 border border-[var(--color-border)] px-1.5 py-1.5 text-right">
                                    <span className={totals && totals.varianceCents < 0 ? 'text-[var(--color-accent-coral)]' : 'text-[var(--color-accent-green)]'}>
                                        {formatCurrency(totals?.varianceCents || 0)}
                                    </span>
                                </td>
                                <td className="col-priority-2 border border-[var(--color-border)] px-1.5 py-1.5 text-right text-[var(--color-text-primary)]">{formatCurrency(totals?.claimedCents || 0)}</td>
                                <td className="col-priority-1 border border-[var(--color-border)] px-1.5 py-1.5 text-right text-[var(--color-text-primary)]">{formatCurrency(totals?.currentMonthCents || 0)}</td>
                                <td className="col-priority-1 border border-[var(--color-border)] px-1.5 py-1.5 text-right text-[var(--color-text-primary)]">{formatCurrency(totals?.etcCents || 0)}</td>
                                <td className="border border-[var(--color-border)] px-1 py-1.5 w-7"></td>
                                <td className="border border-[var(--color-border)] px-1 py-1.5 w-7"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Drag overlay for better visual feedback */}
                <DragOverlay>
                    {activeLine ? (
                        <table className="border-collapse text-xs min-w-[900px] w-max">
                            <tbody>
                                <tr className="bg-[var(--color-bg-hover)] shadow-lg opacity-90">
                                    <td className="border border-[var(--color-border)] px-0.5 py-1 w-10">
                                        <GripVertical className="h-3.5 w-3.5 text-[var(--color-text-primary)]" />
                                    </td>
                                    <td className="border border-[var(--color-border)] px-1.5 py-1 text-[var(--color-text-muted)]">{activeLine.stakeholder?.name || '-'}</td>
                                    <td className="border border-[var(--color-border)] px-1.5 py-1 text-[var(--color-text-primary)]">
                                        {activeLine.activity}
                                        {selectedIds.size > 1 && (
                                            <span className="ml-2 px-1.5 py-0.5 bg-[var(--color-accent-teal)] text-white text-xs rounded">
                                                +{selectedIds.size - 1}
                                            </span>
                                        )}
                                    </td>
                                    <td className="border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-accent-teal)]" colSpan={11}>
                                        {formatCurrency(activeLine.budgetCents)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {deleteConfirm && (
                <DeleteConfirmDialog
                    activity={deleteConfirm.activity}
                    onClose={() => setDeleteConfirm(null)}
                    onConfirm={() => handleDeleteLine(deleteConfirm.id)}
                    isSubmitting={isSubmitting}
                />
            )}

            {bulkDeleteConfirm && (
                <BulkDeleteConfirmDialog
                    count={selectedIds.size}
                    onClose={() => setBulkDeleteConfirm(false)}
                    onConfirm={handleBulkDelete}
                    isSubmitting={isSubmitting}
                />
            )}

            {/* Program Activity Selector Dialog */}
            <ProgramActivitySelector
                projectId={projectId}
                isOpen={programSelectorOpen}
                onClose={() => {
                    setProgramSelectorOpen(false);
                    setProgramSelectorSourceLine(null);
                }}
                onConfirm={handleProgramActivitiesSelected}
                sourceLine={programSelectorSourceLine ? {
                    id: programSelectorSourceLine.id,
                    activity: programSelectorSourceLine.activity,
                    stakeholderId: programSelectorSourceLine.stakeholderId,
                } : undefined}
            />

            {/* Apply Budget Estimate Dialog */}
            {profilerData && (
                <ApplyEstimateDialog
                    open={estimateDialogOpen}
                    onOpenChange={setEstimateDialogOpen}
                    costLines={costLines}
                    buildingClass={profilerData.buildingClass}
                    estimateLowCents={profilerData.estimateLowCents}
                    estimateHighCents={profilerData.estimateHighCents}
                    onApply={handleApplyEstimate}
                />
            )}

            {/* Clear All Confirmation Dialog */}
            <AuroraConfirmDialog
                open={clearAllDialogOpen}
                onOpenChange={setClearAllDialogOpen}
                onConfirm={handleConfirmClearAll}
                title="Clear all cost plan items?"
                description={`This will delete all ${costLines.length} items. This action cannot be undone.`}
                variant="destructive"
                confirmLabel="Clear All"
            />

            {/* Template Dialog - Replace or Add */}
            <AuroraConfirmDialog
                open={templateDialogOpen}
                onOpenChange={setTemplateDialogOpen}
                onConfirm={handleConfirmReplaceAndLoad}
                title="Replace existing items?"
                description={`There are ${costLines.length} existing items. Click Replace to clear and load template, or Cancel to add template items to existing.`}
                variant="warning"
                confirmLabel="Replace"
            />
        </div>
    );
}

interface DisciplineOption {
    id: string;
    name: string;
    isEnabled: boolean;
    order: number;
}

interface TradeOption {
    id: string;
    name: string;
    isEnabled: boolean;
    order: number;
}

interface SectionBlockProps {
    section: CostLineSection;
    lines: CostLineWithCalculations[];
    sectionTotals: {
        budget: number; approvedContract: number; forecastVars: number; approvedVars: number;
        finalForecast: number; variance: number; claimed: number; currentMonth: number; etc: number;
    };
    onAddLine: () => void;
    editingCell: { id: string; field: string } | null;
    onStartEdit: (id: string, field: string) => void;
    onCellChange: (id: string, field: string, value: string | number | null) => void;
    onCancelEdit: () => void;
    onDeleteLine: (id: string, activity: string) => void;
    // Selection props
    selectedIds: Set<string>;
    onRowClick: (lineId: string, section: CostLineSection, e: React.MouseEvent) => void;
    // Add line props
    showAddRow: boolean;
    onSaveNewLine: (data: { activity: string; budgetCents?: number; approvedContractCents?: number }) => Promise<void>;
    onCancelNewLine: () => void;
    isSubmitting: boolean;
    // Discipline/Trade dropdown options
    disciplines: DisciplineOption[];
    trades: TradeOption[];
    // Roll-up mode props
    isRollUpMode: boolean;
    expandedGroups: Set<string>;
    onToggleGroup: (groupKey: string) => void;
    groupedData: GroupedLine[];
    // Section generation props
    onGenerateSection: (section: CostLineSection) => void;
    isGeneratingSection: boolean;
    // Line-level program activity generation
    onGenerateFromProgram: (line: CostLineWithCalculations) => void;
}

function SectionBlock({
    section,
    lines,
    sectionTotals,
    onAddLine,
    editingCell,
    onStartEdit,
    onCellChange,
    onCancelEdit,
    onDeleteLine,
    selectedIds,
    onRowClick,
    showAddRow,
    onSaveNewLine,
    onCancelNewLine,
    isSubmitting,
    disciplines,
    trades,
    isRollUpMode,
    expandedGroups,
    onToggleGroup,
    groupedData,
    onGenerateSection,
    isGeneratingSection,
    onGenerateFromProgram,
}: SectionBlockProps) {
    // Determine if this section supports roll-up
    const supportsRollUp = section === 'CONSULTANTS' || section === 'CONSTRUCTION';
    const shouldShowRolledUp = isRollUpMode && supportsRollUp && groupedData.length > 0;

    return (
        <>
            {/* Section Header */}
            <tr style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-hover) 40%, transparent)' }}>
                {/* Plus button at far left */}
                <td className="border border-[var(--color-border)]/50 px-1 py-1.5 w-8 text-center">
                    <button
                        onClick={onAddLine}
                        disabled={showAddRow || shouldShowRolledUp}
                        className="p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={shouldShowRolledUp ? `Disable roll-up to add lines` : `Add line to ${SECTION_NAMES[section]}`}
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                </td>
                <td className="border border-[var(--color-border)] px-1.5 py-1.5 font-semibold text-[var(--color-text-primary)]" colSpan={2}>
                    {SECTION_NAMES[section]}
                </td>
                <td className="border border-[var(--color-border)] px-1.5 py-1.5"></td>
                <td className="border border-[var(--color-border)] px-1.5 py-1.5"></td>
                <td className="col-priority-3 border border-[var(--color-border)] px-1.5 py-1.5"></td>
                <td className="col-priority-3 border border-[var(--color-border)] px-1.5 py-1.5"></td>
                <td className="col-priority-3 border border-[var(--color-border)] px-1.5 py-1.5"></td>
                <td className="col-priority-2 border border-[var(--color-border)] px-1.5 py-1.5"></td>
                <td className="col-priority-2 border border-[var(--color-border)] px-1.5 py-1.5"></td>
                <td className="col-priority-1 border border-[var(--color-border)] px-1.5 py-1.5"></td>
                <td className="col-priority-1 border border-[var(--color-border)] px-1.5 py-1.5"></td>
                {/* Generate section button (second-to-last column, aligned with line diamond icons) */}
                <td className="border border-[var(--color-border)] px-1 py-1.5 w-7 text-center">
                    {section !== 'CONTINGENCY' && (
                        <button
                            onClick={() => onGenerateSection(section)}
                            disabled={isGeneratingSection || shouldShowRolledUp}
                            className="p-0.5 text-[var(--color-accent-copper)] hover:opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title={isGeneratingSection ? 'Generating...' : `Populate ${SECTION_NAMES[section]} from stakeholders`}
                        >
                            <DiamondIcon variant="empty" className={`w-3.5 h-3.5 ${isGeneratingSection ? 'animate-spin-generate' : ''}`} />
                        </button>
                    )}
                </td>
                {/* Empty cell for delete column (far right) */}
                <td className="border border-[var(--color-border)] px-1 py-1.5 w-7"></td>
            </tr>

            {shouldShowRolledUp ? (
                /* Grouped accordion view for roll-up mode */
                <>
                    {groupedData.map(group => {
                        const isExpanded = expandedGroups.has(group.groupKey);
                        return (
                            <React.Fragment key={group.groupKey}>
                                {isExpanded ? (
                                    /* When expanded, show only the detail lines (no header) */
                                    group.lines.map((line, idx) => (
                                        <ReadOnlyLineRow
                                            key={line.id}
                                            line={line}
                                            showDiscipline={idx === 0}
                                            disciplineName={group.groupName}
                                            onCollapse={() => onToggleGroup(group.groupKey)}
                                        />
                                    ))
                                ) : (
                                    /* When collapsed, show only the summary row */
                                    <CollapsedGroupRow
                                        group={group}
                                        isExpanded={false}
                                        onToggle={() => onToggleGroup(group.groupKey)}
                                    />
                                )}
                            </React.Fragment>
                        );
                    })}
                </>
            ) : (
                /* Normal editable view with drag-drop */
                <>
                    <SortableContext
                        items={lines.map(l => l.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {lines.map(line => (
                            <SortableCostLineRow
                                key={line.id}
                                line={line}
                                section={section}
                                editingCell={editingCell}
                                onStartEdit={onStartEdit}
                                onCellChange={onCellChange}
                                onCancelEdit={onCancelEdit}
                                onDelete={() => onDeleteLine(line.id, line.activity)}
                                onGenerateFromProgram={() => onGenerateFromProgram(line)}
                                isSelected={selectedIds.has(line.id)}
                                onRowClick={onRowClick}
                                selectedCount={selectedIds.size}
                                disciplines={disciplines}
                                trades={trades}
                            />
                        ))}
                    </SortableContext>

                    {/* Inline Add Row - only in normal mode */}
                    {showAddRow && (
                        <AddCostLineRow
                            onSave={onSaveNewLine}
                            onCancel={onCancelNewLine}
                            isSubmitting={isSubmitting}
                        />
                    )}
                </>
            )}

            {/* Sub-Total Row */}
            <tr style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-tertiary) 40%, transparent)' }}>
                <td className="border border-[var(--color-border)] px-0.5 py-1 w-8"></td>
                <td className="border border-[var(--color-border)] px-1.5 py-1 text-[var(--color-text-muted)] font-medium" colSpan={2}>Sub-Total</td>
                <td className="border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-primary)]">{formatCurrency(sectionTotals.budget)}</td>
                <td className="border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-primary)]">{formatCurrency(sectionTotals.approvedContract)}</td>
                <td className="col-priority-3 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-primary)]">{formatCurrency(sectionTotals.forecastVars)}</td>
                <td className="col-priority-3 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-primary)]">{formatCurrency(sectionTotals.approvedVars)}</td>
                <td className="col-priority-3 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-primary)]">{formatCurrency(sectionTotals.finalForecast)}</td>
                <td className="col-priority-2 border border-[var(--color-border)] px-1.5 py-1 text-right">
                    <span className={sectionTotals.variance < 0 ? 'text-[var(--color-accent-coral)]' : sectionTotals.variance > 0 ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-text-muted)]'}>
                        {formatCurrency(sectionTotals.variance)}
                    </span>
                </td>
                <td className="col-priority-2 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-primary)]">{formatCurrency(sectionTotals.claimed)}</td>
                <td className="col-priority-1 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-primary)]">{formatCurrency(sectionTotals.currentMonth)}</td>
                <td className="col-priority-1 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-primary)]">{formatCurrency(sectionTotals.etc)}</td>
                <td className="border border-[var(--color-border)] px-1 py-1 w-7"></td>
                <td className="border border-[var(--color-border)] px-1 py-1 w-7"></td>
            </tr>
        </>
    );
}

interface SortableCostLineRowProps {
    line: CostLineWithCalculations;
    section: CostLineSection;
    editingCell: { id: string; field: string } | null;
    onStartEdit: (id: string, field: string) => void;
    onCellChange: (id: string, field: string, value: string | number | null) => void;
    onCancelEdit: () => void;
    onDelete: () => void;
    onGenerateFromProgram: () => void;
    isSelected: boolean;
    onRowClick: (lineId: string, section: CostLineSection, e: React.MouseEvent) => void;
    selectedCount: number;
    disciplines: DisciplineOption[];
    trades: TradeOption[];
}

function SortableCostLineRow({
    line,
    section,
    editingCell,
    onStartEdit,
    onCellChange,
    onCancelEdit,
    onDelete,
    onGenerateFromProgram,
    isSelected,
    onRowClick,
    selectedCount,
    disciplines,
    trades,
}: SortableCostLineRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: line.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <CostLineRow
            ref={setNodeRef}
            style={style}
            line={line}
            section={section}
            editingCell={editingCell}
            onStartEdit={onStartEdit}
            onCellChange={onCellChange}
            onCancelEdit={onCancelEdit}
            onDelete={onDelete}
            onGenerateFromProgram={onGenerateFromProgram}
            isSelected={isSelected}
            isDragging={isDragging}
            onRowClick={onRowClick}
            dragHandleProps={{ ...attributes, ...listeners }}
            selectedCount={selectedCount}
            disciplines={disciplines}
            trades={trades}
        />
    );
}

interface CostLineRowProps {
    line: CostLineWithCalculations;
    section: CostLineSection;
    editingCell: { id: string; field: string } | null;
    onStartEdit: (id: string, field: string) => void;
    onCellChange: (id: string, field: string, value: string | number | null) => void;
    onCancelEdit: () => void;
    onDelete: () => void;
    onGenerateFromProgram: () => void;
    isSelected: boolean;
    isDragging: boolean;
    onRowClick: (lineId: string, section: CostLineSection, e: React.MouseEvent) => void;
    dragHandleProps: Record<string, unknown>;
    selectedCount: number;
    style?: React.CSSProperties;
    disciplines: DisciplineOption[];
    trades: TradeOption[];
}

const CostLineRow = React.forwardRef<HTMLTableRowElement, CostLineRowProps>(function CostLineRow(
    { line, section, editingCell, onStartEdit, onCellChange, onCancelEdit, onDelete, onGenerateFromProgram, isSelected, isDragging, onRowClick, dragHandleProps, selectedCount, style, disciplines, trades },
    ref
) {
    const variance = line.calculated.varianceToBudgetCents;
    const isEditing = (field: string) => editingCell?.id === line.id && editingCell?.field === field;

    return (
        <tr
            ref={ref}
            style={style}
            className={`
                transition-colors group cursor-pointer
                ${isDragging ? 'opacity-50 bg-[var(--color-bg-hover)]' : 'hover:bg-[var(--color-bg-hover)]/50'}
                ${isSelected ? 'bg-[var(--color-bg-hover)]/50' : ''}
            `}
            onClick={(e) => onRowClick(line.id, section, e)}
        >
            {/* Grip Handle */}
            <td className="border border-[var(--color-border)] px-0 py-1 w-8">
                <div className="flex items-center justify-center h-full">
                    <button
                        className="cursor-grab active:cursor-grabbing text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-0.5"
                        {...dragHandleProps}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GripVertical className="h-3.5 w-3.5" />
                    </button>
                </div>
            </td>
            <td className="border border-[var(--color-border)] px-1 py-0.5 min-w-[100px]">
                <DisciplineDropdown
                    value={line.stakeholderId}
                    displayValue={line.stakeholder?.disciplineOrTrade || line.stakeholder?.name}
                    section={section}
                    disciplines={disciplines}
                    trades={trades}
                    onChange={(id) => {
                        // Use unified stakeholderId for both CONSULTANTS and CONSTRUCTION
                        onCellChange(line.id, 'stakeholderId', id);
                    }}
                />
            </td>
            <EditableCell
                value={line.activity}
                isEditing={isEditing('activity')}
                onStartEdit={() => onStartEdit(line.id, 'activity')}
                onSave={(value) => onCellChange(line.id, 'activity', value)}
                onCancel={onCancelEdit}
                className="text-[var(--color-text-primary)]"
            />
            <EditableNumberCell
                value={line.budgetCents / 100}
                isEditing={isEditing('budgetCents')}
                onStartEdit={() => onStartEdit(line.id, 'budgetCents')}
                onSave={(value) => onCellChange(line.id, 'budgetCents', value)}
                onCancel={onCancelEdit}
                className="text-[var(--color-accent-teal)]"
            />
            <EditableNumberCell
                value={line.approvedContractCents / 100}
                isEditing={isEditing('approvedContractCents')}
                onStartEdit={() => onStartEdit(line.id, 'approvedContractCents')}
                onSave={(value) => onCellChange(line.id, 'approvedContractCents', value)}
                onCancel={onCancelEdit}
                className="text-[var(--color-accent-teal)]"
            />
            <td className="col-priority-3 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-muted)]">
                {line.calculated.forecastVariationsCents ? formatCurrency(line.calculated.forecastVariationsCents) : '-'}
            </td>
            <td className="col-priority-3 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-muted)]">
                {line.calculated.approvedVariationsCents ? formatCurrency(line.calculated.approvedVariationsCents) : '-'}
            </td>
            <td className="col-priority-3 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-primary)]">
                {formatCurrency(line.calculated.finalForecastCents)}
            </td>
            <td className="col-priority-2 border border-[var(--color-border)] px-1.5 py-1 text-right">
                <span className={variance < 0 ? 'text-[var(--color-accent-coral)]' : variance > 0 ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-text-muted)]'}>
                    {variance !== 0 ? formatCurrency(variance) : '-'}
                </span>
            </td>
            <td className="col-priority-2 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-muted)]">
                {line.calculated.claimedToDateCents ? formatCurrency(line.calculated.claimedToDateCents) : '-'}
            </td>
            <td className="col-priority-1 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-muted)]">
                {line.calculated.currentMonthCents ? formatCurrency(line.calculated.currentMonthCents) : '-'}
            </td>
            <td className="col-priority-1 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-muted)]">
                {line.calculated.etcCents ? formatCurrency(line.calculated.etcCents) : '-'}
            </td>
            <td className="border border-[var(--color-border)] px-1 py-1 w-7 text-center">
                <button
                    onClick={(e) => { e.stopPropagation(); onGenerateFromProgram(); }}
                    className="p-0.5 text-[var(--color-accent-copper)] hover:opacity-80 transition-all opacity-0 group-hover:opacity-100"
                    title="Generate line items from program activities"
                >
                    <DiamondIcon variant="empty" className="w-3.5 h-3.5" />
                </button>
            </td>
            <td className="border border-[var(--color-border)] px-1 py-1 w-7 text-center">
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-accent-coral)] hover:bg-[var(--color-bg-hover)] rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete line"
                >
                    <Trash className="h-3.5 w-3.5" />
                </button>
            </td>
        </tr>
    );
});

interface EditableCellProps {
    value: string;
    isEditing: boolean;
    onStartEdit: () => void;
    onSave: (value: string) => void;
    onCancel: () => void;
    className?: string;
}

function EditableCell({ value, isEditing, onStartEdit, onSave, onCancel, className }: EditableCellProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [editValue, setEditValue] = useState(value);

    useEffect(() => {
        setEditValue(value);
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onSave(editValue);
        } else if (e.key === 'Escape') {
            setEditValue(value);
            onCancel();
        } else if (e.key === 'Tab') {
            onSave(editValue);
        }
    };

    return (
        <td
            className="border border-[var(--color-border)] px-1.5 py-1 cursor-text overflow-hidden"
            onClick={!isEditing ? onStartEdit : undefined}
        >
            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => onSave(editValue)}
                    onKeyDown={handleKeyDown}
                    className={`w-full p-0 bg-transparent border-none text-[var(--color-text-primary)] outline-none text-xs ${className}`}
                />
            ) : (
                <span className={`block truncate ${className}`}>
                    {value || '-'}
                </span>
            )}
        </td>
    );
}

interface EditableNumberCellProps {
    value: number;
    isEditing: boolean;
    onStartEdit: () => void;
    onSave: (value: number) => void;
    onCancel: () => void;
    className?: string;
}

function EditableNumberCell({ value, isEditing, onStartEdit, onSave, onCancel, className }: EditableNumberCellProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [editValue, setEditValue] = useState(value.toString());

    useEffect(() => {
        setEditValue(value.toString());
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onSave(parseFloat(editValue) || 0);
        } else if (e.key === 'Escape') {
            setEditValue(value.toString());
            onCancel();
        } else if (e.key === 'Tab') {
            onSave(parseFloat(editValue) || 0);
        }
    };

    return (
        <td
            className="border border-[var(--color-border)] px-1.5 py-1 text-right cursor-text"
            onClick={!isEditing ? onStartEdit : undefined}
        >
            {isEditing ? (
                <input
                    ref={inputRef}
                    type="number"
                    step="0.01"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => onSave(parseFloat(editValue) || 0)}
                    onKeyDown={handleKeyDown}
                    className={`w-full p-0 bg-transparent border-none text-[var(--color-text-primary)] text-right outline-none text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${className}`}
                />
            ) : (
                <span className={`block ${className}`}>
                    {value ? formatCurrency(value * 100) : '-'}
                </span>
            )}
        </td>
    );
}

interface AddCostLineRowProps {
    onSave: (data: { activity: string; budgetCents?: number; approvedContractCents?: number }) => Promise<void>;
    onCancel: () => void;
    isSubmitting: boolean;
}

function AddCostLineRow({ onSave, onCancel, isSubmitting }: AddCostLineRowProps) {
    const activityRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState({
        activity: '',
        budgetCents: 0,
        approvedContractCents: 0,
    });

    // Auto-focus activity field
    useEffect(() => {
        activityRef.current?.focus();
    }, []);

    const handleSave = async () => {
        if (!formData.activity.trim()) return;
        await onSave({
            activity: formData.activity,
            budgetCents: formData.budgetCents || undefined,
            approvedContractCents: formData.approvedContractCents || undefined,
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    const inputClass = "w-full px-1.5 py-1 bg-transparent border-none text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none";
    const numberInputClass = `${inputClass} text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`;

    return (
        <tr className="bg-transparent hover:bg-[var(--color-bg-hover)]/50" onKeyDown={handleKeyDown}>
            <td className="border border-[var(--color-border)] px-0.5 py-1 w-8"></td>
            <td className="border border-[var(--color-border)] px-1.5 py-1 text-[var(--color-text-muted)]">-</td>
            <td className="border border-[var(--color-border)] px-1 py-1">
                <input
                    ref={activityRef}
                    type="text"
                    value={formData.activity}
                    onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                    placeholder="Enter activity..."
                    className={inputClass}
                />
            </td>
            <td className="border border-[var(--color-border)] px-1 py-1">
                <input
                    type="number"
                    value={formData.budgetCents / 100 || ''}
                    onChange={(e) => setFormData({ ...formData, budgetCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                    placeholder="0.00"
                    className={numberInputClass}
                />
            </td>
            <td className="border border-[var(--color-border)] px-1 py-1">
                <input
                    type="number"
                    value={formData.approvedContractCents / 100 || ''}
                    onChange={(e) => setFormData({ ...formData, approvedContractCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                    placeholder="0.00"
                    className={numberInputClass}
                />
            </td>
            <td className="col-priority-3 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-muted)]">-</td>
            <td className="col-priority-3 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-muted)]">-</td>
            <td className="col-priority-3 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-muted)]">-</td>
            <td className="col-priority-2 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-muted)]">-</td>
            <td className="col-priority-2 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-muted)]">-</td>
            <td className="col-priority-1 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-muted)]">-</td>
            <td className="col-priority-1 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-muted)]">-</td>
            <td className="border border-[var(--color-border)] px-1 py-1 w-7"></td>
            <td className="border border-[var(--color-border)] px-1 py-1 w-7 text-center">
                <div className="flex items-center justify-center gap-1">
                    <button
                        onClick={handleSave}
                        disabled={!formData.activity.trim() || isSubmitting}
                        className="p-0.5 text-green-400 hover:text-green-300 hover:bg-green-900/30 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Save (Enter)"
                    >
                        <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="p-0.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded disabled:opacity-50 transition-colors"
                        title="Cancel (Esc)"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </td>
        </tr>
    );
}

// ============================================================================
// ROLL-UP MODE COMPONENTS
// ============================================================================

interface CollapsedGroupRowProps {
    group: GroupedLine;
    isExpanded: boolean;
    onToggle: () => void;
}

function CollapsedGroupRow({ group, isExpanded, onToggle }: CollapsedGroupRowProps) {
    const { totals } = group;

    return (
        <tr
            className="bg-transparent hover:bg-[var(--color-bg-hover)]/50 cursor-pointer transition-colors"
            onClick={onToggle}
        >
            {/* Chevron Column */}
            <td className="border border-[var(--color-border)] px-0.5 py-1.5 w-8">
                <button className="p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                    {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                    )}
                </button>
            </td>

            {/* Discipline/Trade Name */}
            <td className="border border-[var(--color-border)] px-1.5 py-1.5 font-medium whitespace-nowrap">
                <span className={group.groupId === null ? 'text-[var(--color-accent-yellow)] italic' : 'text-[var(--color-text-primary)]'}>
                    {group.groupName}
                </span>
            </td>

            {/* Description - show line count */}
            <td className="border border-[var(--color-border)] px-1.5 py-1.5 text-[var(--color-text-muted)] italic">
                {group.lines.length} {group.lines.length === 1 ? 'item' : 'items'}
            </td>

            {/* Aggregated numeric columns */}
            <td className="border border-[var(--color-border)] px-1.5 py-1.5 text-right text-[var(--color-text-primary)] font-bold">
                {formatCurrency(totals.budget)}
            </td>
            <td className="border border-[var(--color-border)] px-1.5 py-1.5 text-right text-[var(--color-text-primary)]">
                {formatCurrency(totals.approvedContract)}
            </td>
            <td className="col-priority-3 border border-[var(--color-border)] px-1.5 py-1.5 text-right text-[var(--color-text-muted)]">
                {totals.forecastVars ? formatCurrency(totals.forecastVars) : '-'}
            </td>
            <td className="col-priority-3 border border-[var(--color-border)] px-1.5 py-1.5 text-right text-[var(--color-text-muted)]">
                {totals.approvedVars ? formatCurrency(totals.approvedVars) : '-'}
            </td>
            <td className="col-priority-3 border border-[var(--color-border)] px-1.5 py-1.5 text-right text-[var(--color-text-primary)] font-bold">
                {formatCurrency(totals.finalForecast)}
            </td>
            <td className="col-priority-2 border border-[var(--color-border)] px-1.5 py-1.5 text-right">
                <span className={totals.variance < 0 ? 'text-[var(--color-accent-coral)]' : totals.variance > 0 ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-text-muted)]'}>
                    {totals.variance !== 0 ? formatCurrency(totals.variance) : '-'}
                </span>
            </td>
            <td className="col-priority-2 border border-[var(--color-border)] px-1.5 py-1.5 text-right text-[var(--color-text-muted)]">
                {totals.claimed ? formatCurrency(totals.claimed) : '-'}
            </td>
            <td className="col-priority-1 border border-[var(--color-border)] px-1.5 py-1.5 text-right text-[var(--color-text-muted)]">
                {totals.currentMonth ? formatCurrency(totals.currentMonth) : '-'}
            </td>
            <td className="col-priority-1 border border-[var(--color-border)] px-1.5 py-1.5 text-right text-[var(--color-text-muted)]">
                {totals.etc ? formatCurrency(totals.etc) : '-'}
            </td>

            {/* Generate column - empty for group row */}
            <td className="border border-[var(--color-border)] px-1 py-1.5 w-7"></td>
            {/* Actions column - empty for group row */}
            <td className="border border-[var(--color-border)] px-1 py-1.5 w-7"></td>
        </tr>
    );
}

interface ReadOnlyLineRowProps {
    line: CostLineWithCalculations;
    isIndented?: boolean;
    showDiscipline?: boolean;
    disciplineName?: string;
    onCollapse?: () => void;
}

function ReadOnlyLineRow({ line, isIndented = false, showDiscipline = false, disciplineName, onCollapse }: ReadOnlyLineRowProps) {
    const variance = line.calculated.varianceToBudgetCents;

    return (
        <tr className={`bg-transparent hover:bg-[var(--color-bg-hover)]/50 ${isIndented ? 'opacity-90' : ''}`}>
            {/* Chevron to collapse (only on first row when expanded) */}
            <td className="border border-[var(--color-border)] px-0.5 py-1 w-8">
                {showDiscipline && onCollapse ? (
                    <button
                        onClick={onCollapse}
                        className="p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    >
                        <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                ) : null}
            </td>

            {/* Discipline/Trade - show name on first row, dash on others */}
            <td className="border border-[var(--color-border)] px-1.5 py-1 text-[var(--color-text-primary)] whitespace-nowrap">
                {showDiscipline ? disciplineName : '-'}
            </td>

            {/* Description */}
            <td className="border border-[var(--color-border)] px-1.5 py-1 text-[var(--color-text-primary)]">
                {line.activity}
            </td>

            {/* All numeric fields - read-only */}
            <td className="border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-primary)]">
                {formatCurrency(line.budgetCents)}
            </td>
            <td className="border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-primary)]">
                {formatCurrency(line.approvedContractCents)}
            </td>
            <td className="col-priority-3 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-muted)]">
                {line.calculated.forecastVariationsCents ? formatCurrency(line.calculated.forecastVariationsCents) : '-'}
            </td>
            <td className="col-priority-3 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-muted)]">
                {line.calculated.approvedVariationsCents ? formatCurrency(line.calculated.approvedVariationsCents) : '-'}
            </td>
            <td className="col-priority-3 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-primary)]">
                {formatCurrency(line.calculated.finalForecastCents)}
            </td>
            <td className="col-priority-2 border border-[var(--color-border)] px-1.5 py-1 text-right">
                <span className={variance < 0 ? 'text-[var(--color-accent-coral)]' : variance > 0 ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-text-muted)]'}>
                    {variance !== 0 ? formatCurrency(variance) : '-'}
                </span>
            </td>
            <td className="col-priority-2 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-muted)]">
                {line.calculated.claimedToDateCents ? formatCurrency(line.calculated.claimedToDateCents) : '-'}
            </td>
            <td className="col-priority-1 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-muted)]">
                {line.calculated.currentMonthCents ? formatCurrency(line.calculated.currentMonthCents) : '-'}
            </td>
            <td className="col-priority-1 border border-[var(--color-border)] px-1.5 py-1 text-right text-[var(--color-text-muted)]">
                {line.calculated.etcCents ? formatCurrency(line.calculated.etcCents) : '-'}
            </td>

            {/* No generate button in read-only mode */}
            <td className="border border-[var(--color-border)] px-1 py-1 w-7"></td>
            {/* No delete button in read-only mode */}
            <td className="border border-[var(--color-border)] px-1 py-1 w-7"></td>
        </tr>
    );
}

// ============================================================================
// DELETE CONFIRM DIALOG
// ============================================================================

interface DeleteConfirmDialogProps {
    activity: string;
    onClose: () => void;
    onConfirm: () => void;
    isSubmitting: boolean;
}

function DeleteConfirmDialog({ activity, onClose, onConfirm, isSubmitting }: DeleteConfirmDialogProps) {
    // Handle Enter key to confirm delete
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !isSubmitting) {
                e.preventDefault();
                onConfirm();
            } else if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onConfirm, onClose, isSubmitting]);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow-xl w-full max-w-sm border border-[var(--color-border)]">
                <div className="px-4 py-3 border-b border-[var(--color-border)]">
                    <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Delete Cost Line</h2>
                </div>
                <div className="p-4 space-y-4">
                    <p className="text-sm text-[var(--color-text-primary)]">
                        Are you sure you want to delete <strong>&quot;{activity}&quot;</strong>?
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                        This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-xs bg-[var(--color-accent-coral)] text-white rounded hover:bg-[var(--color-accent-coral)]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// BULK DELETE CONFIRM DIALOG
// ============================================================================

interface BulkDeleteConfirmDialogProps {
    count: number;
    onClose: () => void;
    onConfirm: () => void;
    isSubmitting: boolean;
}

function BulkDeleteConfirmDialog({ count, onClose, onConfirm, isSubmitting }: BulkDeleteConfirmDialogProps) {
    // Handle Enter key to confirm delete
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !isSubmitting) {
                e.preventDefault();
                onConfirm();
            } else if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onConfirm, onClose, isSubmitting]);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow-xl w-full max-w-sm border border-[var(--color-border)]">
                <div className="px-4 py-3 border-b border-[var(--color-border)]">
                    <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                        Delete {count} Cost Line{count > 1 ? 's' : ''}
                    </h2>
                </div>
                <div className="p-4 space-y-4">
                    <p className="text-sm text-[var(--color-text-primary)]">
                        Are you sure you want to delete <strong>{count}</strong> selected cost line{count > 1 ? 's' : ''}?
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                        This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-xs bg-[var(--color-accent-coral)] text-white rounded hover:bg-[var(--color-accent-coral)]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting ? 'Deleting...' : `Delete ${count} Item${count > 1 ? 's' : ''}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CostPlanPanel;
