/**
 * TRRHeaderTable Component
 * Displays the header table with Project Name, Address, Document title, and Date
 * Feature 012 - TRR Report
 */

'use client';

import { useRef } from 'react';

interface TRRHeaderTableProps {
    projectName: string;
    address: string;
    documentTitle: string;
    reportDate: string;
    onDateChange: (date: string) => void;
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
}: TRRHeaderTableProps) {
    const dateInputRef = useRef<HTMLInputElement>(null);

    const handleDateClick = () => {
        dateInputRef.current?.showPicker();
    };

    return (
        <div className="overflow-hidden rounded-lg">
            <table className="w-full text-sm">
                <tbody>
                    <tr className="border-b border-[var(--color-border)]">
                        <td className="w-36 px-4 py-2.5 text-[var(--color-document-header)] font-medium">
                            Project Name
                        </td>
                        <td className="px-4 py-2.5 text-[var(--color-text-primary)]" colSpan={2}>
                            {projectName}
                        </td>
                    </tr>
                    <tr className="border-b border-[var(--color-border)]">
                        <td className="px-4 py-2.5 text-[var(--color-document-header)] font-medium">
                            Address
                        </td>
                        <td className="px-4 py-2.5 text-[var(--color-text-primary)]" colSpan={2}>
                            {address || '-'}
                        </td>
                    </tr>
                    <tr>
                        <td className="px-4 py-2.5 text-[var(--color-document-header)] font-medium">
                            Document
                        </td>
                        <td className="px-4 py-2.5 text-[var(--color-text-primary)] font-semibold">
                            {documentTitle}
                        </td>
                        <td
                            className="px-4 py-2.5 text-[var(--color-document-header)] font-medium cursor-pointer relative whitespace-nowrap text-right"
                            onClick={handleDateClick}
                        >
                            <span className="select-none">
                                <span className="text-[var(--color-document-header)] font-medium">Issued</span>
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
