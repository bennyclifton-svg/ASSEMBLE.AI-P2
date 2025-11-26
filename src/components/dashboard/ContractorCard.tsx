'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ContractorTrade {
  id: string;
  tradeName: string;
  isEnabled: boolean;
  order: number;
  statuses: {
    brief: boolean;
    tender: boolean;
    rec: boolean;
    award: boolean;
  };
}

interface ContractorCardProps {
  projectId: string;
}

export function ContractorCard({ projectId }: ContractorCardProps) {
  const [contractors, setContractors] = useState<ContractorTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchContractors();
  }, [projectId]);

  const fetchContractors = async () => {
    try {
      const response = await fetch(`/api/planning/${projectId}/contractors`);
      const data = await response.json();
      setContractors(data);
    } catch (error) {
      console.error('Error fetching contractors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#252526]">
        <div className="text-[#cccccc]">Loading contractors...</div>
      </div>
    );
  }

  const enabledContractors = contractors.filter(c => c.isEnabled);

  if (enabledContractors.length === 0) {
    return (
      <div className="h-full p-6 bg-[#252526]">
        <h2 className="text-2xl font-bold mb-4 text-[#cccccc]">Contractors</h2>
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-[#3e3e42] rounded-lg">
          <p className="text-sm text-[#858585] text-center px-4">
            No contractor trades selected.
            <br />
            Enable trades in the Planning Card to create tabs here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#252526] flex flex-col">
      <div className="p-6 pb-0">
        <h2 className="text-2xl font-bold mb-4 text-[#cccccc]">Contractors</h2>
      </div>

      <Tabs defaultValue={enabledContractors[0].id} className="flex-1 flex flex-col px-6">
        <TabsList className="w-full justify-start bg-[#1e1e1e] border-b border-[#3e3e42] rounded-none h-auto p-0">
          {enabledContractors.map((contractor) => (
            <TabsTrigger
              key={contractor.id}
              value={contractor.id}
              className="data-[state=active]:bg-[#252526] data-[state=active]:text-[#cccccc] data-[state=active]:border-b-2 data-[state=active]:border-[#0e639c] rounded-none px-4 py-2 text-[#858585]"
            >
              {contractor.tradeName}
            </TabsTrigger>
          ))}
        </TabsList>

        {enabledContractors.map((contractor) => (
          <TabsContent key={contractor.id} value={contractor.id} className="flex-1 mt-4">
            <div className="p-4 bg-[#1e1e1e] rounded border border-[#3e3e42]">
              <h3 className="text-lg font-semibold text-[#cccccc] mb-4">
                {contractor.tradeName}
              </h3>
              <p className="text-sm text-[#858585]">
                Contractor management interface for {contractor.tradeName} will be implemented here.
              </p>
              {/* TODO: Add contractor form and list here */}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
