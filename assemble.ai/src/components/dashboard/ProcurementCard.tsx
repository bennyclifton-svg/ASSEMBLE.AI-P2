'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useConsultantDisciplines } from '@/lib/hooks/use-consultant-disciplines';
import { useContractorTrades } from '@/lib/hooks/use-contractor-trades';
import { ConsultantGallery } from '@/components/consultants/ConsultantGallery';
import { ContractorGallery } from '@/components/contractors/ContractorGallery';
import { CostPlanPanel } from '@/components/cost-plan/CostPlanPanel';

interface ProcurementCardProps {
    projectId: string;
    selectedDocumentIds: string[];
    onSetSelectedDocumentIds?: (ids: string[]) => void;
}

export function ProcurementCard({ projectId, selectedDocumentIds, onSetSelectedDocumentIds }: ProcurementCardProps) {
    const { disciplines, isLoading: isLoadingConsultants, updateBrief } = useConsultantDisciplines(projectId);
    const { trades, isLoading: isLoadingContractors, updateScope } = useContractorTrades(projectId);

    // Track active tabs
    const [activeMainTab, setActiveMainTab] = useState<string>('procurement');
    const [activeTab, setActiveTab] = useState<string | null>(null); // "discipline-{id}" or "trade-{id}"

    const enabledDisciplines = disciplines.filter(d => d.isEnabled);
    const enabledTrades = trades.filter(t => t.isEnabled);

    // Initialize active tab when data loads (first discipline, or first trade if no disciplines)
    useEffect(() => {
        if (!activeTab) {
            const firstItem = enabledDisciplines[0]?.id
                ? `discipline-${enabledDisciplines[0].id}`
                : enabledTrades[0]?.id
                    ? `trade-${enabledTrades[0].id}`
                    : null;
            if (firstItem) {
                setActiveTab(firstItem);
            }
        }
    }, [enabledDisciplines, enabledTrades, activeTab]);

    if (isLoadingConsultants || isLoadingContractors) {
        return (
            <div className="h-full flex items-center justify-center bg-[#252526]">
                <div className="text-[#cccccc]">Loading...</div>
            </div>
        );
    }

    return (
        <div className="h-full bg-[#252526] flex flex-col overflow-y-auto">
            <Tabs
                value={activeMainTab}
                onValueChange={setActiveMainTab}
                className="flex-1 flex flex-col px-6 pt-4 min-h-0"
            >
                <TabsList className="w-full justify-start bg-[#1e1e1e] border-b border-[#3e3e42] rounded-none h-auto p-0 mb-4">
                    <TabsTrigger
                        value="procurement"
                        className="data-[state=active]:bg-[#252526] data-[state=active]:text-[#cccccc] data-[state=active]:border-b-2 data-[state=active]:border-[#0e639c] rounded-none px-4 py-2 text-[#858585] text-2xl font-bold"
                    >
                        Procurement
                    </TabsTrigger>
                    <TabsTrigger
                        value="cost-planning"
                        className="data-[state=active]:bg-[#252526] data-[state=active]:text-[#cccccc] data-[state=active]:border-b-2 data-[state=active]:border-[#0e639c] rounded-none px-4 py-2 text-[#858585] text-2xl font-bold"
                    >
                        Cost Planning
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="procurement" className="flex-1 mt-0">
                    {enabledDisciplines.length === 0 && enabledTrades.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-[#3e3e42] rounded-lg">
                            <p className="text-sm text-[#858585] text-center px-4">
                                No disciplines or trades selected.
                                <br />
                                Enable disciplines or trades in the Planning Card to create tabs here.
                            </p>
                        </div>
                    ) : (
                        <Tabs
                            value={activeTab || (enabledDisciplines[0]?.id ? `discipline-${enabledDisciplines[0].id}` : enabledTrades[0]?.id ? `trade-${enabledTrades[0].id}` : '')}
                            onValueChange={(value) => setActiveTab(value)}
                            className="h-full flex flex-col"
                        >
                            <TabsList className="w-full justify-start bg-[#1e1e1e] border-b border-[#3e3e42] rounded-none h-auto p-0 overflow-x-auto flex items-center">
                                {/* Discipline tabs (Consultants) */}
                                {enabledDisciplines.map(d => (
                                    <TabsTrigger
                                        key={`discipline-${d.id}`}
                                        value={`discipline-${d.id}`}
                                        className="data-[state=active]:bg-[#252526] data-[state=active]:text-[#cccccc] data-[state=active]:border-b-2 data-[state=active]:border-[#4fc1ff] rounded-none px-4 py-2 text-[#858585] whitespace-nowrap"
                                    >
                                        {d.disciplineName}
                                    </TabsTrigger>
                                ))}

                                {/* Separator between disciplines and trades */}
                                {enabledDisciplines.length > 0 && enabledTrades.length > 0 && (
                                    <div className="h-6 w-px bg-[#3e3e42] mx-2 flex-shrink-0 self-center" />
                                )}

                                {/* Trade tabs (Contractors) */}
                                {enabledTrades.map(t => (
                                    <TabsTrigger
                                        key={`trade-${t.id}`}
                                        value={`trade-${t.id}`}
                                        className="data-[state=active]:bg-[#252526] data-[state=active]:text-[#cccccc] data-[state=active]:border-b-2 data-[state=active]:border-[#ffa726] rounded-none px-4 py-2 text-[#858585] whitespace-nowrap"
                                    >
                                        {t.tradeName}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {/* Discipline TabsContent (Consultants) */}
                            {enabledDisciplines.map(d => (
                                <TabsContent key={`discipline-${d.id}`} value={`discipline-${d.id}`} className="flex-1 mt-4 overflow-y-auto">
                                    <ConsultantGallery
                                        projectId={projectId}
                                        discipline={d.disciplineName}
                                        disciplineId={d.id}
                                        briefServices={d.briefServices || ''}
                                        briefFee={d.briefFee || ''}
                                        briefProgram={d.briefProgram || ''}
                                        onUpdateBrief={updateBrief}
                                        selectedDocumentIds={selectedDocumentIds}
                                        onSetSelectedDocumentIds={onSetSelectedDocumentIds}
                                    />
                                </TabsContent>
                            ))}

                            {/* Trade TabsContent (Contractors) */}
                            {enabledTrades.map(t => (
                                <TabsContent key={`trade-${t.id}`} value={`trade-${t.id}`} className="flex-1 mt-4 overflow-y-auto">
                                    <ContractorGallery
                                        projectId={projectId}
                                        trade={t.tradeName}
                                        tradeId={t.id}
                                        scopeWorks={t.scopeWorks || ''}
                                        scopePrice={t.scopePrice || ''}
                                        scopeProgram={t.scopeProgram || ''}
                                        onUpdateScope={updateScope}
                                        selectedDocumentIds={selectedDocumentIds}
                                        onSetSelectedDocumentIds={onSetSelectedDocumentIds}
                                    />
                                </TabsContent>
                            ))}
                        </Tabs>
                    )}
                </TabsContent>

                <TabsContent value="cost-planning" className="flex-1 mt-0 overflow-hidden">
                    <CostPlanPanel projectId={projectId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
