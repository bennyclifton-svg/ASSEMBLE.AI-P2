/**
 * Report Editor Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Full report editor with project info, stakeholder distribution, and content sections.
 * Includes AI-powered content generation and polishing.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { MeetingStakeholderSelector } from './MeetingStakeholderSelector';
import { MeetingStakeholderTable } from './MeetingStakeholderTable';
import { ReportContentsToolbar } from './ReportContentsToolbar';
import { ReportContentsSection } from './ReportContentsSection';
import { DateRangePicker } from './shared/DateRangePicker';
import { useReport, useReportSections, useReportAttendees } from '@/lib/hooks/use-reports';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Calendar, User, UserCircle, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportContentsType, GenerateContentResponse } from '@/types/notes-meetings-reports';
import type { StakeholderGroup } from '@/types/stakeholder';

interface SourceInfo {
    notes: number;
    procurementDocs: number;
}

interface ReportEditorProps {
    reportId: string;
    projectId: string;
    contentsType: ReportContentsType;
    reportDate: string | null;
    preparedFor: string | null;
    preparedBy: string | null;
    reportingPeriodStart: string | null;
    reportingPeriodEnd: string | null;
    onContentsTypeChange: (type: ReportContentsType) => Promise<void>;
    onReportDateChange: (date: string | null) => Promise<void>;
    onPreparedForChange: (value: string | null) => Promise<void>;
    onPreparedByChange: (value: string | null) => Promise<void>;
    onReportingPeriodChange: (start: string | null, end: string | null) => Promise<void>;
    className?: string;
}

export function ReportEditor({
    reportId,
    projectId,
    contentsType,
    reportDate,
    preparedFor,
    preparedBy,
    reportingPeriodStart,
    reportingPeriodEnd,
    onContentsTypeChange,
    onReportDateChange,
    onPreparedForChange,
    onPreparedByChange,
    onReportingPeriodChange,
    className,
}: ReportEditorProps) {
    const { report, isLoading: reportLoading } = useReport({ reportId });
    const {
        sections,
        isLoading: sectionsLoading,
        updateSection,
        generateSections,
    } = useReportSections(reportId);
    const {
        attendees,
        isLoading: attendeesLoading,
        addAttendee,
        updateAttendee,
        removeAttendee,
        addStakeholderGroup,
    } = useReportAttendees(reportId, projectId);

    const [isGeneratingSections, setIsGeneratingSections] = useState(false);
    const [isAddingAdhoc, setIsAddingAdhoc] = useState(false);
    const [adhocForm, setAdhocForm] = useState({
        adhocName: '',
        adhocFirm: '',
        adhocGroup: '' as StakeholderGroup | '',
    });

    // AI generation state
    const [generatingSectionId, setGeneratingSectionId] = useState<string | null>(null);
    const [polishingSectionId, setPolishingSectionId] = useState<string | null>(null);
    const [lastSourceInfo, setLastSourceInfo] = useState<SourceInfo | null>(null);

    // Handle contents type change
    const handleContentsTypeChange = async (type: ReportContentsType) => {
        try {
            setIsGeneratingSections(true);
            await generateSections(type);
            await onContentsTypeChange(type);
        } catch (error) {
            console.error('Failed to change contents type:', error);
        } finally {
            setIsGeneratingSections(false);
        }
    };

    // Handle stakeholder group selection
    const handleSelectGroup = async (group: StakeholderGroup) => {
        try {
            await addStakeholderGroup(group);
        } catch (error) {
            console.error('Failed to add stakeholder group:', error);
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

            // Update the section content
            await updateSection(sectionId, { content: result.content });

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

            // Update the section content
            await updateSection(sectionId, { content: result.content });

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

    if (reportLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
            </div>
        );
    }

    return (
        <div className={cn('divide-y divide-[var(--color-border)]', className)}>
            {/* Project Info */}
            {report?.project && (
                <div className="px-4 py-3 bg-[var(--color-bg-secondary)]">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-[var(--color-text-muted)]">Project:</span>
                            <span className="ml-2 text-[var(--color-text-primary)]">
                                {report.project.name}
                            </span>
                        </div>
                        <div>
                            <span className="text-[var(--color-text-muted)]">Address:</span>
                            <span className="ml-2 text-[var(--color-text-primary)]">
                                {report.project.address || 'Not set'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Metadata */}
            <div className="px-4 py-3 space-y-3">
                {/* Report Date */}
                <div className="flex items-center gap-3">
                    <Label className="text-sm text-[var(--color-text-muted)] min-w-[100px]">
                        <Calendar className="h-4 w-4 inline mr-1.5" />
                        Report Date:
                    </Label>
                    <Input
                        type="date"
                        value={reportDate || ''}
                        onChange={(e) => onReportDateChange(e.target.value || null)}
                        className="w-auto"
                    />
                </div>

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
                    <Label className="text-sm text-[var(--color-text-muted)] min-w-[100px]">
                        <User className="h-4 w-4 inline mr-1.5" />
                        Prepared For:
                    </Label>
                    <Input
                        value={preparedFor || ''}
                        onChange={(e) => onPreparedForChange(e.target.value || null)}
                        placeholder="Enter recipient name or organization"
                        className="flex-1 max-w-md"
                    />
                </div>

                {/* Prepared By */}
                <div className="flex items-center gap-3">
                    <Label className="text-sm text-[var(--color-text-muted)] min-w-[100px]">
                        <UserCircle className="h-4 w-4 inline mr-1.5" />
                        Prepared By:
                    </Label>
                    <Input
                        value={preparedBy || ''}
                        onChange={(e) => onPreparedByChange(e.target.value || null)}
                        placeholder="Enter author name"
                        className="flex-1 max-w-md"
                    />
                </div>
            </div>

            {/* Distribution List (Stakeholders) */}
            <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                        Distribution List:
                    </h3>
                    <MeetingStakeholderSelector
                        onSelectGroup={handleSelectGroup}
                        onAddAdhoc={() => setIsAddingAdhoc(true)}
                    />
                </div>

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
                    attendees={attendees.map(a => ({
                        ...a,
                        isAttending: true, // Reports use isDistribution but reuse the same table component
                    }))}
                    onUpdateAttendee={handleUpdateAttendee}
                    onRemoveAttendee={handleRemoveAttendee}
                    isLoading={attendeesLoading}
                    showAttendingColumn={false}
                />
            </div>

            {/* Contents Section */}
            <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                        Contents:
                    </h3>
                    <ReportContentsToolbar
                        currentType={contentsType}
                        onSelectType={handleContentsTypeChange}
                        isLoading={isGeneratingSections}
                    />
                </div>

                {sectionsLoading || isGeneratingSections ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-text-muted)]" />
                        <span className="ml-2 text-sm text-[var(--color-text-muted)]">
                            {isGeneratingSections ? 'Generating sections...' : 'Loading...'}
                        </span>
                    </div>
                ) : topLevelSections.length === 0 ? (
                    <div className="text-sm text-[var(--color-text-muted)] py-4 text-center border border-dashed border-[var(--color-border)] rounded-md">
                        No content sections. Select a contents type above to generate sections.
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
                                <ReportContentsSection
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
        </div>
    );
}

export default ReportEditor;
