'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, RefreshCw, FileSpreadsheet, GitBranch, FileText, Trash2, GripVertical, Check, X } from 'lucide-react';
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
import { formatCurrency } from '@/lib/calculations/cost-plan-formulas';
import { VariationsPanel } from './VariationsPanel';
import { InvoicesPanel } from './InvoicesPanel';
import type { CostLineSection, CostLineWithCalculations } from '@/types/cost-plan';

// App color palette - consistent with global styles
const COLORS = {
    bg: {
        primary: '#1e1e1e',
        secondary: '#252526',
        tertiary: '#2d2d30',
        hover: '#37373d',
    },
    text: {
        primary: '#cccccc',
        secondary: '#858585',
        muted: '#6e6e6e',
    },
    border: {
        primary: '#3e3e42',
        secondary: '#555555',
    },
    accent: {
        blue: '#0e639c',
        costPlan: '#B85C5C',
        variation: '#D4A574',
        invoice: '#6B9BD1',
    },
    status: {
        positive: '#4ade80',
        negative: '#f87171',
    },
};

const SECTION_NAMES: Record<CostLineSection, string> = {
    FEES: 'FEES AND CHARGES',
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
        <div className="h-full flex flex-col bg-[#1e1e1e]">
            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex-1 flex flex-col"
            >
                <TabsList className="w-full justify-start bg-[#252526] border-b border-[#3e3e42] rounded-none h-auto p-0 px-2">
                    <TabsTrigger
                        value="cost-plan"
                        className="data-[state=active]:bg-[#1e1e1e] data-[state=active]:text-[#cccccc] data-[state=active]:border-b-2 data-[state=active]:border-[#B85C5C] rounded-none px-4 py-2 text-[#858585] text-xs gap-2 font-medium"
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        Cost Plan
                    </TabsTrigger>
                    <TabsTrigger
                        value="variations"
                        className="data-[state=active]:bg-[#1e1e1e] data-[state=active]:text-[#cccccc] data-[state=active]:border-b-2 data-[state=active]:border-[#D4A574] rounded-none px-4 py-2 text-[#858585] text-xs gap-2 font-medium"
                    >
                        <GitBranch className="h-4 w-4" />
                        Variations
                    </TabsTrigger>
                    <TabsTrigger
                        value="invoices"
                        className="data-[state=active]:bg-[#1e1e1e] data-[state=active]:text-[#cccccc] data-[state=active]:border-b-2 data-[state=active]:border-[#6B9BD1] rounded-none px-4 py-2 text-[#858585] text-xs gap-2 font-medium"
                    >
                        <FileText className="h-4 w-4" />
                        Invoices
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="cost-plan" className="flex-1 mt-0 overflow-hidden">
                    <CostPlanSpreadsheet projectId={projectId} />
                </TabsContent>

                <TabsContent value="variations" className="flex-1 mt-0 overflow-hidden">
                    <VariationsPanel projectId={projectId} />
                </TabsContent>

                <TabsContent value="invoices" className="flex-1 mt-0 overflow-hidden">
                    <InvoicesPanel projectId={projectId} />
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
    const { createCostLine, updateCostLine, deleteCostLine, reorderCostLines, isSubmitting } = useCostLineMutations(projectId);

    const [showAddRow, setShowAddRow] = useState<CostLineSection | null>(null);
    const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; description: string } | null>(null);

    // Drag and drop state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [localLinesBySection, setLocalLinesBySection] = useState<Record<CostLineSection, CostLineWithCalculations[]>>({} as Record<CostLineSection, CostLineWithCalculations[]>);

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

    const handleCreateLine = async (section: CostLineSection, data: { description: string; costCode?: string; budgetCents?: number; approvedContractCents?: number }) => {
        await createCostLine({
            section,
            description: data.description,
            costCode: data.costCode,
            budgetCents: data.budgetCents,
            approvedContractCents: data.approvedContractCents,
            sortOrder: costLines.filter(l => l.section === section).length,
        });
        setShowAddRow(null);
        refetch();
    };

    const handleCellChange = async (id: string, field: string, value: string | number) => {
        let processedValue: string | number = value;

        if (['budgetCents', 'approvedContractCents'].includes(field)) {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            processedValue = Math.round(numValue * 100);
        }

        await updateCostLine(id, { [field]: processedValue });
        setEditingCell(null);
        refetch();
    };

    const handleDeleteLine = async (id: string) => {
        await deleteCostLine(id);
        setDeleteConfirm(null);
        refetch();
    };

    // Update local state when costLines change
    useEffect(() => {
        const grouped = SECTIONS.reduce((acc, section) => {
            acc[section] = costLines
                .filter(line => line.section === section)
                .sort((a, b) => a.sortOrder - b.sortOrder);
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
    }, []);

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

    const getSectionTotals = (lines: CostLineWithCalculations[]) => {
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

    if (error) {
        return (
            <div className="h-full flex items-center justify-center bg-[#1e1e1e]">
                <div className="text-center">
                    <p className="text-[#f87171] mb-2">Failed to load cost plan</p>
                    <button onClick={() => refetch()} className="text-sm text-[#0e639c] hover:text-[#1177bb]">
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
        <div className="h-full flex flex-col bg-[#1e1e1e]">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#3e3e42] bg-[#252526]">
                <div className="flex items-center gap-6 text-xs">
                    <span className="text-[#858585]">
                        Budget: <strong className="text-[#cccccc]">{formatCurrency(totals?.budgetCents || 0)}</strong>
                    </span>
                    <span className="text-[#858585]">
                        Variance: <strong className={totals && totals.varianceCents < 0 ? 'text-[#f87171]' : 'text-[#4ade80]'}>
                            {formatCurrency(totals?.varianceCents || 0)}
                        </strong>
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Month Selector */}
                    <select
                        value={`${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`}
                        onChange={(e) => {
                            const [year, month] = e.target.value.split('-').map(Number);
                            setSelectedMonth({ year, month });
                        }}
                        className="text-xs bg-[#252526] border border-[#3e3e42] text-[#cccccc] px-2 py-1 rounded hover:bg-[#2d2d30] focus:outline-none focus:border-[#0e639c] transition-colors"
                        title="Select reporting month"
                    >
                        {monthOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="p-1.5 text-[#858585] hover:text-[#cccccc] hover:bg-[#37373d] rounded transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Spreadsheet */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse text-xs" style={{ minWidth: '900px' }}>
                        <thead className="sticky top-0 z-10">
                            <tr style={{ backgroundColor: COLORS.accent.costPlan }}>
                                <th className="border border-[#8a4a4a] px-0.5 py-1.5 w-6" rowSpan={2}></th>
                                <th className="border border-[#8a4a4a] px-1.5 py-1.5 text-white font-medium text-left w-16" rowSpan={2}>Code</th>
                                <th className="border border-[#8a4a4a] px-1.5 py-1.5 text-white font-medium text-left w-20" rowSpan={2}>Company</th>
                                <th className="border border-[#8a4a4a] px-1.5 py-1.5 text-white font-medium text-left min-w-[60px]" rowSpan={2}>Description</th>
                                <th className="border border-[#8a4a4a] px-1.5 py-1.5 text-white font-medium text-right w-[72px]" rowSpan={2}>Budget</th>
                                <th className="border border-[#8a4a4a] px-1.5 py-1.5 text-white font-medium text-right w-[72px]" rowSpan={2}>Contract</th>
                                <th className="border border-[#8a4a4a] px-1.5 py-1.5 text-center font-medium w-[120px]" colSpan={2} style={{ backgroundColor: COLORS.accent.variation, color: '#1e1e1e' }}>VARIATIONS</th>
                                <th className="border border-[#8a4a4a] px-1.5 py-1.5 text-white font-medium text-right w-[72px]" rowSpan={2}>Forecast</th>
                                <th className="border border-[#8a4a4a] px-1.5 py-1.5 text-white font-medium text-right w-[72px]" rowSpan={2}>Variance</th>
                                <th className="border border-[#8a4a4a] px-1.5 py-1.5 text-white font-medium text-right w-[72px]" rowSpan={2}>Claimed</th>
                                <th className="border border-[#8a4a4a] px-1.5 py-1.5 text-white font-medium text-right w-[60px]" rowSpan={2}>Month</th>
                                <th className="border border-[#8a4a4a] px-1.5 py-1.5 text-white font-medium text-right w-[72px]" rowSpan={2}>Remaining</th>
                                <th className="border border-[#8a4a4a] px-1 py-1.5 w-7" rowSpan={2}></th>
                            </tr>
                            <tr style={{ backgroundColor: COLORS.accent.costPlan }}>
                                <th className="border border-[#8a4a4a] px-1.5 py-1 text-center font-medium w-[60px]" style={{ backgroundColor: COLORS.accent.variation, color: '#1e1e1e' }}>Forecast</th>
                                <th className="border border-[#8a4a4a] px-1.5 py-1 text-center font-medium w-[60px]" style={{ backgroundColor: COLORS.accent.variation, color: '#1e1e1e' }}>Approved</th>
                            </tr>
                        </thead>
                        <tbody>
                            {SECTIONS.map(section => {
                                const lines = linesBySection[section] || [];
                                const sectionTotals = getSectionTotals(lines);

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
                                        onDeleteLine={(id, description) => setDeleteConfirm({ id, description })}
                                        selectedIds={selectedIds}
                                        onRowClick={handleRowClick}
                                        showAddRow={showAddRow === section}
                                        onSaveNewLine={(data) => handleCreateLine(section, data)}
                                        onCancelNewLine={() => setShowAddRow(null)}
                                        isSubmitting={isSubmitting}
                                    />
                                );
                            })}

                            {/* GRAND TOTAL Row */}
                            <tr className="bg-[#2d2d30] font-semibold">
                                <td className="border border-[#3e3e42] px-0.5 py-1.5"></td>
                                <td className="border border-[#3e3e42] px-1.5 py-1.5 text-[#cccccc]" colSpan={3}>GRAND TOTAL</td>
                                <td className="border border-[#3e3e42] px-1.5 py-1.5 text-right text-[#cccccc]">{formatCurrency(totals?.budgetCents || 0)}</td>
                                <td className="border border-[#3e3e42] px-1.5 py-1.5 text-right text-[#cccccc]">{formatCurrency(totals?.approvedContractCents || 0)}</td>
                                <td className="border border-[#3e3e42] px-1.5 py-1.5 text-right text-[#cccccc]">{formatCurrency(totals?.forecastVariationsCents || 0)}</td>
                                <td className="border border-[#3e3e42] px-1.5 py-1.5 text-right text-[#cccccc]">{formatCurrency(totals?.approvedVariationsCents || 0)}</td>
                                <td className="border border-[#3e3e42] px-1.5 py-1.5 text-right text-[#cccccc]">{formatCurrency(totals?.finalForecastCents || 0)}</td>
                                <td className="border border-[#3e3e42] px-1.5 py-1.5 text-right">
                                    <span className={totals && totals.varianceCents < 0 ? 'text-[#f87171]' : 'text-[#4ade80]'}>
                                        {formatCurrency(totals?.varianceCents || 0)}
                                    </span>
                                </td>
                                <td className="border border-[#3e3e42] px-1.5 py-1.5 text-right text-[#cccccc]">{formatCurrency(totals?.claimedCents || 0)}</td>
                                <td className="border border-[#3e3e42] px-1.5 py-1.5 text-right text-[#cccccc]">{formatCurrency(totals?.currentMonthCents || 0)}</td>
                                <td className="border border-[#3e3e42] px-1.5 py-1.5 text-right text-[#cccccc]">{formatCurrency(totals?.etcCents || 0)}</td>
                                <td className="border border-[#3e3e42] px-1 py-1.5"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Drag overlay for better visual feedback */}
                <DragOverlay>
                    {activeLine ? (
                        <table className="w-full border-collapse text-xs" style={{ minWidth: '900px' }}>
                            <tbody>
                                <tr className="bg-[#37373d] shadow-lg opacity-90">
                                    <td className="border border-[#3e3e42] px-0.5 py-1 w-6">
                                        <GripVertical className="h-3.5 w-3.5 text-[#cccccc]" />
                                    </td>
                                    <td className="border border-[#3e3e42] px-1.5 py-1 text-[#6B9BD1] font-mono">{activeLine.costCode || '-'}</td>
                                    <td className="border border-[#3e3e42] px-1.5 py-1 text-[#858585]">{activeLine.company?.name || '-'}</td>
                                    <td className="border border-[#3e3e42] px-1.5 py-1 text-[#cccccc]">
                                        {activeLine.description}
                                        {selectedIds.size > 1 && (
                                            <span className="ml-2 px-1.5 py-0.5 bg-[#0e639c] text-white text-xs rounded">
                                                +{selectedIds.size - 1}
                                            </span>
                                        )}
                                    </td>
                                    <td className="border border-[#3e3e42] px-1.5 py-1 text-right text-[#6B9BD1]" colSpan={10}>
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
                    description={deleteConfirm.description}
                    onClose={() => setDeleteConfirm(null)}
                    onConfirm={() => handleDeleteLine(deleteConfirm.id)}
                    isSubmitting={isSubmitting}
                />
            )}
        </div>
    );
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
    onCellChange: (id: string, field: string, value: string | number) => void;
    onCancelEdit: () => void;
    onDeleteLine: (id: string, description: string) => void;
    // Selection props
    selectedIds: Set<string>;
    onRowClick: (lineId: string, section: CostLineSection, e: React.MouseEvent) => void;
    // Add line props
    showAddRow: boolean;
    onSaveNewLine: (data: { description: string; costCode?: string; budgetCents?: number; approvedContractCents?: number }) => Promise<void>;
    onCancelNewLine: () => void;
    isSubmitting: boolean;
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
}: SectionBlockProps) {
    return (
        <>
            {/* Section Header */}
            <tr className="bg-[#37373d]">
                <td className="border border-[#3e3e42] px-0.5 py-1.5"></td>
                <td className="border border-[#3e3e42] px-1.5 py-1.5 font-semibold text-[#cccccc]" colSpan={3}>
                    {SECTION_NAMES[section]}
                </td>
                <td className="border border-[#3e3e42] px-1.5 py-1.5" colSpan={9}></td>
                <td className="border border-[#3e3e42] px-1 py-1.5 text-center">
                    <button
                        onClick={onAddLine}
                        disabled={showAddRow}
                        className="p-0.5 text-[#858585] hover:text-[#cccccc] hover:bg-[#4e4e52] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={`Add line to ${SECTION_NAMES[section]}`}
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                </td>
            </tr>

            {/* Cost Lines with SortableContext */}
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
                        onDelete={() => onDeleteLine(line.id, line.description)}
                        isSelected={selectedIds.has(line.id)}
                        onRowClick={onRowClick}
                        selectedCount={selectedIds.size}
                    />
                ))}
            </SortableContext>

            {/* Inline Add Row */}
            {showAddRow && (
                <AddCostLineRow
                    onSave={onSaveNewLine}
                    onCancel={onCancelNewLine}
                    isSubmitting={isSubmitting}
                />
            )}

            {/* Sub-Total Row */}
            <tr className="bg-[#2d2d30]">
                <td className="border border-[#3e3e42] px-0.5 py-1"></td>
                <td className="border border-[#3e3e42] px-1.5 py-1 text-[#858585] font-medium" colSpan={3}>Sub-Total</td>
                <td className="border border-[#3e3e42] px-1.5 py-1 text-right text-[#cccccc]">{formatCurrency(sectionTotals.budget)}</td>
                <td className="border border-[#3e3e42] px-1.5 py-1 text-right text-[#cccccc]">{formatCurrency(sectionTotals.approvedContract)}</td>
                <td className="border border-[#3e3e42] px-1.5 py-1 text-right text-[#cccccc]">{formatCurrency(sectionTotals.forecastVars)}</td>
                <td className="border border-[#3e3e42] px-1.5 py-1 text-right text-[#cccccc]">{formatCurrency(sectionTotals.approvedVars)}</td>
                <td className="border border-[#3e3e42] px-1.5 py-1 text-right text-[#cccccc]">{formatCurrency(sectionTotals.finalForecast)}</td>
                <td className="border border-[#3e3e42] px-1.5 py-1 text-right">
                    <span className={sectionTotals.variance < 0 ? 'text-[#f87171]' : sectionTotals.variance > 0 ? 'text-[#4ade80]' : 'text-[#858585]'}>
                        {formatCurrency(sectionTotals.variance)}
                    </span>
                </td>
                <td className="border border-[#3e3e42] px-1.5 py-1 text-right text-[#cccccc]">{formatCurrency(sectionTotals.claimed)}</td>
                <td className="border border-[#3e3e42] px-1.5 py-1 text-right text-[#cccccc]">{formatCurrency(sectionTotals.currentMonth)}</td>
                <td className="border border-[#3e3e42] px-1.5 py-1 text-right text-[#cccccc]">{formatCurrency(sectionTotals.etc)}</td>
                <td className="border border-[#3e3e42] px-1 py-1"></td>
            </tr>
        </>
    );
}

interface SortableCostLineRowProps {
    line: CostLineWithCalculations;
    section: CostLineSection;
    editingCell: { id: string; field: string } | null;
    onStartEdit: (id: string, field: string) => void;
    onCellChange: (id: string, field: string, value: string | number) => void;
    onCancelEdit: () => void;
    onDelete: () => void;
    isSelected: boolean;
    onRowClick: (lineId: string, section: CostLineSection, e: React.MouseEvent) => void;
    selectedCount: number;
}

function SortableCostLineRow({
    line,
    section,
    editingCell,
    onStartEdit,
    onCellChange,
    onCancelEdit,
    onDelete,
    isSelected,
    onRowClick,
    selectedCount,
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
            isSelected={isSelected}
            isDragging={isDragging}
            onRowClick={onRowClick}
            dragHandleProps={{ ...attributes, ...listeners }}
            selectedCount={selectedCount}
        />
    );
}

interface CostLineRowProps {
    line: CostLineWithCalculations;
    section: CostLineSection;
    editingCell: { id: string; field: string } | null;
    onStartEdit: (id: string, field: string) => void;
    onCellChange: (id: string, field: string, value: string | number) => void;
    onCancelEdit: () => void;
    onDelete: () => void;
    isSelected: boolean;
    isDragging: boolean;
    onRowClick: (lineId: string, section: CostLineSection, e: React.MouseEvent) => void;
    dragHandleProps: Record<string, unknown>;
    selectedCount: number;
    style?: React.CSSProperties;
}

const CostLineRow = React.forwardRef<HTMLTableRowElement, CostLineRowProps>(function CostLineRow(
    { line, section, editingCell, onStartEdit, onCellChange, onCancelEdit, onDelete, isSelected, isDragging, onRowClick, dragHandleProps, selectedCount, style },
    ref
) {
    const variance = line.calculated.varianceToBudgetCents;
    const isEditing = (field: string) => editingCell?.id === line.id && editingCell?.field === field;

    const handleClick = (e: React.MouseEvent) => {
        // Only handle selection if not clicking on editable cell or delete button
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('input')) return;
        onRowClick(line.id, section, e);
    };

    return (
        <tr
            ref={ref}
            style={style}
            onClick={handleClick}
            className={`
                transition-colors group
                ${isDragging ? 'opacity-50 bg-[#37373d]' : 'bg-[#252526] hover:bg-[#2a2d2e]'}
                ${isSelected ? 'bg-[#264f78] hover:bg-[#264f78]' : ''}
            `}
        >
            {/* Grip Handle */}
            <td className="border border-[#3e3e42] px-0.5 py-1 w-6">
                <button
                    className="cursor-grab active:cursor-grabbing text-[#6e6e6e] hover:text-[#cccccc] p-0.5"
                    {...dragHandleProps}
                >
                    <GripVertical className="h-3.5 w-3.5" />
                </button>
            </td>
            <EditableCell
                value={line.costCode || ''}
                isEditing={isEditing('costCode')}
                onStartEdit={() => onStartEdit(line.id, 'costCode')}
                onSave={(value) => onCellChange(line.id, 'costCode', value)}
                onCancel={onCancelEdit}
                className="font-mono text-[#6B9BD1]"
            />
            <td className="border border-[#3e3e42] px-1.5 py-1 text-[#858585] truncate max-w-[80px]">
                {line.company?.name || '-'}
            </td>
            <EditableCell
                value={line.description}
                isEditing={isEditing('description')}
                onStartEdit={() => onStartEdit(line.id, 'description')}
                onSave={(value) => onCellChange(line.id, 'description', value)}
                onCancel={onCancelEdit}
                className="text-[#cccccc]"
            />
            <EditableNumberCell
                value={line.budgetCents / 100}
                isEditing={isEditing('budgetCents')}
                onStartEdit={() => onStartEdit(line.id, 'budgetCents')}
                onSave={(value) => onCellChange(line.id, 'budgetCents', value)}
                onCancel={onCancelEdit}
                className="text-[#6B9BD1]"
            />
            <EditableNumberCell
                value={line.approvedContractCents / 100}
                isEditing={isEditing('approvedContractCents')}
                onStartEdit={() => onStartEdit(line.id, 'approvedContractCents')}
                onSave={(value) => onCellChange(line.id, 'approvedContractCents', value)}
                onCancel={onCancelEdit}
                className="text-[#6B9BD1]"
            />
            <td className="border border-[#3e3e42] px-1.5 py-1 text-right text-[#858585]">
                {line.calculated.forecastVariationsCents ? formatCurrency(line.calculated.forecastVariationsCents) : '-'}
            </td>
            <td className="border border-[#3e3e42] px-1.5 py-1 text-right text-[#858585]">
                {line.calculated.approvedVariationsCents ? formatCurrency(line.calculated.approvedVariationsCents) : '-'}
            </td>
            <td className="border border-[#3e3e42] px-1.5 py-1 text-right text-[#cccccc]">
                {formatCurrency(line.calculated.finalForecastCents)}
            </td>
            <td className="border border-[#3e3e42] px-1.5 py-1 text-right">
                <span className={variance < 0 ? 'text-[#f87171]' : variance > 0 ? 'text-[#4ade80]' : 'text-[#858585]'}>
                    {variance !== 0 ? formatCurrency(variance) : '-'}
                </span>
            </td>
            <td className="border border-[#3e3e42] px-1.5 py-1 text-right text-[#858585]">
                {line.calculated.claimedToDateCents ? formatCurrency(line.calculated.claimedToDateCents) : '-'}
            </td>
            <td className="border border-[#3e3e42] px-1.5 py-1 text-right text-[#858585]">
                {line.calculated.currentMonthCents ? formatCurrency(line.calculated.currentMonthCents) : '-'}
            </td>
            <td className="border border-[#3e3e42] px-1.5 py-1 text-right text-[#858585]">
                {line.calculated.etcCents ? formatCurrency(line.calculated.etcCents) : '-'}
            </td>
            <td className="border border-[#3e3e42] px-1 py-1 text-center">
                <button
                    onClick={onDelete}
                    className="p-0.5 text-[#858585] hover:text-[#f87171] hover:bg-[#4e4e52] rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete line"
                >
                    <Trash2 className="h-3 w-3" />
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
            className="border border-[#3e3e42] px-1.5 py-1 cursor-text"
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
                    className={`w-full p-0 bg-transparent border-none text-[#cccccc] outline-none text-xs ${className}`}
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
            className="border border-[#3e3e42] px-1.5 py-1 text-right cursor-text"
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
                    className={`w-full p-0 bg-transparent border-none text-[#cccccc] text-right outline-none text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${className}`}
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
    onSave: (data: { description: string; costCode?: string; budgetCents?: number; approvedContractCents?: number }) => Promise<void>;
    onCancel: () => void;
    isSubmitting: boolean;
}

function AddCostLineRow({ onSave, onCancel, isSubmitting }: AddCostLineRowProps) {
    const descriptionRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState({
        costCode: '',
        description: '',
        budgetCents: 0,
        approvedContractCents: 0,
    });

    // Auto-focus description field
    useEffect(() => {
        descriptionRef.current?.focus();
    }, []);

    const handleSave = async () => {
        if (!formData.description.trim()) return;
        await onSave({
            description: formData.description,
            costCode: formData.costCode || undefined,
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

    const inputClass = "w-full px-1.5 py-1 bg-transparent border-none text-xs text-[#cccccc] placeholder-[#6e6e6e] focus:outline-none";
    const numberInputClass = `${inputClass} text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`;

    return (
        <tr className="bg-[#252526] hover:bg-[#2a2d2e]" onKeyDown={handleKeyDown}>
            <td className="border border-[#3e3e42] px-0.5 py-1"></td>
            <td className="border border-[#3e3e42] px-1 py-1">
                <input
                    type="text"
                    value={formData.costCode}
                    onChange={(e) => setFormData({ ...formData, costCode: e.target.value })}
                    placeholder="Code"
                    className={inputClass}
                />
            </td>
            <td className="border border-[#3e3e42] px-1.5 py-1 text-[#6e6e6e]">-</td>
            <td className="border border-[#3e3e42] px-1 py-1">
                <input
                    ref={descriptionRef}
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter description..."
                    className={inputClass}
                />
            </td>
            <td className="border border-[#3e3e42] px-1 py-1">
                <input
                    type="number"
                    value={formData.budgetCents / 100 || ''}
                    onChange={(e) => setFormData({ ...formData, budgetCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                    placeholder="0.00"
                    className={numberInputClass}
                />
            </td>
            <td className="border border-[#3e3e42] px-1 py-1">
                <input
                    type="number"
                    value={formData.approvedContractCents / 100 || ''}
                    onChange={(e) => setFormData({ ...formData, approvedContractCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                    placeholder="0.00"
                    className={numberInputClass}
                />
            </td>
            <td className="border border-[#3e3e42] px-1.5 py-1 text-right text-[#6e6e6e]">-</td>
            <td className="border border-[#3e3e42] px-1.5 py-1 text-right text-[#6e6e6e]">-</td>
            <td className="border border-[#3e3e42] px-1.5 py-1 text-right text-[#6e6e6e]">-</td>
            <td className="border border-[#3e3e42] px-1.5 py-1 text-right text-[#6e6e6e]">-</td>
            <td className="border border-[#3e3e42] px-1.5 py-1 text-right text-[#6e6e6e]">-</td>
            <td className="border border-[#3e3e42] px-1.5 py-1 text-right text-[#6e6e6e]">-</td>
            <td className="border border-[#3e3e42] px-1.5 py-1 text-right text-[#6e6e6e]">-</td>
            <td className="border border-[#3e3e42] px-1 py-1 text-center">
                <div className="flex items-center justify-center gap-1">
                    <button
                        onClick={handleSave}
                        disabled={!formData.description.trim() || isSubmitting}
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

interface DeleteConfirmDialogProps {
    description: string;
    onClose: () => void;
    onConfirm: () => void;
    isSubmitting: boolean;
}

function DeleteConfirmDialog({ description, onClose, onConfirm, isSubmitting }: DeleteConfirmDialogProps) {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-[#252526] rounded-lg shadow-xl w-full max-w-sm border border-[#3e3e42]">
                <div className="px-4 py-3 border-b border-[#3e3e42]">
                    <h2 className="text-sm font-semibold text-[#cccccc]">Delete Cost Line</h2>
                </div>
                <div className="p-4 space-y-4">
                    <p className="text-sm text-[#cccccc]">
                        Are you sure you want to delete <strong>&quot;{description}&quot;</strong>?
                    </p>
                    <p className="text-xs text-[#858585]">
                        This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs text-[#858585] hover:text-[#cccccc] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-xs bg-[#f87171] text-white rounded hover:bg-[#ef4444] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CostPlanPanel;
