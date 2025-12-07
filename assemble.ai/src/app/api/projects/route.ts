import { NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import {
    projects,
    consultantDisciplines,
    consultantStatuses,
    contractorTrades,
    contractorStatuses,
    projectStages,
    projectDetails,
    projectObjectives,
    costLines,
    variations,
    invoices,
} from '@/lib/db/schema';
import { CONSULTANT_DISCIPLINES, CONTRACTOR_TRADES, STATUS_TYPES } from '@/lib/constants/disciplines';
import { DEFAULT_COST_LINES, getTotalDefaultBudget } from '@/lib/constants/default-cost-lines';

export async function GET() {
    try {
        const projectsList = await db.select().from(projects);
        return NextResponse.json(projectsList);
    } catch (error) {
        console.error('Error fetching projects:', error);
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { name, code, status = 'active' } = await request.json();

        if (!name || name.trim() === '') {
            return NextResponse.json(
                { error: 'Project name is required' },
                { status: 400 }
            );
        }

        // Use transaction to ensure atomic initialization (FR-055)
        // Note: better-sqlite3 is synchronous, so we use sync transaction
        const result = db.transaction((tx) => {
            // 1. Create project
            const projectId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const newProject = {
                id: projectId,
                name: name.trim(),
                code: code?.trim(),
                status: status || 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            tx.insert(projects).values(newProject).run();

            // 2. Initialize consultant disciplines (36) with isEnabled: false (FR-051, FR-056)
            const disciplineRecords = CONSULTANT_DISCIPLINES.map((d) => ({
                id: crypto.randomUUID(),
                projectId,
                disciplineName: d.name,
                isEnabled: false,
                order: d.order,
            }));
            const createdDisciplines = tx.insert(consultantDisciplines).values(disciplineRecords).returning().all();

            // 3. Create status records for each discipline (144 total) (FR-058)
            const disciplineStatusRecords = createdDisciplines.flatMap((d) =>
                STATUS_TYPES.map((statusType) => ({
                    id: crypto.randomUUID(),
                    disciplineId: d.id,
                    statusType,
                    isActive: false,
                }))
            );
            tx.insert(consultantStatuses).values(disciplineStatusRecords).run();

            // 4. Initialize contractor trades (21) with isEnabled: false (FR-052, FR-057)
            const tradeRecords = CONTRACTOR_TRADES.map((t) => ({
                id: crypto.randomUUID(),
                projectId,
                tradeName: t.name,
                isEnabled: false,
                order: t.order,
            }));
            const createdTrades = tx.insert(contractorTrades).values(tradeRecords).returning().all();

            // 5. Create status records for each trade (84 total) (FR-058)
            const tradeStatusRecords = createdTrades.flatMap((t) =>
                STATUS_TYPES.map((statusType) => ({
                    id: crypto.randomUUID(),
                    tradeId: t.id,
                    statusType,
                    isActive: false,
                }))
            );
            tx.insert(contractorStatuses).values(tradeStatusRecords).run();

            // 6. Initialize 5 default project stages (FR-053)
            const stageRecords = [
                { name: 'Initiation', number: 1 },
                { name: 'Scheme Design', number: 2 },
                { name: 'Detail Design', number: 3 },
                { name: 'Procurement', number: 4 },
                { name: 'Delivery', number: 5 },
            ].map((s) => ({
                id: crypto.randomUUID(),
                projectId,
                stageNumber: s.number,
                stageName: s.name,
                status: 'not_started' as const,
            }));
            tx.insert(projectStages).values(stageRecords).run();

            // 7. Initialize empty ProjectDetails (FR-054)
            tx.insert(projectDetails).values({
                id: crypto.randomUUID(),
                projectId,
                projectName: name.trim(), // Use project name as default
                address: '', // Empty, user will fill in
            }).run();

            // 8. Initialize empty ProjectObjectives (FR-054)
            tx.insert(projectObjectives).values({
                id: crypto.randomUUID(),
                projectId,
            }).run();

            // 9. Initialize default cost lines (FR-009 - Default Financial Data)
            // Creates 20 pre-populated cost line entries across 4 sections
            const costLineRecords = DEFAULT_COST_LINES.map((template) => ({
                id: crypto.randomUUID(),
                projectId,
                companyId: null, // No company assigned initially
                section: template.section,
                costCode: template.costCode,
                description: template.description,
                reference: null,
                budgetCents: template.budgetCents,
                approvedContractCents: 0,
                sortOrder: template.sortOrder,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }));
            tx.insert(costLines).values(costLineRecords).run();

            // 10. Add sample variation (FR-009 - Demonstrates linking workflow)
            // Linked to 2.02 Architect
            const architectCostLineId = costLineRecords.find(cl => cl.costCode === '2.02')?.id;
            const sampleVariationId = crypto.randomUUID();
            if (architectCostLineId) {
                tx.insert(variations).values({
                    id: sampleVariationId,
                    projectId,
                    costLineId: architectCostLineId,
                    variationNumber: 'PV-001',
                    category: 'Principal',
                    description: 'Sample variation - delete if not needed',
                    status: 'Forecast',
                    amountForecastCents: 1000000, // $10,000
                    amountApprovedCents: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                }).run();
            }

            // 11. Add sample invoice (FR-009 - Demonstrates linking workflow)
            // Linked to 2.01 Project Manager
            const pmCostLineId = costLineRecords.find(cl => cl.costCode === '2.01')?.id;
            const sampleInvoiceId = crypto.randomUUID();
            if (pmCostLineId) {
                const currentDate = new Date();
                tx.insert(invoices).values({
                    id: sampleInvoiceId,
                    projectId,
                    costLineId: pmCostLineId,
                    companyId: null,
                    invoiceDate: currentDate.toISOString().split('T')[0],
                    invoiceNumber: 'INV-SAMPLE-001',
                    description: 'Sample invoice - delete if not needed',
                    amountCents: 100000, // $1,000
                    gstCents: 10000, // $100
                    periodYear: currentDate.getFullYear(),
                    periodMonth: currentDate.getMonth() + 1,
                    paidStatus: 'unpaid',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                }).run();
            }

            // Return project with initialization summary
            return {
                ...newProject,
                initialization: {
                    disciplines: disciplineRecords.length,
                    disciplineStatuses: disciplineStatusRecords.length,
                    trades: tradeRecords.length,
                    tradeStatuses: tradeStatusRecords.length,
                    stages: stageRecords.length,
                    costLines: costLineRecords.length,
                    totalBudgetCents: getTotalDefaultBudget(),
                    sampleVariation: !!architectCostLineId,
                    sampleInvoice: !!pmCostLineId,
                },
            };
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('Error creating project:', error);
        return NextResponse.json(
            { error: 'Failed to create project' },
            { status: 500 }
        );
    }
}
