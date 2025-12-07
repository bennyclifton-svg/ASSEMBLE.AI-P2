'use client';

import { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useConsultantDisciplines } from '@/lib/hooks/use-consultant-disciplines';
import { useContractorTrades } from '@/lib/hooks/use-contractor-trades';
import { ConsultantGallery } from '@/components/consultants/ConsultantGallery';
import { ContractorGallery } from '@/components/contractors/ContractorGallery';
import { DisciplineRepoTiles, type GenerationMode } from '@/components/documents/DisciplineRepoTiles';
import { CostPlanPanel } from '@/components/cost-plan/CostPlanPanel';

interface ConsultantCardProps {
    projectId: string;
    selectedDocumentIds: string[];
    onSetSelectedDocumentIds?: (ids: string[]) => void;
}

export function ConsultantCard({ projectId, selectedDocumentIds, onSetSelectedDocumentIds }: ConsultantCardProps) {
    const { disciplines, isLoading: isLoadingConsultants, updateBrief } = useConsultantDisciplines(projectId);
    const { trades, isLoading: isLoadingContractors, updateScope } = useContractorTrades(projectId);

    // Track active tabs
    const [activeMainTab, setActiveMainTab] = useState<string>('consultants');
    const [activeDiscipline, setActiveDiscipline] = useState<string | null>(null);
    const [activeTrade, setActiveTrade] = useState<string | null>(null);

    // Track generation modes per discipline/trade
    const [disciplineModes, setDisciplineModes] = useState<Record<string, GenerationMode>>({});
    const [tradeModes, setTradeModes] = useState<Record<string, GenerationMode>>({});

    const enabledDisciplines = disciplines.filter(d => d.isEnabled);
    const enabledTrades = trades.filter(t => t.isEnabled);

    // Initialize active tabs when data loads
    useEffect(() => {
        if (enabledDisciplines.length > 0 && !activeDiscipline) {
            setActiveDiscipline(enabledDisciplines[0].id);
        }
    }, [enabledDisciplines, activeDiscipline]);

    useEffect(() => {
        if (enabledTrades.length > 0 && !activeTrade) {
            setActiveTrade(enabledTrades[0].id);
        }
    }, [enabledTrades, activeTrade]);

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
                        value="consultants"
                        className="data-[state=active]:bg-[#252526] data-[state=active]:text-[#cccccc] data-[state=active]:border-b-2 data-[state=active]:border-[#0e639c] rounded-none px-4 py-2 text-[#858585]"
                    >
                        Consultants ({enabledDisciplines.length})
                    </TabsTrigger>
                    <TabsTrigger
                        value="contractors"
                        className="data-[state=active]:bg-[#252526] data-[state=active]:text-[#cccccc] data-[state=active]:border-b-2 data-[state=active]:border-[#0e639c] rounded-none px-4 py-2 text-[#858585]"
                    >
                        Contractors ({enabledTrades.length})
                    </TabsTrigger>
                    <TabsTrigger
                        value="cost-planning"
                        className="data-[state=active]:bg-[#252526] data-[state=active]:text-[#cccccc] data-[state=active]:border-b-2 data-[state=active]:border-[#0e639c] rounded-none px-4 py-2 text-[#858585] gap-1"
                    >
                        <DollarSign className="h-4 w-4" />
                        Cost Planning
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="consultants" className="flex-1 mt-0">
                    {enabledDisciplines.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-[#3e3e42] rounded-lg">
                            <p className="text-sm text-[#858585] text-center px-4">
                                No consultant disciplines selected.
                                <br />
                                Enable disciplines in the Planning Card to create tabs here.
                            </p>
                        </div>
                    ) : (
                        <Tabs
                            value={activeDiscipline || enabledDisciplines[0].id}
                            onValueChange={(value) => setActiveDiscipline(value)}
                            className="h-full flex flex-col"
                        >
                            <TabsList className="w-full justify-start bg-[#1e1e1e] border-b border-[#3e3e42] rounded-none h-auto p-0 overflow-x-auto">
                                {enabledDisciplines.map(d => (
                                    <TabsTrigger
                                        key={d.id}
                                        value={d.id}
                                        className="data-[state=active]:bg-[#252526] data-[state=active]:text-[#cccccc] data-[state=active]:border-b-2 data-[state=active]:border-[#0e639c] rounded-none px-4 py-2 text-[#858585] whitespace-nowrap"
                                    >
                                        {d.disciplineName}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                            {enabledDisciplines.map(d => (
                                <TabsContent key={d.id} value={d.id} className="flex-1 mt-4 overflow-y-auto">
                                    <DisciplineRepoTiles
                                        projectId={projectId}
                                        disciplineId={d.id}
                                        contextName={d.disciplineName}
                                        selectedDocumentIds={selectedDocumentIds}
                                        onSetSelectedDocumentIds={onSetSelectedDocumentIds}
                                        generationMode={disciplineModes[d.id] || 'ai_assist'}
                                        onGenerationModeChange={(mode) => setDisciplineModes(prev => ({ ...prev, [d.id]: mode }))}
                                    />
                                    <ConsultantGallery
                                        projectId={projectId}
                                        discipline={d.disciplineName}
                                        disciplineId={d.id}
                                        briefServices={d.briefServices || ''}
                                        briefFee={d.briefFee || ''}
                                        briefProgram={d.briefProgram || ''}
                                        onUpdateBrief={updateBrief}
                                        generationMode={disciplineModes[d.id] || 'ai_assist'}
                                    />
                                </TabsContent>
                            ))}
                        </Tabs>
                    )}
                </TabsContent>

                <TabsContent value="contractors" className="flex-1 mt-0">
                    {enabledTrades.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-[#3e3e42] rounded-lg">
                            <p className="text-sm text-[#858585] text-center px-4">
                                No contractor trades selected.
                                <br />
                                Enable trades in the Planning Card to create tabs here.
                            </p>
                        </div>
                    ) : (
                        <Tabs
                            value={activeTrade || enabledTrades[0].id}
                            onValueChange={(value) => setActiveTrade(value)}
                            className="h-full flex flex-col"
                        >
                            <TabsList className="w-full justify-start bg-[#1e1e1e] border-b border-[#3e3e42] rounded-none h-auto p-0 overflow-x-auto">
                                {enabledTrades.map(t => (
                                    <TabsTrigger
                                        key={t.id}
                                        value={t.id}
                                        className="data-[state=active]:bg-[#252526] data-[state=active]:text-[#cccccc] data-[state=active]:border-b-2 data-[state=active]:border-[#0e639c] rounded-none px-4 py-2 text-[#858585] whitespace-nowrap"
                                    >
                                        {t.tradeName}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                            {enabledTrades.map(t => (
                                <TabsContent key={t.id} value={t.id} className="flex-1 mt-4 overflow-y-auto">
                                    <DisciplineRepoTiles
                                        projectId={projectId}
                                        tradeId={t.id}
                                        contextName={t.tradeName}
                                        selectedDocumentIds={selectedDocumentIds}
                                        onSetSelectedDocumentIds={onSetSelectedDocumentIds}
                                        generationMode={tradeModes[t.id] || 'ai_assist'}
                                        onGenerationModeChange={(mode) => setTradeModes(prev => ({ ...prev, [t.id]: mode }))}
                                    />
                                    <ContractorGallery
                                        projectId={projectId}
                                        trade={t.tradeName}
                                        tradeId={t.id}
                                        scopeWorks={t.scopeWorks || ''}
                                        scopePrice={t.scopePrice || ''}
                                        scopeProgram={t.scopeProgram || ''}
                                        onUpdateScope={updateScope}
                                        generationMode={tradeModes[t.id] || 'ai_assist'}
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
