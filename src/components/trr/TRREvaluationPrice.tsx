/**
 * TRREvaluationPrice Component
 * Displays evaluation price tables from the Evaluation report
 * Feature 012 - TRR Report
 */

'use client';

import { useState, useEffect } from 'react';

interface EvaluationRow {
    id: string;
    description: string;
    tableType: string;
    orderIndex: number;
}

interface EvaluationCell {
    id: string;
    rowId: string;
    firmId: string;
    amountCents: number;
}

interface Firm {
    id: string;
    companyName: string;
    shortlisted: boolean;
}

interface TRREvaluationPriceProps {
    projectId: string;
    disciplineId?: string | null;
    tradeId?: string | null;
}

export function TRREvaluationPrice({
    projectId,
    disciplineId,
    tradeId,
}: TRREvaluationPriceProps) {
    const [rows, setRows] = useState<EvaluationRow[]>([]);
    const [cells, setCells] = useState<EvaluationCell[]>([]);
    const [firms, setFirms] = useState<Firm[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchEvaluationData = async () => {
            setIsLoading(true);
            try {
                const contextType = disciplineId ? 'discipline' : 'trade';
                const contextId = disciplineId || tradeId;

                if (!contextId) return;

                // Fetch evaluation data - API returns rows with nested cells and firms
                const evalRes = await fetch(`/api/evaluation/${projectId}/${contextType}/${contextId}`);
                if (evalRes.ok) {
                    const response = await evalRes.json();
                    // API returns { success: true, data: { evaluation, rows, firms } }
                    const data = response.data || response;

                    if (data.rows) {
                        setRows(data.rows);
                        // Extract cells from nested row.cells arrays
                        const allCells: EvaluationCell[] = [];
                        for (const row of data.rows) {
                            if (row.cells && Array.isArray(row.cells)) {
                                allCells.push(...row.cells);
                            }
                        }
                        setCells(allCells);
                    }

                    // Use firms from evaluation API response - only shortlisted firms
                    if (data.firms && Array.isArray(data.firms)) {
                        const shortlistedFirms = data.firms
                            .filter((f: { shortlisted: boolean }) => f.shortlisted)
                            .map((f: { id: string; companyName: string; shortlisted: boolean }) => ({
                                id: f.id,
                                companyName: f.companyName,
                                shortlisted: f.shortlisted,
                            }));
                        setFirms(shortlistedFirms);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch evaluation data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (projectId && (disciplineId || tradeId)) {
            fetchEvaluationData();
        }
    }, [projectId, disciplineId, tradeId]);

    const formatCurrency = (cents: number): string => {
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(cents / 100);
    };

    const getCellAmount = (rowId: string, firmId: string): number => {
        const cell = cells.find((c) => c.rowId === rowId && c.firmId === firmId);
        return cell?.amountCents || 0;
    };

    const calculateSubtotal = (firmId: string, tableType: string, filteredRows: EvaluationRow[]): number => {
        const tableRows = filteredRows.filter((r) => r.tableType === tableType);
        return tableRows.reduce((sum, row) => sum + getCellAmount(row.id, firmId), 0);
    };

    // Check if a row has any cell values for shortlisted firms
    const rowHasData = (row: EvaluationRow): boolean => {
        return firms.some((firm) => getCellAmount(row.id, firm.id) !== 0);
    };

    // Filter out empty rows: must have description OR have cell values
    const filteredRows = rows.filter((row) => {
        const hasDescription = row.description && row.description.trim() !== '';
        const hasCellValues = rowHasData(row);
        return hasDescription || hasCellValues;
    });

    const hasData = filteredRows.length > 0 && firms.length > 0;

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#cccccc] uppercase tracking-wide">
                Evaluation Price
            </h3>
            <div className="border border-[#3e3e42] rounded overflow-hidden">
                {isLoading ? (
                    <div className="px-4 py-3 text-[#858585] text-sm">
                        Loading evaluation data...
                    </div>
                ) : hasData ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[#2d2d30]">
                                <tr className="border-b border-[#3e3e42]">
                                    <th className="px-4 py-2.5 text-left text-[#858585] font-medium min-w-[200px]">
                                        Description
                                    </th>
                                    {firms.map((firm) => (
                                        <th
                                            key={firm.id}
                                            className="px-4 py-2.5 text-right text-[#858585] font-medium min-w-[120px]"
                                        >
                                            {firm.companyName}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {/* Initial Price rows */}
                                {filteredRows
                                    .filter((r) => r.tableType === 'initial_price')
                                    .sort((a, b) => a.orderIndex - b.orderIndex)
                                    .map((row) => (
                                        <tr key={row.id} className="border-b border-[#3e3e42]">
                                            <td className="px-4 py-2.5 text-[#cccccc]">
                                                {row.description}
                                            </td>
                                            {firms.map((firm) => (
                                                <td
                                                    key={firm.id}
                                                    className="px-4 py-2.5 text-right text-[#cccccc]"
                                                >
                                                    {formatCurrency(getCellAmount(row.id, firm.id))}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}

                                {/* Sub-total row */}
                                <tr className="border-b border-[#3e3e42] bg-[#252526]">
                                    <td className="px-4 py-2.5 text-[#cccccc] font-semibold">
                                        SUB-TOTAL
                                    </td>
                                    {firms.map((firm) => (
                                        <td
                                            key={firm.id}
                                            className="px-4 py-2.5 text-right text-[#cccccc] font-semibold"
                                        >
                                            {formatCurrency(calculateSubtotal(firm.id, 'initial_price', filteredRows))}
                                        </td>
                                    ))}
                                </tr>

                                {/* Adds/Subs rows */}
                                {filteredRows
                                    .filter((r) => r.tableType === 'adds_subs')
                                    .sort((a, b) => a.orderIndex - b.orderIndex)
                                    .map((row) => (
                                        <tr key={row.id} className="border-b border-[#3e3e42]">
                                            <td className="px-4 py-2.5 text-[#cccccc]">
                                                {row.description}
                                            </td>
                                            {firms.map((firm) => (
                                                <td
                                                    key={firm.id}
                                                    className="px-4 py-2.5 text-right text-[#cccccc]"
                                                >
                                                    {formatCurrency(getCellAmount(row.id, firm.id))}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}

                                {/* Grand Total row */}
                                <tr className="bg-[#2d2d30]">
                                    <td className="px-4 py-2.5 text-[#cccccc] font-bold">
                                        GRAND TOTAL
                                    </td>
                                    {firms.map((firm) => {
                                        const initialTotal = calculateSubtotal(firm.id, 'initial_price', filteredRows);
                                        const addSubsTotal = calculateSubtotal(firm.id, 'adds_subs', filteredRows);
                                        return (
                                            <td
                                                key={firm.id}
                                                className="px-4 py-2.5 text-right text-[#cccccc] font-bold"
                                            >
                                                {formatCurrency(initialTotal + addSubsTotal)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="px-4 py-3 text-[#858585] text-sm">
                        No price evaluation completed
                    </div>
                )}
            </div>
        </div>
    );
}
