/**
 * RFTNewShortTab Component
 * Renders the SHORT tab content for RFT NEW reports
 * Includes: Project Info, Objectives, Staging, Risk, Brief, Fee, and Transmittal sections
 */

'use client';

import { useEffect, useState } from 'react';
import { type RftNew } from '@/lib/hooks/use-rft-new';
import { RFTNewTransmittalSchedule } from './RFTNewTransmittalSchedule';
import { Textarea } from '@/components/ui/textarea';

interface ProjectDetails {
    projectName: string;
    address: string;
}

interface PlanningObjectives {
    functional?: string;
    quality?: string;
    budget?: string;
    program?: string;
}

interface CostLine {
    id: string;
    activity: string;
    quantity?: number | null;
    unit?: string | null;
    rate?: number | null;
    amount?: number | null;
}

interface ProjectStage {
    id: string;
    stageNumber: number;
    stageName: string;
    startDate: string | null;
    endDate: string | null;
    status: string;
}

interface ProjectRisk {
    id: string;
    title: string;
    description: string | null;
    likelihood: 'low' | 'medium' | 'high' | null;
    impact: 'low' | 'medium' | 'high' | null;
    mitigation: string | null;
    status: string;
}

interface RFTNewShortTabProps {
    projectId: string;
    rftNew: RftNew;
    contextName: string;
    contextType: 'discipline' | 'trade';
    disciplineId?: string | null;
    tradeId?: string | null;
}

export function RFTNewShortTab({
    projectId,
    rftNew,
    contextName,
    contextType,
    disciplineId,
    tradeId,
}: RFTNewShortTabProps) {
    const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
    const [objectives, setObjectives] = useState<PlanningObjectives>({});
    const [stages, setStages] = useState<ProjectStage[]>([]);
    const [risks, setRisks] = useState<ProjectRisk[]>([]);
    const [briefData, setBriefData] = useState({ service: '', deliverables: '' });
    const [isSavingBrief, setIsSavingBrief] = useState(false);
    const [costLines, setCostLines] = useState<CostLine[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch all data when component mounts
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch all planning data from consolidated endpoint
                const planningRes = await fetch(`/api/planning/${projectId}`);
                if (planningRes.ok) {
                    const data = await planningRes.json();

                    // Set Details
                    if (data.details) {
                        setProjectDetails({
                            projectName: data.details.projectName || 'Untitled Project',
                            address: data.details.address || '',
                        });
                    } else {
                        // Fallback if details are missing but we need to show something (or rely on initial null)
                        setProjectDetails({
                            projectName: 'Untitled Project',
                            address: '',
                        });
                    }

                    // Set Objectives
                    if (data.objectives) {
                        setObjectives({
                            functional: data.objectives.functional || '',
                            quality: data.objectives.quality || '',
                            budget: data.objectives.budget || '',
                            program: data.objectives.program || '',
                        });
                    }

                    // Set Stages
                    if (Array.isArray(data.stages)) {
                        setStages(data.stages.sort((a: ProjectStage, b: ProjectStage) => a.stageNumber - b.stageNumber));
                    }

                    // Set Risks
                    if (Array.isArray(data.risks)) {
                        setRisks(data.risks);
                    }
                }

                // Fetch cost lines filtered by discipline/trade
                let costUrl = `/api/projects/${projectId}/cost-lines`;
                if (disciplineId) {
                    costUrl += `?disciplineId=${disciplineId}`;

                    // Fetch Consultant Brief info
                    const discRes = await fetch(`/api/planning/${projectId}/consultants/${disciplineId}`);
                    if (discRes.ok) {
                        const discData = await discRes.json();
                        setBriefData({
                            service: discData.briefServices || '',
                            deliverables: discData.briefDeliverables || '',
                        });
                    }
                } else if (tradeId) {
                    costUrl += `?tradeId=${tradeId}`;

                    // Fetch Contractor Scope info
                    const tradeRes = await fetch(`/api/planning/${projectId}/contractors/${tradeId}`);
                    if (tradeRes.ok) {
                        const tradeData = await tradeRes.json();
                        setBriefData({
                            service: tradeData.scopeWorks || '',
                            deliverables: tradeData.scopeDeliverables || '',
                        });
                    }
                }

                const costRes = await fetch(costUrl);
                if (costRes.ok) {
                    const costData = await costRes.json();
                    setCostLines(costData || []);
                } else {
                    setCostLines([]);
                }
            } catch (error) {
                console.error('Error fetching RFT NEW data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [projectId, disciplineId, tradeId]);

    if (isLoading) {
        return (
            <div className="p-8 text-center text-[#858585]">
                <p>Loading RFT NEW data...</p>
            </div>
        );
    }

    const rftLabel = `RFT NEW ${contextName}`;

    const handleBriefChange = (field: 'service' | 'deliverables', value: string) => {
        setBriefData(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveBrief = async (field: 'service' | 'deliverables') => {
        setIsSavingBrief(true);
        try {
            const payload: any = {};
            if (disciplineId) {
                if (field === 'service') payload.briefServices = briefData.service;
                if (field === 'deliverables') payload.briefDeliverables = briefData.deliverables;
                await fetch(`/api/planning/${projectId}/consultants/${disciplineId}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
            } else if (tradeId) {
                if (field === 'service') payload.scopeWorks = briefData.service;
                if (field === 'deliverables') payload.scopeDeliverables = briefData.deliverables;
                await fetch(`/api/planning/${projectId}/contractors/${tradeId}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
            }
        } catch (error) {
            console.error('Failed to save brief', error);
        } finally {
            setIsSavingBrief(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* 1. Project Information Table */}
            <div className="border border-[#3e3e42] rounded overflow-hidden">
                <table className="w-full text-sm">
                    <tbody>
                        <tr className="border-b border-[#3e3e42]">
                            <td className="w-36 px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium">
                                Project Name
                            </td>
                            <td className="px-4 py-2.5 text-[#cccccc]">
                                {projectDetails?.projectName || 'Loading...'}
                            </td>
                        </tr>
                        <tr className="border-b border-[#3e3e42]">
                            <td className="px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium">
                                Address
                            </td>
                            <td className="px-4 py-2.5 text-[#cccccc]">
                                {projectDetails?.address || '-'}
                            </td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium">
                                Document
                            </td>
                            <td className="px-4 py-2.5 text-[#cccccc] font-semibold">
                                {rftLabel}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* 2. Objectives Section */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[#cccccc] uppercase tracking-wide">
                    Objectives
                </h3>
                <div className="border border-[#3e3e42] rounded overflow-hidden">
                    <table className="w-full text-sm">
                        <tbody>
                            <tr className="border-b border-[#3e3e42]">
                                <td className="w-36 px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium">
                                    Functional
                                </td>
                                <td className="px-4 py-2.5 text-[#cccccc] whitespace-pre-wrap">
                                    {objectives.functional || '-'}
                                </td>
                            </tr>
                            <tr className="border-b border-[#3e3e42]">
                                <td className="px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium">
                                    Quality
                                </td>
                                <td className="px-4 py-2.5 text-[#cccccc] whitespace-pre-wrap">
                                    {objectives.quality || '-'}
                                </td>
                            </tr>
                            <tr className="border-b border-[#3e3e42]">
                                <td className="px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium">
                                    Budget
                                </td>
                                <td className="px-4 py-2.5 text-[#cccccc] whitespace-pre-wrap">
                                    {objectives.budget || '-'}
                                </td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium">
                                    Program
                                </td>
                                <td className="px-4 py-2.5 text-[#cccccc] whitespace-pre-wrap">
                                    {objectives.program || '-'}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 3. Staging Section */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[#cccccc] uppercase tracking-wide">
                    Staging
                </h3>
                <div className="border border-[#3e3e42] rounded overflow-hidden">
                    {stages.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead className="bg-[#2d2d30]">
                                <tr className="border-b border-[#3e3e42]">
                                    <th className="px-4 py-2.5 text-left text-[#858585] font-medium w-1/3">Stage</th>
                                    <th className="px-4 py-2.5 text-left text-[#858585] font-medium w-1/3">Start Date</th>
                                    <th className="px-4 py-2.5 text-left text-[#858585] font-medium w-1/3">End Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stages.map((stage) => (
                                    <tr key={stage.id} className="border-b border-[#3e3e42] last:border-0">
                                        <td className="px-4 py-2.5 text-[#cccccc]">{stage.stageName}</td>
                                        <td className="px-4 py-2.5 text-[#cccccc]">{stage.startDate || '-'}</td>
                                        <td className="px-4 py-2.5 text-[#cccccc]">{stage.endDate || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="px-4 py-3 text-[#858585] text-sm">
                            No staging information available.
                        </div>
                    )}
                </div>
            </div>

            {/* 4. Risk Section */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[#cccccc] uppercase tracking-wide">
                    Risk
                </h3>
                <div className="border border-[#3e3e42] rounded overflow-hidden">
                    {risks.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead className="bg-[#2d2d30]">
                                <tr className="border-b border-[#3e3e42]">
                                    <th className="px-4 py-2.5 text-left text-[#858585] font-medium w-1/4">Risk</th>
                                    <th className="px-4 py-2.5 text-left text-[#858585] font-medium w-1/4">Rating</th>
                                    <th className="px-4 py-2.5 text-left text-[#858585] font-medium w-1/2">Mitigation</th>
                                </tr>
                            </thead>
                            <tbody>
                                {risks.map((risk) => (
                                    <tr key={risk.id} className="border-b border-[#3e3e42] last:border-0">
                                        <td className="px-4 py-2.5 text-[#cccccc] font-medium">{risk.title}</td>
                                        <td className="px-4 py-2.5 text-[#cccccc]">
                                            <div className="flex flex-col text-xs">
                                                <span>L: {risk.likelihood || '-'}</span>
                                                <span>I: {risk.impact || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-[#cccccc] whitespace-pre-wrap">{risk.mitigation || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="px-4 py-3 text-[#858585] text-sm">
                            No risk information available.
                        </div>
                    )}
                </div>
            </div>

            {/* 5. Brief Section */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#cccccc] uppercase tracking-wide">
                        Brief
                    </h3>
                    {isSavingBrief && <span className="text-xs text-[#4fc1ff]">Saving...</span>}
                </div>
                <div className="border border-[#3e3e42] rounded overflow-hidden">
                    <table className="w-full text-sm">
                        <tbody>
                            <tr className="border-b border-[#3e3e42]">
                                <td className="w-36 px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium align-top pt-4">
                                    Service
                                </td>
                                <td className="p-0">
                                    <Textarea
                                        value={briefData.service}
                                        onChange={(e) => handleBriefChange('service', e.target.value)}
                                        onBlur={() => handleSaveBrief('service')}
                                        placeholder="Enter service details..."
                                        className="w-full border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-[#cccccc] resize-y min-h-[80px] p-4"
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2.5 bg-[#2d2d30] text-[#858585] font-medium align-top pt-4">
                                    Deliverables
                                </td>
                                <td className="p-0">
                                    <Textarea
                                        value={briefData.deliverables}
                                        onChange={(e) => handleBriefChange('deliverables', e.target.value)}
                                        onBlur={() => handleSaveBrief('deliverables')}
                                        placeholder="Enter deliverables..."
                                        className="w-full border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-[#cccccc] resize-y min-h-[80px] p-4"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 6. Fee Section */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[#cccccc] uppercase tracking-wide">
                    Fee
                </h3>
                <div className="border border-[#3e3e42] rounded overflow-hidden">
                    {costLines.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead className="bg-[#2d2d30]">
                                <tr className="border-b border-[#3e3e42]">
                                    <th className="px-4 py-2.5 text-left text-[#858585] font-medium w-[70%]">Description</th>
                                    <th className="px-4 py-2.5 text-left text-[#858585] font-medium w-[30%]">Amount (Excl. GST)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Existing Cost Lines */}
                                {costLines.map((line) => (
                                    <tr key={line.id} className="border-b border-[#3e3e42]">
                                        <td className="px-4 py-2.5 text-[#cccccc]">{line.activity}</td>
                                        <td className="px-4 py-2.5 text-[#cccccc]">
                                            {/* Amount left empty for consultant to nominate */}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="px-4 py-3 text-[#858585] text-sm">
                            No cost plan items for this {contextType}
                        </div>
                    )}
                </div>
            </div>

            {/* 7. Transmittal Section */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[#cccccc] uppercase tracking-wide">
                    Transmittal
                </h3>
                <RFTNewTransmittalSchedule rftNewId={rftNew.id} />
            </div>
        </div>
    );
}
