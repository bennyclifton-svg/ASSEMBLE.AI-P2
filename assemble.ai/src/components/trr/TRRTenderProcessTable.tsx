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
    stakeholderId?: string | null;
}

export function TRRTenderProcessTable({
    firms,
    projectId,
    stakeholderId,
}: TRRTenderProcessTableProps) {
    const [rftDate, setRftDate] = useState<string | null>(null);
    const [firmDates, setFirmDates] = useState<Record<string, string>>({});

    // Fetch RFT date for this stakeholder (from the first/primary RFT)
    useEffect(() => {
        const fetchRftDate = async () => {
            try {
                const params = new URLSearchParams({ projectId });
                if (stakeholderId) params.set('stakeholderId', stakeholderId);

                const url = `/api/rft-new?${params.toString()}`;
                console.log('[TRRTenderProcess] Fetching RFT date from:', url);
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    console.log('[TRRTenderProcess] RFT data received:', data);
                    // API returns an array of RFTs - get the first one's date (RFT 01)
                    if (Array.isArray(data) && data.length > 0) {
                        const firstRftDate = data[0].rftDate;
                        console.log('[TRRTenderProcess] First RFT date:', firstRftDate);
                        if (firstRftDate) {
                            setRftDate(firstRftDate);
                        }
                    } else {
                        console.log('[TRRTenderProcess] No RFTs found for this stakeholder');
                    }
                } else {
                    console.error('[TRRTenderProcess] API response not OK:', response.status);
                }
            } catch (error) {
                console.error('[TRRTenderProcess] Failed to fetch RFT date:', error);
            }
        };

        console.log('[TRRTenderProcess] useEffect triggered - projectId:', projectId, 'stakeholderId:', stakeholderId);
        if (projectId && stakeholderId) {
            fetchRftDate();
        } else {
            console.log('[TRRTenderProcess] Skipping fetch - missing projectId or stakeholderId');
        }
    }, [projectId, stakeholderId]);

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
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                Tender Process
            </h3>
            <div className="overflow-hidden rounded-lg">
                {firms.length > 0 ? (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--color-border)]">
                                <th className="px-4 py-2.5 text-left text-[var(--color-document-header)] font-medium w-[35%]">
                                    Company Name
                                </th>
                                <th className="px-4 py-2.5 text-left text-[var(--color-document-header)] font-medium w-[30%]">
                                    Contact
                                </th>
                                <th className="px-4 py-2.5 text-center text-[var(--color-document-header)] font-medium w-[10%]">
                                    Short
                                </th>
                                <th className="px-4 py-2.5 text-left text-[var(--color-document-header)] font-medium w-[25%]">
                                    Tender Release
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {firms.map((firm) => (
                                <tr key={firm.id}>
                                    <td className="px-4 py-2.5 text-[var(--color-text-primary)]">
                                        {firm.companyName}
                                    </td>
                                    <td className="px-4 py-2.5 text-[var(--color-text-primary)]">
                                        {firm.contactPerson || '-'}
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                        {firm.shortlisted && (
                                            <Star
                                                className="w-4 h-4 mx-auto text-[var(--color-accent-yellow)]"
                                                style={{ fill: 'currentColor' }}
                                            />
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        {firm.shortlisted ? (
                                            <div
                                                className="inline-block cursor-pointer hover:bg-[var(--color-bg-secondary)] px-2 py-1 rounded transition-colors relative"
                                                onClick={() => handleDateClick(firm.id)}
                                            >
                                                <span className="select-none text-[var(--color-text-primary)]">
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
                                            <span className="text-[var(--color-text-muted)]">N/A</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="px-4 py-3 text-[var(--color-text-muted)] text-sm">
                        No firms added
                    </div>
                )}
            </div>
        </div>
    );
}
