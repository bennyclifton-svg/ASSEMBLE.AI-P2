'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useConsultantDisciplines } from '@/lib/hooks/use-consultant-disciplines';
import { useContractorTrades } from '@/lib/hooks/use-contractor-trades';
import { ConsultantGallery } from '@/components/consultants/ConsultantGallery';
import { ContractorGallery } from '@/components/contractors/ContractorGallery';

interface ConsultantCardProps {
    projectId: string;
}

export function ConsultantCard({ projectId }: ConsultantCardProps) {
    const { disciplines, isLoading: isLoadingConsultants } = useConsultantDisciplines(projectId);
    const { trades, isLoading: isLoadingContractors } = useContractorTrades(projectId);

    const enabledDisciplines = disciplines.filter(d => d.isEnabled);
    const enabledTrades = trades.filter(t => t.isEnabled);

    if (isLoadingConsultants || isLoadingContractors) {
        return (
            <div className="h-full flex items-center justify-center bg-[#252526]">
                <div className="text-[#cccccc]">Loading...</div>
            </div>
        );
    }

    return (
        <div className="h-full bg-[#252526] flex flex-col">
            <div className="p-6 pb-0">
                <h2 className="text-2xl font-bold mb-4 text-[#cccccc]">Consultants & Contractors</h2>
            </div>

            <Tabs defaultValue="consultants" className="flex-1 flex flex-col px-6">
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
                        <Tabs defaultValue={enabledDisciplines[0].id} className="h-full flex flex-col">
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
                                <TabsContent key={d.id} value={d.id} className="flex-1 mt-4">
                                    <ConsultantGallery projectId={projectId} discipline={d.disciplineName} />
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
                        <Tabs defaultValue={enabledTrades[0].id} className="h-full flex flex-col">
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
                                <TabsContent key={t.id} value={t.id} className="flex-1 mt-4">
                                    <ContractorGallery projectId={projectId} trade={t.tradeName} />
                                </TabsContent>
                            ))}
                        </Tabs>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
