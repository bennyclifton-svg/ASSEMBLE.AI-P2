/**
 * Meeting Stakeholder Table Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Displays attendees with attendance/distribution checkboxes.
 */

'use client';

import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MeetingAttendee, ReportAttendee } from '@/types/notes-meetings-reports';

// Union type to support both meeting and report attendees
type Attendee = MeetingAttendee | ReportAttendee;

interface MeetingStakeholderTableProps {
    attendees: Attendee[];
    onUpdateAttendee: (attendeeId: string, data: { isAttending?: boolean; isDistribution?: boolean }) => Promise<void>;
    onRemoveAttendee: (attendeeId: string) => Promise<void>;
    isLoading?: boolean;
    showAttendingColumn?: boolean;
    className?: string;
}

export function MeetingStakeholderTable({
    attendees,
    onUpdateAttendee,
    onRemoveAttendee,
    isLoading = false,
    showAttendingColumn = true,
    className,
}: MeetingStakeholderTableProps) {
    const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

    const getDisplayInfo = (attendee: Attendee) => {
        if (attendee.stakeholder) {
            return {
                group: attendee.stakeholder.stakeholderGroup || 'Unknown',
                subGroup: attendee.stakeholder.disciplineOrTrade || attendee.stakeholder.role || '-',
                firm: attendee.stakeholder.organization || '-',
                person: attendee.stakeholder.contactName || attendee.stakeholder.name,
            };
        }
        return {
            group: attendee.adhocGroup || 'Ad-hoc',
            subGroup: attendee.adhocSubGroup || '-',
            firm: attendee.adhocFirm || '-',
            person: attendee.adhocName || 'Unknown',
        };
    };

    if (attendees.length === 0) {
        return (
            <div className={cn('text-sm text-[var(--color-text-muted)] py-4 text-center', className)}>
                No attendees added yet. Click a group button above to add stakeholders.
            </div>
        );
    }

    return (
        <div className={cn('overflow-x-auto', className)}>
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-[var(--color-border)]">
                        <th className="text-left py-0.5 px-2 font-medium text-[var(--color-text-muted)]">Group</th>
                        <th className="text-left py-0.5 px-2 font-medium text-[var(--color-text-muted)]">Sub-Group</th>
                        <th className="text-left py-0.5 px-2 font-medium text-[var(--color-text-muted)]">Firm</th>
                        <th className="text-left py-0.5 px-2 font-medium text-[var(--color-text-muted)]">Person</th>
                        {showAttendingColumn && (
                            <th className="text-center py-0.5 px-2 font-medium text-[var(--color-text-muted)]">Attend</th>
                        )}
                        <th className="text-center py-0.5 px-2 font-medium text-[var(--color-text-muted)]">Dist</th>
                        <th className="w-10"></th>
                    </tr>
                </thead>
                <tbody>
                    {attendees.map((attendee) => {
                        const info = getDisplayInfo(attendee);
                        const isAdhoc = !attendee.stakeholderId;

                        return (
                            <tr
                                key={attendee.id}
                                className={cn(
                                    'border-b border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)]',
                                    isAdhoc && 'bg-[var(--color-bg-secondary)]'
                                )}
                                onMouseEnter={() => setHoveredRowId(attendee.id)}
                                onMouseLeave={() => setHoveredRowId(null)}
                            >
                                <td className="py-0.5 px-2 capitalize text-[var(--color-text-secondary)]">
                                    {info.group}
                                </td>
                                <td className="py-0.5 px-2 text-[var(--color-text-primary)]">
                                    {info.subGroup}
                                </td>
                                <td className="py-0.5 px-2 text-[var(--color-text-secondary)]">
                                    {info.firm}
                                </td>
                                <td className="py-0.5 px-2 text-[var(--color-text-primary)]">
                                    {info.person}
                                    {isAdhoc && (
                                        <span className="ml-2 text-xs text-[var(--color-text-muted)]">(ad-hoc)</span>
                                    )}
                                </td>
                                {showAttendingColumn && (
                                    <td className="py-0.5 px-2 text-center">
                                        <Checkbox
                                            checked={attendee.isAttending}
                                            onCheckedChange={(checked) =>
                                                onUpdateAttendee(attendee.id, { isAttending: !!checked })
                                            }
                                            disabled={isLoading}
                                        />
                                    </td>
                                )}
                                <td className="py-0.5 px-2 text-center">
                                    <Checkbox
                                        checked={attendee.isDistribution}
                                        onCheckedChange={(checked) =>
                                            onUpdateAttendee(attendee.id, { isDistribution: !!checked })
                                        }
                                        disabled={isLoading}
                                    />
                                </td>
                                <td className="py-0.5 px-2 text-center">
                                    {hoveredRowId === attendee.id && (
                                        <button
                                            onClick={() => onRemoveAttendee(attendee.id)}
                                            disabled={isLoading}
                                            className="p-1 hover:bg-[var(--color-border)] rounded disabled:opacity-50"
                                            title="Remove attendee"
                                        >
                                            <Trash className="h-3.5 w-3.5 text-[var(--color-text-muted)] hover:text-[var(--color-accent-coral)]" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default MeetingStakeholderTable;
