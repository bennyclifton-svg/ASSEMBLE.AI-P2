import { NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import {
    projects,
    consultantDisciplines,
    consultantStatuses,
    contractorTrades,
    contractorStatuses,
    projectDetails,
    projectObjectives,
    costLines,
    programActivities,
} from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { ProjectTypeId, projectTypes } from '@/lib/data/templates/project-types';
import { objectivesTemplates } from '@/lib/data/templates/objectives-templates';
import { costPlanTemplates } from '@/lib/data/templates/cost-plan-templates';
import { programTemplates } from '@/lib/data/templates/program-templates';
import { requireProjectCreationAllowedForWorkspace } from '@/lib/subscription/project-creation-gate';

const STATUS_TYPES = ['brief', 'tender', 'rec', 'award'] as const;

export async function POST(request: Request) {
    try {
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const projectGate = await requireProjectCreationAllowedForWorkspace({
            userId: authResult.user.id,
            organizationId: authResult.user.organizationId,
        });
        if (!projectGate.allowed) return projectGate.response;

        const body = await request.json();
        const { projectType, projectName, address } = body;
        const timestamp = new Date();

        if (!projectType || !projectName) {
            return NextResponse.json(
                { error: 'Project type and name are required' },
                { status: 400 }
            );
        }

        if (!['house', 'apartments', 'fitout', 'industrial', 'remediation'].includes(projectType)) {
            return NextResponse.json({ error: 'Invalid project type' }, { status: 400 });
        }

        const typeConfig = projectTypes[projectType as ProjectTypeId];
        const objectivesTemplate = objectivesTemplates[projectType as ProjectTypeId];
        const costTemplate = costPlanTemplates[projectType as ProjectTypeId];
        const programTemplate = programTemplates[projectType as ProjectTypeId];

        const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 1. Create project
        await db.insert(projects).values({
            id: projectId,
            name: projectName,
            code: projectName.substring(0, 10).toUpperCase().replace(/\s/g, ''),
            status: 'active',
            organizationId: authResult.user.organizationId,
            projectType: projectType,
            currencyCode: 'AUD',
            showGst: false,
            createdAt: timestamp,
            updatedAt: timestamp,
        });

        // 2. Create project details
        await db.insert(projectDetails).values({
            id: `pd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            projectId,
            projectName,
            address: address || '',
            updatedAt: timestamp,
        });

        // 3. Create project objectives in the row-model table.
        const objectiveRows = [
            {
                id: `po_${Date.now()}_functional_${Math.random().toString(36).substr(2, 9)}`,
                projectId,
                objectiveType: 'functional' as const,
                source: 'manual' as const,
                text: objectivesTemplate.functional,
                category: 'functional',
                sortOrder: 0,
                updatedAt: new Date(),
            },
            {
                id: `po_${Date.now()}_quality_${Math.random().toString(36).substr(2, 9)}`,
                projectId,
                objectiveType: 'quality' as const,
                source: 'manual' as const,
                text: objectivesTemplate.quality,
                category: 'quality',
                sortOrder: 0,
                updatedAt: new Date(),
            },
            {
                id: `po_${Date.now()}_budget_${Math.random().toString(36).substr(2, 9)}`,
                projectId,
                objectiveType: 'planning' as const,
                source: 'manual' as const,
                text: objectivesTemplate.budget,
                category: 'cost',
                sortOrder: 0,
                updatedAt: new Date(),
            },
            {
                id: `po_${Date.now()}_program_${Math.random().toString(36).substr(2, 9)}`,
                projectId,
                objectiveType: 'planning' as const,
                source: 'manual' as const,
                text: objectivesTemplate.program,
                category: 'programme',
                sortOrder: 1,
                updatedAt: new Date(),
            },
        ];
        await db.insert(projectObjectives).values(objectiveRows);

        // 4. Create consultant disciplines (sorted alphabetically)
        const sortedDisciplines = [...typeConfig.disciplines].sort((a, b) => a.localeCompare(b));
        for (let i = 0; i < sortedDisciplines.length; i++) {
            const disciplineId = `cd_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;

            await db.insert(consultantDisciplines).values({
                id: disciplineId,
                projectId,
                disciplineName: sortedDisciplines[i],
                isEnabled: false,
                order: i,
                updatedAt: timestamp,
            });

            // Create statuses for this discipline
            for (const statusType of STATUS_TYPES) {
                await db.insert(consultantStatuses).values({
                    id: `cs_${Date.now()}_${i}_${statusType}_${Math.random().toString(36).substr(2, 9)}`,
                    disciplineId,
                    statusType,
                    isActive: false,
                    updatedAt: timestamp,
                });
            }
        }

        // 5. Create contractor trades (sorted alphabetically)
        const sortedTrades = [...typeConfig.trades].sort((a, b) => a.localeCompare(b));
        for (let i = 0; i < sortedTrades.length; i++) {
            const tradeId = `ct_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;

            await db.insert(contractorTrades).values({
                id: tradeId,
                projectId,
                tradeName: sortedTrades[i],
                isEnabled: false,
                order: i,
                updatedAt: timestamp,
            });

            // Create statuses for this trade
            for (const statusType of STATUS_TYPES) {
                await db.insert(contractorStatuses).values({
                    id: `cts_${Date.now()}_${i}_${statusType}_${Math.random().toString(36).substr(2, 9)}`,
                    tradeId,
                    statusType,
                    isActive: false,
                    updatedAt: timestamp,
                });
            }
        }

        // 6. Create cost lines
        // Map template categories to schema sections
        const categoryToSection = (category: string): 'FEES' | 'CONSULTANTS' | 'CONSTRUCTION' | 'CONTINGENCY' => {
            const lowerCategory = category.toLowerCase();
            if (lowerCategory.includes('fee') || lowerCategory.includes('authority') || lowerCategory.includes('marketing')) return 'FEES';
            if (lowerCategory.includes('consultant')) return 'CONSULTANTS';
            if (lowerCategory.includes('contingency')) return 'CONTINGENCY';
            return 'CONSTRUCTION';
        };

        for (let i = 0; i < costTemplate.length; i++) {
            const line = costTemplate[i];
            await db.insert(costLines).values({
                id: `cl_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
                projectId,
                section: categoryToSection(line.category),
                activity: line.description,
                reference: line.notes || null,
                budgetCents: 0,
                approvedContractCents: 0,
                sortOrder: i,
                createdAt: timestamp,
                updatedAt: timestamp,
            });
        }

        // 7. Create program activities
        // Color palette for activities
        const colors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6'];
        const today = new Date();
        let currentStartDate = new Date(today);

        for (let i = 0; i < programTemplate.length; i++) {
            const activity = programTemplate[i];
            const startDate = new Date(currentStartDate);
            const endDate = new Date(currentStartDate);
            endDate.setDate(endDate.getDate() + (activity.durationWeeks * 7));

            await db.insert(programActivities).values({
                id: `pa_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
                projectId,
                parentId: null,
                name: activity.name,
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                collapsed: false,
                color: colors[i % colors.length],
                sortOrder: i,
                createdAt: timestamp,
                updatedAt: timestamp,
            });

            currentStartDate = new Date(endDate);
            currentStartDate.setDate(currentStartDate.getDate() + 1);
        }

        return NextResponse.json({
            success: true,
            projectId,
            message: `${typeConfig.name} project created successfully with ${typeConfig.disciplines.length} disciplines, ${typeConfig.trades.length} trades, ${costTemplate.length} cost lines, and ${programTemplate.length} program activities`,
        });
    } catch (error) {
        console.error('Error creating project from template:', error);
        return NextResponse.json(
            { error: 'Failed to create project from template' },
            { status: 500 }
        );
    }
}
