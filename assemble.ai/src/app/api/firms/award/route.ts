import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
    consultants,
    contractors,
    companies,
    projectStakeholders,
} from '@/lib/db';
import { eq, and, ne, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface AwardFirmRequest {
    projectId: string;
    firmId: string;
    firmType: 'consultant' | 'contractor';
    stakeholderId: string;
    awarded: boolean;
}

interface AwardFirmResponse {
    success: boolean;
    firm?: {
        id: string;
        companyName: string;
        awarded: boolean;
        companyId: string | null;
    };
    companyId?: string | null;
    deawardedFirmIds?: string[];
    error?: string;
}

/**
 * POST /api/firms/award
 * Handle award-related state:
 * - De-award existing firms for the same discipline/trade.
 * - Find/create the awarded company in the master list.
 * - Update the firm's awarded status.
 * - Sync awarded firm contact details to the stakeholder record.
 *
 * Cost plan values are intentionally not updated here. They are pushed by the
 * explicit "Push Awarded Price to Cost Plan" workflow from Evaluation Price.
 */
export async function POST(request: NextRequest) {
    try {
        const body: AwardFirmRequest = await request.json();
        const { projectId, firmId, firmType, stakeholderId, awarded } = body;

        if (!projectId || !firmId || !firmType || !stakeholderId) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: projectId, firmId, firmType, stakeholderId' },
                { status: 400 }
            );
        }

        if (firmType !== 'consultant' && firmType !== 'contractor') {
            return NextResponse.json(
                { success: false, error: 'firmType must be "consultant" or "contractor"' },
                { status: 400 }
            );
        }

        const table = firmType === 'consultant' ? consultants : contractors;

        const [firm] = await db
            .select()
            .from(table)
            .where(eq(table.id, firmId));

        if (!firm) {
            return NextResponse.json(
                { success: false, error: `${firmType} not found` },
                { status: 404 }
            );
        }

        const disciplineName = firmType === 'consultant'
            ? (firm as typeof consultants.$inferSelect).discipline
            : (firm as typeof contractors.$inferSelect).trade;

        const deawardedFirmIds: string[] = [];
        let companyId = firm.companyId;

        if (awarded) {
            const existingAwarded = await db
                .select()
                .from(table)
                .where(
                    and(
                        eq(table.projectId, projectId),
                        eq(firmType === 'consultant'
                            ? (table as typeof consultants).discipline
                            : (table as typeof contractors).trade, disciplineName),
                        eq(table.awarded, true),
                        ne(table.id, firmId)
                    )
                );

            for (const oldFirm of existingAwarded) {
                await db
                    .update(table)
                    .set({ awarded: false, updatedAt: new Date() })
                    .where(eq(table.id, oldFirm.id));
                deawardedFirmIds.push(oldFirm.id);
            }

            if (!companyId) {
                const normalizedName = firm.companyName.trim().toLowerCase();

                const existingCompanies = await db
                    .select()
                    .from(companies)
                    .where(isNull(companies.deletedAt));

                const match = existingCompanies.find(
                    (c) => c.name.toLowerCase() === normalizedName
                );

                if (match) {
                    companyId = match.id;
                } else {
                    const newCompanyId = uuidv4();
                    const now = new Date();

                    await db.insert(companies).values({
                        id: newCompanyId,
                        name: firm.companyName.trim(),
                        abn: firm.abn || null,
                        contactName: firm.contactPerson || null,
                        contactEmail: firm.email || null,
                        contactPhone: firm.phone || null,
                        address: firm.address || null,
                        createdAt: now,
                        updatedAt: now,
                    });

                    companyId = newCompanyId;
                }
            }

            const contactPhone = firmType === 'consultant'
                ? ((firm as typeof consultants.$inferSelect).mobile || firm.phone || null)
                : (firm.phone || null);

            await db
                .update(projectStakeholders)
                .set({
                    organization: firm.companyName.trim(),
                    contactName: firm.contactPerson || null,
                    contactEmail: firm.email || null,
                    contactPhone,
                    companyId: companyId || null,
                    updatedAt: new Date(),
                })
                .where(eq(projectStakeholders.id, stakeholderId));
        }

        await db
            .update(table)
            .set({
                awarded,
                companyId: awarded ? companyId : firm.companyId,
                updatedAt: new Date(),
            })
            .where(eq(table.id, firmId));

        const [updatedFirm] = await db
            .select()
            .from(table)
            .where(eq(table.id, firmId));

        const response: AwardFirmResponse = {
            success: true,
            firm: {
                id: updatedFirm.id,
                companyName: updatedFirm.companyName,
                awarded: updatedFirm.awarded ?? false,
                companyId: updatedFirm.companyId,
            },
            companyId: awarded ? companyId : firm.companyId,
            deawardedFirmIds: deawardedFirmIds.length > 0 ? deawardedFirmIds : undefined,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in award firm:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update award status' },
            { status: 500 }
        );
    }
}
