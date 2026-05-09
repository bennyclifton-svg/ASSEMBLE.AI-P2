/**
 * Report Editor Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Full report editor with project info, stakeholder distribution, and content sections.
 * Includes AI-powered content generation and polishing.
 */

'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { MeetingStakeholderSelector } from './MeetingStakeholderSelector';
import { MeetingStakeholderTable } from './MeetingStakeholderTable';
import { SectionSelectorDialog } from './SectionSelectorDialog';
import { ReportContentsSection } from './ReportContentsSection';
import { DateRangePicker } from './shared/DateRangePicker';
import { useReport, useReportSections, useReportAttendees } from '@/lib/hooks/use-reports';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, User, UserCircle, FileText, X, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    findFirstInstruction,
    refindInstruction,
    replaceInstructionWithContent,
    validateInstruction,
    extractSurroundingContent,
} from '@/lib/editor/instruction-utils';
import { toast } from 'sonner';
import type { Editor } from '@tiptap/react';
import type { ReportContentsType, GenerateContentResponse } from '@/types/notes-meetings-reports';
import type { StakeholderGroup } from '@/types/stakeholder';
import { markdownToHTML } from '@/lib/utils/report-formatting';
import { REPORT_RECORD_ACCENT, RecordSectionHeading } from './RecordSectionHeading';

function formatDisplayDate(dateString: string | null): string {
    if (!dateString) return 'dd/mm/yyyy';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

interface SourceInfo {
    notes: number;
    procurementDocs: number;
}

interface ReportEditorProps {
    reportId: string;
    projectId: string;
    contentsType: ReportContentsType;
    reportDate: string | null;
    title: string;
    onTitleChange: (title: string) => Promise<void>;
    preparedFor: string | null;
    preparedBy: string | null;
    reportingPeriodStart: string | null;
    reportingPeriodEnd: string | null;
    onContentsTypeChange: (type: ReportContentsType) => Promise<void>;
    onReportDateChange: (date: string | null) => Promise<void>;
    onPreparedForChange: (value: string | null) => Promise<void>;
    onPreparedByChange: (value: string | null) => Promise<void>;
    onReportingPeriodChange: (start: string | null, end: string | null) => Promise<void>;
    accentColor?: string;
    className?: string;
}

export function ReportEditor({
    reportId,
    projectId,
    reportDate,
    title,
    onTitleChange,
    preparedFor,
    preparedBy,
    reportingPeriodStart,
    reportingPeriodEnd,
    onReportDateChange,
    onPreparedForChange,
    onPreparedByChange,
    onReportingPeriodChange,
    accentColor = REPORT_RECORD_ACCENT,
    className,
}: ReportEditorProps) {
    const { report, isLoading: reportLoading } = useReport({ reportId });
    const {
        sections,
        isLoading: sectionsLoading,
        updateSection,
        syncSections,
    } = useReportSections(reportId);
    const {
        attendees,
        isLoading: attendeesLoading,
        addAttendee,
        updateAttendee,
        removeAttendee,
        addStakeholderGroup,
    } = useReportAttendees(reportId, projectId);

    const [isSyncingSections, setIsSyncingSections] = useState(false);
    const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
    const [isAddingAdhoc, setIsAddingAdhoc] = useState(false);
    const [isAddingGroup, setIsAddingGroup] = useState(false);
    const [groupFeedback, setGroupFeedback] = useState<string | null>(null);
    const [adhocForm, setAdhocForm] = useState({
        adhocName: '',
        adhocFirm: '',
        adhocGroup: '' as StakeholderGroup | '',
    });

    // AI generation state
    const [generatingSectionId, setGeneratingSectionId] = useState<string | null>(null);
    const [polishingSectionId, setPolishingSectionId] = useState<string | null>(null);
    const [executingSectionId, setExecutingSectionId] = useState<string | null>(null);
    const [lastSourceInfo, setLastSourceInfo] = useState<SourceInfo | null>(null);

    // Editor refs for // instruction execution
    const editorRefs = useRef<Map<string, Editor>>(new Map());

    // Title editing state
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [localTitle, setLocalTitle] = useState(title);
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Sync local title when prop changes
    useEffect(() => {
        setLocalTitle(title);
    }, [title]);

    const handleTitleClick = useCallback(() => {
        setIsEditingTitle(true);
    }, []);

    const handleTitleBlur = useCallback(async () => {
        setIsEditingTitle(false);
        if (localTitle !== title) {
            await onTitleChange(localTitle);
        }
    }, [localTitle, title, onTitleChange]);

    const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            setIsEditingTitle(false);
            if (localTitle !== title) {
                onTitleChange(localTitle);
            }
        } else if (e.key === 'Escape') {
            setLocalTitle(title);
            setIsEditingTitle(false);
        }
    }, [localTitle, title, onTitleChange]);

    // Date picker ref and handler
    const dateInputRef = useRef<HTMLInputElement>(null);
    const handleDateClick = useCallback(() => {
        dateInputRef.current?.showPicker();
    }, []);

    // Calculate which stakeholder groups have attendees (for button highlighting)
    const selectedGroups = useMemo<StakeholderGroup[]>(() => {
        const groups = new Set<StakeholderGroup>();
        for (const attendee of attendees) {
            if (attendee.stakeholder?.stakeholderGroup) {
                groups.add(attendee.stakeholder.stakeholderGroup as StakeholderGroup);
            } else if (attendee.adhocGroup) {
                groups.add(attendee.adhocGroup as StakeholderGroup);
            }
        }
        return Array.from(groups);
    }, [attendees]);

    // Handle section selection sync
    const handleSyncSections = useCallback(async (selectedKeys: string[]) => {
        try {
            setIsSyncingSections(true);
            await syncSections(selectedKeys);
        } catch (error) {
            console.error('Failed to sync sections:', error);
        } finally {
            setIsSyncingSections(false);
        }
    }, [syncSections]);

    // Current section keys for pre-checking in dialog
    const currentSectionKeys = useMemo(() =>
        sections.map(s => s.sectionKey),
    [sections]);

    // Handle stakeholder group selection
    const handleSelectGroup = async (group: StakeholderGroup) => {
        try {
            setIsAddingGroup(true);
            setGroupFeedback(null);
            const result = await addStakeholderGroup(group);

            if (result.totalInGroup === 0) {
                setGroupFeedback(`No ${group} stakeholders found in the project. Add stakeholders in the Stakeholders section first.`);
            } else if (result.added.length === 0 && result.alreadyAdded > 0) {
                setGroupFeedback(`All ${result.totalInGroup} ${group} stakeholder${result.totalInGroup !== 1 ? 's are' : ' is'} already in the distribution list.`);
            } else if (result.added.length > 0) {
                setGroupFeedback(`Added ${result.added.length} ${group} stakeholder${result.added.length !== 1 ? 's' : ''}`);
            }

            setTimeout(() => setGroupFeedback(null), 3000);
        } catch (error) {
            console.error('Failed to add stakeholder group:', error);
            setGroupFeedback(`Failed to add ${group} stakeholders. Please try again.`);
            setTimeout(() => setGroupFeedback(null), 3000);
        } finally {
            setIsAddingGroup(false);
        }
    };

    // Handle attendee update
    const handleUpdateAttendee = async (
        attendeeId: string,
        data: { isAttending?: boolean; isDistribution?: boolean }
    ) => {
        try {
            await updateAttendee(attendeeId, data);
        } catch (error) {
            console.error('Failed to update attendee:', error);
        }
    };

    // Handle attendee removal
    const handleRemoveAttendee = async (attendeeId: string) => {
        try {
            await removeAttendee(attendeeId);
        } catch (error) {
            console.error('Failed to remove attendee:', error);
        }
    };

    // Handle section content update
    const handleUpdateSectionContent = useCallback(async (sectionId: string, content: string) => {
        try {
            await updateSection(sectionId, { content });
        } catch (error) {
            console.error('Failed to update section:', error);
        }
    }, [updateSection]);

    // Handle AI content generation for a section
    const handleGenerateContent = useCallback(async (sectionId: string) => {
        const section = sections.find(s => s.id === sectionId);
        if (!section) return;

        try {
            setGeneratingSectionId(sectionId);
            setLastSourceInfo(null);

            const response = await fetch('/api/ai/generate-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    sectionKey: section.sectionKey,
                    sectionLabel: section.sectionLabel,
                    contextType: 'report',
                    contextId: reportId,
                    reportingPeriodStart: reportingPeriodStart || undefined,
                    reportingPeriodEnd: reportingPeriodEnd || undefined,
                    existingContent: section.content || undefined,
                    stakeholderId: section.stakeholderId || undefined,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate content');
            }

            const result: GenerateContentResponse = await response.json();

            // Convert markdown to HTML for rich text editor
            const htmlContent = markdownToHTML(result.content);

            // Update the section content
            await updateSection(sectionId, { content: htmlContent });

            // Show source info
            setLastSourceInfo(result.sourcesUsed);

        } catch (error) {
            console.error('Failed to generate content:', error);
        } finally {
            setGeneratingSectionId(null);
        }
    }, [sections, projectId, reportId, reportingPeriodStart, reportingPeriodEnd, updateSection]);

    // Handle AI content polishing for a section
    const handlePolishContent = useCallback(async (sectionId: string) => {
        const section = sections.find(s => s.id === sectionId);
        if (!section || !section.content) return;

        try {
            setPolishingSectionId(sectionId);

            const response = await fetch('/api/ai/polish-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: section.content,
                    sectionKey: section.sectionKey,
                    tone: 'professional',
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to polish content');
            }

            const result = await response.json();

            // Convert markdown to HTML for rich text editor
            const htmlContent = markdownToHTML(result.content);

            // Update the section content
            await updateSection(sectionId, { content: htmlContent });

        } catch (error) {
            console.error('Failed to polish content:', error);
        } finally {
            setPolishingSectionId(null);
        }
    }, [sections, updateSection]);

    // Handle editor ready for // instruction execution
    const handleEditorReady = useCallback((sectionId: string, editor: Editor) => {
        editorRefs.current.set(sectionId, editor);
    }, []);

    // Handle // instruction execution for a section
    const handleExecuteInstruction = useCallback(async (sectionId: string) => {
        const editor = editorRefs.current.get(sectionId);
        if (!editor) return;

        const match = findFirstInstruction(editor.state);
        if (!match) return;

        const validation = validateInstruction(match.instruction);
        if (!validation.valid) {
            toast.error(validation.error);
            return;
        }

        try {
            setExecutingSectionId(sectionId);

            const response = await fetch('/api/ai/execute-instruction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    instruction: match.instruction,
                    contextType: 'report',
                    contextId: reportId,
                    sectionId,
                    existingContent: extractSurroundingContent(editor),
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to execute instruction');
            }

            const result = await response.json();

            const updatedMatch = refindInstruction(editor.state, match.instruction);
            if (updatedMatch) {
                replaceInstructionWithContent(editor, updatedMatch, result.content);
            } else {
                toast.error('Could not find the instruction. It may have been modified.');
            }
        } catch (error) {
            console.error('[ReportEditor] Failed to execute instruction:', error);
            toast.error('Failed to execute instruction');
        } finally {
            setExecutingSectionId(null);
        }
    }, [projectId, reportId]);

    // Handle ad-hoc attendee addition
    const handleAddAdhoc = async () => {
        if (!adhocForm.adhocName.trim()) return;

        try {
            await addAttendee({
                adhocName: adhocForm.adhocName,
                adhocFirm: adhocForm.adhocFirm || undefined,
                adhocGroup: adhocForm.adhocGroup || undefined,
            });
            setAdhocForm({ adhocName: '', adhocFirm: '', adhocGroup: '' });
            setIsAddingAdhoc(false);
        } catch (error) {
            console.error('Failed to add ad-hoc attendee:', error);
        }
    };

    // Build nested sections structure
    const topLevelSections = sections.filter(s => !s.parentSectionId);
    const getChildSections = (parentId: string) =>
        sections.filter(s => s.parentSectionId === parentId);

    if (reportLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--sw-muted)]" />
            </div>
        );
    }

    return (
        <div className={cn('divide-y divide-[var(--sw-rule-2)] text-[var(--sw-ink)]', className)}>
            {/* Project Info Header Table - TRR style */}
            {report?.project && (
                <div className="overflow-hidden border-b border-[var(--sw-rule-2)]">
                    <table className="w-full text-sm">
                        <tbody>
                            <tr className="border-b border-[var(--sw-rule-2)]">
                                <td className="w-36 px-4 py-2.5 font-medium" style={{ color: accentColor }}>
                                    Project Name
                                </td>
                                <td className="px-4 py-2.5 text-[var(--sw-ink)]" colSpan={2}>
                                    {report.project.name}
                                </td>
                            </tr>
                            <tr className="border-b border-[var(--sw-rule-2)]">
                                <td className="px-4 py-2.5 font-medium" style={{ color: accentColor }}>
                                    Address
                                </td>
                                <td className="px-4 py-2.5 text-[var(--sw-ink)]" colSpan={2}>
                                    {report.project.address || '-'}
                                </td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2.5 font-medium" style={{ color: accentColor }}>
                                    Document
                                </td>
                                <td className="px-4 py-2.5 font-semibold text-[var(--sw-ink)]">
                                    {isEditingTitle ? (
                                        <Input
                                            value={localTitle}
                                            onChange={(e) => setLocalTitle(e.target.value)}
                                            onBlur={handleTitleBlur}
                                            onKeyDown={handleTitleKeyDown}
                                            autoFocus
                                            ref={titleInputRef}
                                            className="h-7 rounded-none border-[var(--sw-rule)] bg-white text-sm font-semibold focus-visible:ring-0 focus-visible:ring-offset-0"
                                        />
                                    ) : (
                                        <span
                                            onClick={handleTitleClick}
                                            className="cursor-pointer transition-colors hover:text-[var(--sw-rose-dk)]"
                                            title="Click to edit title"
                                        >
                                            {title}
                                        </span>
                                    )}
                                </td>
                                <td
                                    className="relative cursor-pointer whitespace-nowrap px-4 py-2.5 text-right font-medium"
                                    style={{ color: accentColor }}
                                    onClick={handleDateClick}
                                >
                                    <span className="select-none">
                                        <span className="font-medium">Issued</span>
                                        <span className="ml-4">{formatDisplayDate(reportDate)}</span>
                                    </span>
                                    <input
                                        ref={dateInputRef}
                                        type="date"
                                        value={reportDate || ''}
                                        onChange={(e) => onReportDateChange(e.target.value || null)}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        tabIndex={-1}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* Report Metadata */}
            <div className="px-4 py-3 space-y-3">
                <RecordSectionHeading accentColor={accentColor}>
                    Report Metadata
                </RecordSectionHeading>

                {/* Reporting Period */}
                <DateRangePicker
                    startDate={reportingPeriodStart}
                    endDate={reportingPeriodEnd}
                    onStartDateChange={(start) => onReportingPeriodChange(start, reportingPeriodEnd)}
                    onEndDateChange={(end) => onReportingPeriodChange(reportingPeriodStart, end)}
                    label="Reporting Period"
                />

                {/* Prepared For */}
                <div className="flex items-center gap-3">
                    <Label className="min-w-[100px] text-sm text-[var(--sw-muted)]">
                        <User className="h-4 w-4 inline mr-1.5" />
                        Prepared For:
                    </Label>
                    <Input
                        value={preparedFor || ''}
                        onChange={(e) => onPreparedForChange(e.target.value || null)}
                        placeholder="Enter recipient name or organization"
                        className="max-w-md flex-1 rounded-none border-[var(--sw-rule)] bg-white focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                </div>

                {/* Prepared By */}
                <div className="flex items-center gap-3">
                    <Label className="min-w-[100px] text-sm text-[var(--sw-muted)]">
                        <UserCircle className="h-4 w-4 inline mr-1.5" />
                        Prepared By:
                    </Label>
                    <Input
                        value={preparedBy || ''}
                        onChange={(e) => onPreparedByChange(e.target.value || null)}
                        placeholder="Enter author name"
                        className="max-w-md flex-1 rounded-none border-[var(--sw-rule)] bg-white focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                </div>
            </div>

            {/* Distribution List (Stakeholders) */}
            <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                    <RecordSectionHeading accentColor={accentColor}>
                        Distribution List
                    </RecordSectionHeading>
                    <MeetingStakeholderSelector
                        onSelectGroup={handleSelectGroup}
                        onAddAdhoc={() => setIsAddingAdhoc(true)}
                        selectedGroups={selectedGroups}
                        disabled={isAddingGroup}
                    />
                </div>

                {/* Feedback message */}
                {groupFeedback && (
                    <div className={cn(
                        'mb-3 border px-3 py-2 text-sm',
                        groupFeedback.includes('No ') || groupFeedback.includes('Failed')
                            ? 'border-[var(--sw-peach)] bg-[rgba(245,164,114,0.12)] text-[var(--sw-ink)]'
                            : groupFeedback.includes('already')
                                ? 'border-[var(--sw-cyan)] bg-[rgba(122,184,194,0.12)] text-[var(--sw-ink)]'
                                : 'border-[var(--sw-lav)] bg-[rgba(168,156,217,0.12)] text-[var(--sw-ink)]'
                    )}>
                        {groupFeedback}
                    </div>
                )}

                {/* Loading indicator for adding group */}
                {isAddingGroup && (
                    <div className="mb-3 flex items-center gap-2 text-sm text-[var(--sw-muted)]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Adding stakeholders...</span>
                    </div>
                )}

                {/* Ad-hoc Form */}
                {isAddingAdhoc && (
                    <div className="mb-3 border border-[var(--sw-rule)] bg-[var(--sw-paper)] p-3">
                        <div className="grid grid-cols-3 gap-2 mb-2">
                            <Input
                                placeholder="Name *"
                                value={adhocForm.adhocName}
                                onChange={(e) => setAdhocForm(f => ({ ...f, adhocName: e.target.value }))}
                                className="rounded-none border-[var(--sw-rule)] bg-white focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                            <Input
                                placeholder="Firm"
                                value={adhocForm.adhocFirm}
                                onChange={(e) => setAdhocForm(f => ({ ...f, adhocFirm: e.target.value }))}
                                className="rounded-none border-[var(--sw-rule)] bg-white focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                            <select
                                value={adhocForm.adhocGroup}
                                onChange={(e) => setAdhocForm(f => ({ ...f, adhocGroup: e.target.value as StakeholderGroup }))}
                                className="h-9 border border-[var(--sw-rule)] bg-white px-3 text-sm outline-none"
                            >
                                <option value="">Select group</option>
                                <option value="client">Client</option>
                                <option value="authority">Authority</option>
                                <option value="consultant">Consultant</option>
                                <option value="contractor">Contractor</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={handleAddAdhoc}
                                disabled={!adhocForm.adhocName.trim()}
                                className="rounded-none bg-[var(--sw-ink)] text-[var(--sw-paper)] hover:bg-[var(--sw-rose-dk)]"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    setIsAddingAdhoc(false);
                                    setAdhocForm({ adhocName: '', adhocFirm: '', adhocGroup: '' });
                                }}
                                className="rounded-none border border-[var(--sw-rule)] bg-transparent text-[var(--sw-ink)] hover:bg-white"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                <MeetingStakeholderTable
                    attendees={attendees}
                    onUpdateAttendee={handleUpdateAttendee}
                    onRemoveAttendee={handleRemoveAttendee}
                    isLoading={attendeesLoading}
                    showAttendingColumn={false}
                />
            </div>

            {/* Contents Section */}
            <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                    <RecordSectionHeading accentColor={accentColor}>
                        Contents
                    </RecordSectionHeading>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSectionDialogOpen(true)}
                        disabled={isSyncingSections}
                        className="h-8 gap-1.5 rounded-none border-[var(--sw-rule)] bg-transparent text-[var(--sw-ink)] hover:bg-white"
                    >
                        {isSyncingSections ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <ListChecks className="h-4 w-4" />
                        )}
                        Select Sections
                    </Button>
                </div>

                {sectionsLoading || isSyncingSections ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-[var(--sw-muted)]" />
                        <span className="ml-2 text-sm text-[var(--sw-muted)]">
                            {isSyncingSections ? 'Updating sections...' : 'Loading...'}
                        </span>
                    </div>
                ) : topLevelSections.length === 0 ? (
                    <div className="border border-dashed border-[var(--sw-rule)] py-4 text-center text-sm text-[var(--sw-muted)]">
                        No content sections. Click &quot;Select Sections&quot; to choose which sections to include.
                    </div>
                ) : (
                    <>
                        {/* Source count indicator */}
                        {lastSourceInfo && (
                            <div className="mb-2 flex items-center gap-2 border border-[var(--sw-rule)] bg-[var(--sw-paper)] px-3 py-2 text-xs text-[var(--sw-muted)]">
                                <FileText className="h-3.5 w-3.5" />
                                <span>
                                    Generated using {lastSourceInfo.notes} starred note{lastSourceInfo.notes !== 1 ? 's' : ''} and {lastSourceInfo.procurementDocs} procurement doc{lastSourceInfo.procurementDocs !== 1 ? 's' : ''}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="ml-auto h-5 w-5 rounded-none hover:bg-white"
                                    onClick={() => setLastSourceInfo(null)}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                        <div className="overflow-hidden border border-[var(--sw-rule)]">
                            {topLevelSections.map((section) => (
                                <ReportContentsSection
                                    key={section.id}
                                    section={section}
                                    childSections={getChildSections(section.id)}
                                    onUpdateContent={handleUpdateSectionContent}
                                    onGenerate={handleGenerateContent}
                                    onPolish={handlePolishContent}
                                    onExecuteInstruction={handleExecuteInstruction}
                                    onEditorReady={handleEditorReady}
                                    isGenerating={generatingSectionId === section.id}
                                    isPolishing={polishingSectionId === section.id}
                                    isExecuting={executingSectionId === section.id}
                                    accentColor={accentColor}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Section Selector Dialog */}
            <SectionSelectorDialog
                projectId={projectId}
                isOpen={isSectionDialogOpen}
                onClose={() => setIsSectionDialogOpen(false)}
                onApply={handleSyncSections}
                currentSectionKeys={currentSectionKeys}
                variant="report"
                entityTitle={title}
            />
        </div>
    );
}

export default ReportEditor;
