/**
 * Meeting Editor Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Full meeting editor with project info, stakeholder selection, and agenda sections.
 * Includes AI-powered content generation and polishing.
 */

'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { MeetingStakeholderSelector } from './MeetingStakeholderSelector';
import { MeetingStakeholderTable } from './MeetingStakeholderTable';
import { SectionSelectorDialog } from './SectionSelectorDialog';
import { MeetingAgendaSection } from './MeetingAgendaSection';
import { useMeeting, useMeetingSections, useMeetingAttendees } from '@/lib/hooks/use-meetings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, FileText, X, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MeetingAgendaType, GenerateContentResponse } from '@/types/notes-meetings-reports';
import type { StakeholderGroup } from '@/types/stakeholder';
import { markdownToHTML } from '@/lib/utils/report-formatting';

function formatDisplayDate(dateString: string | null): string {
    if (!dateString) return 'Select date';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

interface MeetingEditorProps {
    meetingId: string;
    projectId: string;
    agendaType: MeetingAgendaType;
    meetingDate: string | null;
    title: string;
    onTitleChange: (title: string) => Promise<void>;
    reportingPeriodStart?: string | null;
    reportingPeriodEnd?: string | null;
    onAgendaTypeChange: (type: MeetingAgendaType) => Promise<void>;
    onMeetingDateChange: (date: string | null) => Promise<void>;
    className?: string;
}

interface SourceInfo {
    notes: number;
    procurementDocs: number;
}

export function MeetingEditor({
    meetingId,
    projectId,
    agendaType,
    meetingDate,
    title,
    onTitleChange,
    reportingPeriodStart,
    reportingPeriodEnd,
    onAgendaTypeChange,
    onMeetingDateChange,
    className,
}: MeetingEditorProps) {
    const { meeting, isLoading: meetingLoading } = useMeeting({ meetingId });
    const {
        sections,
        isLoading: sectionsLoading,
        updateSection,
        syncSections,
    } = useMeetingSections(meetingId);
    const {
        attendees,
        isLoading: attendeesLoading,
        addAttendee,
        updateAttendee,
        removeAttendee,
        addStakeholderGroup,
    } = useMeetingAttendees(meetingId, projectId);

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
    const [lastSourceInfo, setLastSourceInfo] = useState<SourceInfo | null>(null);

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

    // Derive groups that have attendees from the current attendees list
    const groupsWithAttendees = useMemo(() => {
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
                // No stakeholders exist in this group for the project
                setGroupFeedback(`No ${group} stakeholders found in the project. Add stakeholders in the Stakeholders section first.`);
            } else if (result.added.length === 0 && result.alreadyAdded > 0) {
                // All stakeholders from this group are already added
                setGroupFeedback(`All ${result.totalInGroup} ${group} stakeholder${result.totalInGroup !== 1 ? 's are' : ' is'} already in the meeting.`);
            } else if (result.added.length > 0) {
                // Successfully added some stakeholders
                setGroupFeedback(`Added ${result.added.length} ${group} stakeholder${result.added.length !== 1 ? 's' : ''}`);
            }

            // Clear feedback after 3 seconds
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
                    contextType: 'meeting',
                    contextId: meetingId,
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
    }, [sections, projectId, meetingId, reportingPeriodStart, reportingPeriodEnd, updateSection]);

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

    if (meetingLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
            </div>
        );
    }

    return (
        <div className={cn('divide-y divide-[var(--color-border)]', className)}>
            {/* Project Info Header Table - TRR style */}
            {meeting?.project && (
                <div className="overflow-hidden rounded-lg">
                    <table className="w-full text-sm">
                        <tbody>
                            <tr className="border-b border-[var(--color-border)]">
                                <td className="w-36 px-4 py-2.5 text-[var(--color-document-header)] font-medium">
                                    Project Name
                                </td>
                                <td className="px-4 py-2.5 text-[var(--color-text-primary)]" colSpan={2}>
                                    {meeting.project.name}
                                </td>
                            </tr>
                            <tr className="border-b border-[var(--color-border)]">
                                <td className="px-4 py-2.5 text-[var(--color-document-header)] font-medium">
                                    Address
                                </td>
                                <td className="px-4 py-2.5 text-[var(--color-text-primary)]" colSpan={2}>
                                    {meeting.project.address || '-'}
                                </td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2.5 text-[var(--color-document-header)] font-medium">
                                    Document
                                </td>
                                <td className="px-4 py-2.5 text-[var(--color-text-primary)] font-semibold">
                                    {isEditingTitle ? (
                                        <Input
                                            value={localTitle}
                                            onChange={(e) => setLocalTitle(e.target.value)}
                                            onBlur={handleTitleBlur}
                                            onKeyDown={handleTitleKeyDown}
                                            autoFocus
                                            ref={titleInputRef}
                                            className="h-7 text-sm font-semibold bg-transparent border-[var(--color-border)] focus:border-[var(--color-accent-copper)]"
                                        />
                                    ) : (
                                        <span
                                            onClick={handleTitleClick}
                                            className="cursor-pointer hover:text-[var(--color-accent-copper)] transition-colors"
                                            title="Click to edit title"
                                        >
                                            {title}
                                        </span>
                                    )}
                                </td>
                                <td
                                    className="px-4 py-2.5 text-[var(--color-document-header)] font-medium cursor-pointer relative whitespace-nowrap text-right"
                                    onClick={handleDateClick}
                                >
                                    <span className="select-none">
                                        <span className="text-[var(--color-document-header)] font-medium">Issued</span>
                                        <span className="ml-4">{formatDisplayDate(meetingDate)}</span>
                                    </span>
                                    <input
                                        ref={dateInputRef}
                                        type="date"
                                        value={meetingDate || ''}
                                        onChange={(e) => onMeetingDateChange(e.target.value || null)}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        tabIndex={-1}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* Stakeholders Section */}
            <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                        Stakeholders:
                    </h3>
                    <MeetingStakeholderSelector
                        onSelectGroup={handleSelectGroup}
                        onAddAdhoc={() => setIsAddingAdhoc(true)}
                        selectedGroups={groupsWithAttendees}
                        disabled={isAddingGroup}
                    />
                </div>

                {/* Feedback message */}
                {groupFeedback && (
                    <div className={cn(
                        'mb-3 px-3 py-2 rounded-md text-sm',
                        groupFeedback.includes('No ') || groupFeedback.includes('Failed')
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : groupFeedback.includes('already')
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : 'bg-green-500/10 text-green-600 dark:text-green-400'
                    )}>
                        {groupFeedback}
                    </div>
                )}

                {/* Loading indicator for adding group */}
                {isAddingGroup && (
                    <div className="mb-3 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Adding stakeholders...</span>
                    </div>
                )}

                {/* Ad-hoc Form */}
                {isAddingAdhoc && (
                    <div className="mb-3 p-3 border border-[var(--color-border)] rounded-md bg-[var(--color-bg-secondary)]">
                        <div className="grid grid-cols-3 gap-2 mb-2">
                            <Input
                                placeholder="Name *"
                                value={adhocForm.adhocName}
                                onChange={(e) => setAdhocForm(f => ({ ...f, adhocName: e.target.value }))}
                            />
                            <Input
                                placeholder="Firm"
                                value={adhocForm.adhocFirm}
                                onChange={(e) => setAdhocForm(f => ({ ...f, adhocFirm: e.target.value }))}
                            />
                            <select
                                value={adhocForm.adhocGroup}
                                onChange={(e) => setAdhocForm(f => ({ ...f, adhocGroup: e.target.value as StakeholderGroup }))}
                                className="h-9 px-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-sm"
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
                />
            </div>

            {/* Agenda Section */}
            <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                        Agenda:
                    </h3>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSectionDialogOpen(true)}
                        disabled={isSyncingSections}
                        className="h-8 gap-1.5"
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
                        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-text-muted)]" />
                        <span className="ml-2 text-sm text-[var(--color-text-muted)]">
                            {isSyncingSections ? 'Updating sections...' : 'Loading...'}
                        </span>
                    </div>
                ) : topLevelSections.length === 0 ? (
                    <div className="text-sm text-[var(--color-text-muted)] py-4 text-center border border-dashed border-[var(--color-border)] rounded-md">
                        No agenda sections. Click &quot;Select Sections&quot; to choose which sections to include.
                    </div>
                ) : (
                    <>
                        {/* Source count indicator */}
                        {lastSourceInfo && (
                            <div className="mb-2 flex items-center gap-2 text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] px-3 py-2 rounded-md">
                                <FileText className="h-3.5 w-3.5" />
                                <span>
                                    Generated using {lastSourceInfo.notes} starred note{lastSourceInfo.notes !== 1 ? 's' : ''} and {lastSourceInfo.procurementDocs} procurement doc{lastSourceInfo.procurementDocs !== 1 ? 's' : ''}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 ml-auto"
                                    onClick={() => setLastSourceInfo(null)}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                        <div className="border border-[var(--color-border)] rounded-md overflow-hidden">
                            {topLevelSections.map((section) => (
                                <MeetingAgendaSection
                                    key={section.id}
                                    section={section}
                                    childSections={getChildSections(section.id)}
                                    onUpdateContent={handleUpdateSectionContent}
                                    onGenerate={handleGenerateContent}
                                    onPolish={handlePolishContent}
                                    isGenerating={generatingSectionId === section.id}
                                    isPolishing={polishingSectionId === section.id}
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
                variant="meeting"
                entityTitle={title}
            />
        </div>
    );
}

export default MeetingEditor;
