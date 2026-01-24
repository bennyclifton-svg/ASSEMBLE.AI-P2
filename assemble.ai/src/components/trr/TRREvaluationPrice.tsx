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
    stakeholderId?: string | null;
}

export function TRREvaluationPrice({
    projectId,
    stakeholderId,
}: TRREvaluationPriceProps) {
    const [rows, setRows] = useState<EvaluationRow[]>([]);
    const [cells, setCells] = useState<EvaluationCell[]>([]);
    const [firms, setFirms] = useState<Firm[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchEvaluationData = async () => {
            setIsLoading(true);
            try {
                const contextType = 'stakeholder';
                const contextId = stakeholderId;

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

        if (projectId && stakeholderId) {
            fetchEvaluationData();
        }
    }, [projectId, stakeholderId]);

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
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                Evaluation Price
            </h3>
            <div className="border border-[var(--color-border)] rounded overflow-hidden">
                {isLoading ? (
                    <div className="px-4 py-3 text-[var(--color-text-muted)] text-sm">
                        Loading evaluation data...
                    </div>
                ) : hasData ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[var(--color-accent-copper-tint)]">
                                <tr className="border-b border-[var(--color-border)]">
                                    <th className="px-4 py-2.5 text-left text-[var(--primitive-copper-darker)] font-medium min-w-[200px]">
                                        Description
                                    </th>
                                    {firms.map((firm) => (
                                        <th
                                            key={firm.id}
                                            className="px-4 py-2.5 text-right text-[var(--primitive-copper-darker)] font-medium min-w-[120px]"
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
                                        <tr key={row.id} className="border-b border-[var(--color-border)]">
                                            <td className="px-4 py-2.5 text-[var(--color-text-primary)]">
                                                {row.description}
                                            </td>
                                            {firms.map((firm) => (
                                                <td
                                                    key={firm.id}
                                                    className="px-4 py-2.5 text-right text-[var(--color-text-primary)]"
                                                >
                                                    {formatCurrency(getCellAmount(row.id, firm.id))}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}

                                {/* Sub-total row */}
                                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                                    <td className="px-4 py-2.5 text-[var(--color-text-primary)] font-semibold">
                                        SUB-TOTAL
                                    </td>
                                    {firms.map((firm) => (
                                        <td
                                            key={firm.id}
                                            className="px-4 py-2.5 text-right text-[var(--color-text-primary)] font-semibold"
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
                                        <tr key={row.id} className="border-b border-[var(--color-border)]">
                                            <td className="px-4 py-2.5 text-[var(--color-text-primary)]">
                                                {row.description}
                                            </td>
                                            {firms.map((firm) => (
                                                <td
                                                    key={firm.id}
                                                    className="px-4 py-2.5 text-right text-[var(--color-text-primary)]"
                                                >
                                                    {formatCurrency(getCellAmount(row.id, firm.id))}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}

                                {/* Grand Total row */}
                                <tr className="bg-[var(--color-accent-copper-tint)]">
                                    <td className="px-4 py-2.5 text-[var(--primitive-copper-darker)] font-bold">
                                        GRAND TOTAL
                                    </td>
                                    {firms.map((firm) => {
                                        const initialTotal = calculateSubtotal(firm.id, 'initial_price', filteredRows);
                                        const addSubsTotal = calculateSubtotal(firm.id, 'adds_subs', filteredRows);
                                        return (
                                            <td
                                                key={firm.id}
                                                className="px-4 py-2.5 text-right text-[var(--color-text-primary)] font-bold"
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
                    <div className="px-4 py-3 text-[var(--color-text-muted)] text-sm">
                        No price evaluation completed
                    </div>
                )}
            </div>
        </div>
    );
}
