/**
 * TRRTenderProcessTable Component
 * Displays firms with shortlist status and RFT dates
 * Feature 012 - TRR Report
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { TenderProcessFirm } from '@/types/trr';
import { Star } from 'lucide-react';

function formatDisplayDate(dateString: string): string {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

interface TRRTenderProcessTableProps {
    firms: TenderProcessFirm[];
    projectId: string;
    disciplineId?: string | null;
    tradeId?: string | null;
}

export function TRRTenderProcessTable({
    firms,
    projectId,
    disciplineId,
    tradeId,
}: TRRTenderProcessTableProps) {
    const [rftDate, setRftDate] = useState<string | null>(null);
    const [firmDates, setFirmDates] = useState<Record<string, string>>({});

    // Fetch RFT date for this discipline/trade
    useEffect(() => {
        const fetchRftDate = async () => {
            try {
                const params = new URLSearchParams({ projectId });
                if (disciplineId) params.set('disciplineId', disciplineId);
                if (tradeId) params.set('tradeId', tradeId);

                const response = await fetch(`/api/rft-new?${params.toString()}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.rftDate) {
                        setRftDate(data.rftDate);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch RFT date:', error);
            }
        };

        if (projectId && (disciplineId || tradeId)) {
            fetchRftDate();
        }
    }, [projectId, disciplineId, tradeId]);

    // Refs for date inputs
    const dateInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const handleFirmDateChange = (firmId: string, date: string) => {
        setFirmDates((prev) => ({
            ...prev,
            [firmId]: date,
        }));
    };

    const handleDateClick = (firmId: string) => {
        dateInputRefs.current[firmId]?.showPicker();
    };

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#cccccc] uppercase tracking-wide">
                Tender Process
            </h3>
            <div className="border border-[#3e3e42] rounded overflow-hidden">
                {firms.length > 0 ? (
                    <table className="w-full text-sm">
                        <thead className="bg-[#2d2d30]">
                            <tr className="border-b border-[#3e3e42]">
                                <th className="px-4 py-2.5 text-left text-[#858585] font-medium w-[35%]">
                                    Company Name
                                </th>
                                <th className="px-4 py-2.5 text-left text-[#858585] font-medium w-[30%]">
                                    Contact
                                </th>
                                <th className="px-4 py-2.5 text-center text-[#858585] font-medium w-[10%]">
                                    Short
                                </th>
                                <th className="px-4 py-2.5 text-left text-[#858585] font-medium w-[25%]">
                                    Tender Release
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {firms.map((firm) => (
                                <tr key={firm.id} className="border-b border-[#3e3e42] last:border-0">
                                    <td className="px-4 py-2.5 text-[#cccccc]">
                                        {firm.companyName}
                                    </td>
                                    <td className="px-4 py-2.5 text-[#cccccc]">
                                        {firm.contactPerson || '-'}
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                        {firm.shortlisted && (
                                            <Star
                                                className="w-4 h-4 mx-auto"
                                                style={{ color: '#f1c40f', fill: '#f1c40f' }}
                                            />
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        {firm.shortlisted ? (
                                            <div
                                                className="inline-block cursor-pointer hover:bg-[#2a2a2a] px-2 py-1 rounded transition-colors relative"
                                                onClick={() => handleDateClick(firm.id)}
                                            >
                                                <span className="select-none text-[#cccccc]">
                                                    {formatDisplayDate(firmDates[firm.id] || rftDate || '') || '-'}
                                                </span>
                                                <input
                                                    ref={(el) => { dateInputRefs.current[firm.id] = el; }}
                                                    type="date"
                                                    value={firmDates[firm.id] || rftDate || ''}
                                                    onChange={(e) => handleFirmDateChange(firm.id, e.target.value)}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    tabIndex={-1}
                                                />
                                            </div>
                                        ) : (
                                            <span className="text-[#858585]">N/A</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="px-4 py-3 text-[#858585] text-sm">
                        No firms added
                    </div>
                )}
            </div>
        </div>
    );
}
