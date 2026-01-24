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
    organizations,
} from '@/lib/db';
import { CONSULTANT_DISCIPLINES, CONTRACTOR_TRADES, STATUS_TYPES } from '@/lib/constants/disciplines';
import { DEFAULT_COST_LINES, getTotalDefaultBudget } from '@/lib/constants/default-cost-lines';
import { getCurrentUser, AuthError } from '@/lib/auth/get-user';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
    try {
        // Get authenticated user
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        // Filter projects by user's organization
        const projectsList = authResult.user.organizationId
            ? await db
                .select()
                .from(projects)
                .where(eq(projects.organizationId, authResult.user.organizationId))
                .orderBy(desc(projects.updatedAt))
            : [];

        return NextResponse.json(projectsList);
    } catch (error) {
        console.error('Error fetching projects:', error);
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        console.log('POST /api/projects - Starting...');

        // Get authenticated user
        const authResult = await getCurrentUser();
        console.log('Auth result:', {
            hasUser: !!authResult.user,
            userId: authResult.user?.id,
            organizationId: authResult.user?.organizationId,
            error: authResult.error
        });

        if (!authResult.user) {
            console.log('No authenticated user, returning error:', authResult.error);
            return NextResponse.json({
                error: authResult.error?.message || 'Authentication required',
                code: authResult.error?.code || 'UNAUTHORIZED'
            }, { status: authResult.status });
        }

        if (!authResult.user.organizationId) {
            console.log('User has no organization');
            return NextResponse.json(
                { error: 'User has no organization', code: 'NO_ORGANIZATION' },
                { status: 400 }
            );
        }

        const { name, code, status = 'active' } = await request.json();
        console.log('Request data:', { name, code, status });

        if (!name || name.trim() === '') {
            return NextResponse.json(
                { error: 'Project name is required' },
                { status: 400 }
            );
        }

        const organizationId = authResult.user.organizationId;

        // Get organization default settings
        console.log('Fetching organization:', organizationId);
        const [org] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.id, organizationId))
            .limit(1);
        console.log('Organization found:', !!org);

        let defaultSettings = {};
        if (org && org.defaultSettings) {
            try {
                defaultSettings = JSON.parse(org.defaultSettings);
                console.log('Parsed default settings:', defaultSettings);
            } catch (e) {
                console.error('Failed to parse defaultSettings:', e);
                defaultSettings = {};
            }
        }

        // Use transaction to ensure atomic initialization (FR-055)
        console.log('Starting transaction...');
        const result = await db.transaction(async (tx) => {
            // 1. Create project with organizationId
            const projectId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            console.log('Generated project ID:', projectId);
            const newProject = {
                id: projectId,
                name: name.trim(),
                code: code?.trim(),
                status: status || 'active',
                organizationId,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            console.log('Inserting project...');
            await tx.insert(projects).values(newProject);
            console.log('Project inserted successfully');

            // 2. Initialize consultant disciplines (37) with org defaults (FR-051, FR-056)
            console.log('Creating consultant disciplines...');
            const enabledDisciplines: string[] = defaultSettings.enabledDisciplines || [];
            const disciplineRecords = CONSULTANT_DISCIPLINES.map((d) => ({
                id: crypto.randomUUID(),
                projectId,
                disciplineName: d.name,
                isEnabled: enabledDisciplines.includes(d.name),
                order: d.order,
            }));
            const createdDisciplines = await tx.insert(consultantDisciplines).values(disciplineRecords).returning();
            console.log(`Created ${createdDisciplines.length} disciplines`);

            // 3. Create status records for each discipline (144 total) (FR-058)
            const disciplineStatusRecords = createdDisciplines.flatMap((d) =>
                STATUS_TYPES.map((statusType) => ({
                    id: crypto.randomUUID(),
                    disciplineId: d.id,
                    statusType,
                    isActive: false,
                }))
            );
            await tx.insert(consultantStatuses).values(disciplineStatusRecords);

            // 4. Initialize contractor trades (21) with org defaults (FR-052, FR-057)
            const enabledTrades: string[] = defaultSettings.enabledTrades || [];
            const tradeRecords = CONTRACTOR_TRADES.map((t) => ({
                id: crypto.randomUUID(),
                projectId,
                tradeName: t.name,
                isEnabled: enabledTrades.includes(t.name),
                order: t.order,
            }));
            const createdTrades = await tx.insert(contractorTrades).values(tradeRecords).returning();

            // 5. Create status records for each trade (84 total) (FR-058)
            const tradeStatusRecords = createdTrades.flatMap((t) =>
                STATUS_TYPES.map((statusType) => ({
                    id: crypto.randomUUID(),
                    tradeId: t.id,
                    statusType,
                    isActive: false,
                }))
            );
            await tx.insert(contractorStatuses).values(tradeStatusRecords);

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
            await tx.insert(projectStages).values(stageRecords);

            // 7. Initialize empty ProjectDetails (FR-054)
            await tx.insert(projectDetails).values({
                id: crypto.randomUUID(),
                projectId,
                projectName: name.trim(), // Use project name as default
                address: '', // Empty, user will fill in
            });

            // 8. Initialize empty ProjectObjectives (FR-054)
            await tx.insert(projectObjectives).values({
                id: crypto.randomUUID(),
                projectId,
            });

            // 9. Initialize default cost lines (FR-009 - Default Financial Data)
            // Creates pre-populated cost line entries across 4 sections (if any default lines exist)
            console.log('Creating cost lines...');
            const costLineRecords = DEFAULT_COST_LINES.map((template) => ({
                id: crypto.randomUUID(),
                projectId,
                disciplineId: null, // Not linked to specific discipline at initialization
                tradeId: null, // Not linked to specific trade at initialization
                section: template.section,
                costCode: template.costCode,
                activity: template.description,
                reference: null,
                budgetCents: template.budgetCents,
                approvedContractCents: 0,
                sortOrder: template.sortOrder,
                // Note: masterStage column exists in schema but not in actual DB yet
            }));
            // Only insert if there are cost lines to insert
            if (costLineRecords.length > 0) {
                await tx.insert(costLines).values(costLineRecords);
            }
            console.log(`Created ${costLineRecords.length} cost lines`);

            // 10. Add sample variation (FR-009 - Demonstrates linking workflow)
            // Linked to 2.02 Architect
            const architectCostLineId = costLineRecords.find(cl => cl.costCode === '2.02')?.id;
            if (architectCostLineId) {
                await tx.insert(variations).values({
                    id: crypto.randomUUID(),
                    projectId,
                    costLineId: architectCostLineId,
                    variationNumber: 'PV-001',
                    category: 'Principal',
                    description: 'Sample variation - delete if not needed',
                    status: 'Forecast',
                    amountForecastCents: 1000000, // $10,000
                    amountApprovedCents: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            }

            // 11. Add sample invoice (FR-009 - Demonstrates linking workflow)
            // Linked to 2.01 Project Manager
            const pmCostLineId = costLineRecords.find(cl => cl.costCode === '2.01')?.id;
            if (pmCostLineId) {
                const currentDate = new Date();
                await tx.insert(invoices).values({
                    id: crypto.randomUUID(),
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
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
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

        console.log('Project created successfully:', result.id);
        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('=== ERROR CREATING PROJECT ===');
        console.error('Error type:', error?.constructor?.name);
        console.error('Error message:', error instanceof Error ? error.message : String(error));
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('Full error object:', error);
        console.error('==============================');

        return NextResponse.json(
            {
                error: 'Failed to create project',
                details: error instanceof Error ? error.message : String(error),
                errorType: error?.constructor?.name || 'Unknown'
            },
            { status: 500 }
        );
    }
}
