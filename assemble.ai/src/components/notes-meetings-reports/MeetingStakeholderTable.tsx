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
            <div
                className={cn('border border-dashed border-[var(--sw-rule)] py-4 text-center text-xs text-[var(--sw-muted)]', className)}
                style={{ fontFamily: 'var(--sw-font-mono)' }}
            >
                No attendees added yet. Click a group button above to add stakeholders.
            </div>
        );
    }

    return (
        <div className={cn('overflow-x-auto', className)}>
            <table className="w-full text-sm">
                <thead>
                    <tr
                        className="border-b border-[var(--sw-rule-2)]"
                        style={{ fontFamily: 'var(--sw-font-mono)', fontSize: 11, letterSpacing: '0.08em' }}
                    >
                        <th className="px-2 py-1 text-left font-medium text-[var(--sw-muted)]">group</th>
                        <th className="px-2 py-1 text-left font-medium text-[var(--sw-muted)]">sub-group</th>
                        <th className="px-2 py-1 text-left font-medium text-[var(--sw-muted)]">firm</th>
                        <th className="px-2 py-1 text-left font-medium text-[var(--sw-muted)]">person</th>
                        {showAttendingColumn && (
                            <th className="px-2 py-1 text-center font-medium text-[var(--sw-muted)]">attend</th>
                        )}
                        <th className="px-2 py-1 text-center font-medium text-[var(--sw-muted)]">dist</th>
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
                                    'border-b border-[var(--sw-rule-2)] hover:bg-[var(--sw-paper-2)]',
                                    isAdhoc && 'bg-[var(--sw-paper)]'
                                )}
                                onMouseEnter={() => setHoveredRowId(attendee.id)}
                                onMouseLeave={() => setHoveredRowId(null)}
                            >
                                <td className="px-2 py-1 capitalize text-[var(--sw-muted)]">
                                    {info.group}
                                </td>
                                <td className="px-2 py-1 text-[var(--sw-ink)]">
                                    {info.subGroup}
                                </td>
                                <td className="px-2 py-1 text-[var(--sw-muted)]">
                                    {info.firm}
                                </td>
                                <td className="px-2 py-1 text-[var(--sw-ink)]">
                                    {info.person}
                                    {isAdhoc && (
                                        <span className="ml-2 text-xs text-[var(--sw-muted)]">(ad-hoc)</span>
                                    )}
                                </td>
                                {showAttendingColumn && (
                                    <td className="px-2 py-1 text-center">
                                        <Checkbox
                                            checked={attendee.isAttending}
                                            onCheckedChange={(checked) =>
                                                onUpdateAttendee(attendee.id, { isAttending: !!checked })
                                            }
                                            disabled={isLoading}
                                            className="rounded-none border-[var(--sw-rule)] data-[state=checked]:border-[var(--sw-ink)] data-[state=checked]:bg-[var(--sw-ink)] data-[state=checked]:text-[var(--sw-paper)]"
                                        />
                                    </td>
                                )}
                                <td className="px-2 py-1 text-center">
                                    <Checkbox
                                        checked={attendee.isDistribution}
                                        onCheckedChange={(checked) =>
                                            onUpdateAttendee(attendee.id, { isDistribution: !!checked })
                                        }
                                        disabled={isLoading}
                                        className="rounded-none border-[var(--sw-rule)] data-[state=checked]:border-[var(--sw-ink)] data-[state=checked]:bg-[var(--sw-ink)] data-[state=checked]:text-[var(--sw-paper)]"
                                    />
                                </td>
                                <td className="px-2 py-1 text-center">
                                    <button
                                        onClick={() => onRemoveAttendee(attendee.id)}
                                        disabled={isLoading}
                                        className={cn(
                                            'p-1 hover:bg-[var(--sw-rose-tint)] disabled:opacity-50',
                                            hoveredRowId === attendee.id ? 'opacity-100' : 'opacity-0'
                                        )}
                                        title="Remove attendee"
                                    >
                                        <Trash className="h-3.5 w-3.5 text-[var(--sw-muted)] hover:text-[var(--sw-rose-dk)]" />
                                    </button>
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
