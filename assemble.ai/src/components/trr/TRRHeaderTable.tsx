/**
 * TRRHeaderTable Component
 * Displays the header table with Project Name, Address, Document title, and Date
 * Feature 012 - TRR Report
 */

'use client';

import { useRef } from 'react';
import { TRR_ACCENT_COLOR } from './TRRSectionHeading';

interface TRRHeaderTableProps {
    projectName: string;
    address: string;
    documentTitle: string;
    reportDate: string;
    onDateChange: (date: string) => void;
    surface?: 'procurement' | 'record';
}

function formatDisplayDate(dateString: string): string {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

export function TRRHeaderTable({
    projectName,
    address,
    documentTitle,
    reportDate,
    onDateChange,
    surface = 'procurement',
}: TRRHeaderTableProps) {
    const dateInputRef = useRef<HTMLInputElement>(null);
    const usesRecordSurface = surface === 'record';

    const handleDateClick = () => {
        dateInputRef.current?.showPicker();
    };

    return (
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
                        <td className="w-36 px-4 py-2.5 font-medium" style={{ color: TRR_ACCENT_COLOR }}>
                            Project Name
                        </td>
                        <td className="px-4 py-2.5 text-[var(--color-text-primary)]" colSpan={2}>
                            {projectName}
                        </td>
                    </tr>
                    <tr
                        className={usesRecordSurface ? undefined : 'border-b border-[var(--color-border)]'}
                        style={usesRecordSurface ? { borderBottom: '1px solid var(--sw-rule-2)' } : undefined}
                    >
                        <td className="px-4 py-2.5 font-medium" style={{ color: TRR_ACCENT_COLOR }}>
                            Address
                        </td>
                        <td className="px-4 py-2.5 text-[var(--color-text-primary)]" colSpan={2}>
                            {address || '-'}
                        </td>
                    </tr>
                    <tr>
                        <td className="px-4 py-2.5 font-medium" style={{ color: TRR_ACCENT_COLOR }}>
                            Document
                        </td>
                        <td className="px-4 py-2.5 text-[var(--color-text-primary)] font-semibold">
                            {documentTitle}
                        </td>
                        <td
                            className="px-4 py-2.5 font-medium cursor-pointer relative whitespace-nowrap text-right"
                            style={{ color: TRR_ACCENT_COLOR }}
                            onClick={handleDateClick}
                        >
                            <span className="select-none">
                                <span className="font-medium">Issued</span>
                                <span className="ml-4">{formatDisplayDate(reportDate)}</span>
                            </span>
                            <input
                                ref={dateInputRef}
                                type="date"
                                value={reportDate}
                                onChange={(e) => onDateChange(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                tabIndex={-1}
                            />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
