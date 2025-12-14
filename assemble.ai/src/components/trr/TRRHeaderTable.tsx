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
        <div className="border border-[#3e3e42] rounded overflow-hidden">
            <table className="w-full text-sm">
                <tbody>
                    <tr className="border-b border-[#3e3e42]">
                        <td className="w-36 px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium">
                            Project Name
                        </td>
                        <td className="px-4 py-2.5 text-[#cccccc]" colSpan={2}>
                            {projectName}
                        </td>
                    </tr>
                    <tr className="border-b border-[#3e3e42]">
                        <td className="px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium">
                            Address
                        </td>
                        <td className="px-4 py-2.5 text-[#cccccc]" colSpan={2}>
                            {address || '-'}
                        </td>
                    </tr>
                    <tr>
                        <td className="px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium">
                            Document
                        </td>
                        <td className="px-4 py-2.5 text-[#cccccc] font-semibold">
                            {documentTitle}
                        </td>
                        <td
                            className="w-36 px-4 py-2.5 text-[#cccccc] border-l border-[#3e3e42] cursor-pointer hover:bg-[#2a2a2a] transition-colors relative"
                            onClick={handleDateClick}
                        >
                            <span className="select-none">{formatDisplayDate(reportDate)}</span>
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
