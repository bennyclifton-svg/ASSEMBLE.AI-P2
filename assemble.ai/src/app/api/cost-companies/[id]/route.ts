import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { companies } from '@/lib/db';
import { eq, isNull, and } from 'drizzle-orm';
import type { UpdateCompanyInput } from '@/types/cost-plan';

/**
 * GET /api/cost-companies/[id]
 * Get a single company
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const [company] = await db
            .select()
            .from(companies)
            .where(
                and(
                    eq(companies.id, id),
                    isNull(companies.deletedAt)
                )
            );

        if (!company) {
            return NextResponse.json(
                { error: 'Company not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(company);
    } catch (error) {
        console.error('Error fetching company:', error);
        return NextResponse.json(
            { error: 'Failed to fetch company' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/cost-companies/[id]
 * Update a company
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body: UpdateCompanyInput = await request.json();

        const [existing] = await db
            .select()
            .from(companies)
            .where(
                and(
                    eq(companies.id, id),
                    isNull(companies.deletedAt)
                )
            );

        if (!existing) {
            return NextResponse.json(
                { error: 'Company not found' },
                { status: 404 }
            );
        }

        const now = new Date();

        const updateData: Record<string, unknown> = {
            updatedAt: now,
        };

        if (body.name !== undefined) updateData.name = body.name;
        if (body.abn !== undefined) updateData.abn = body.abn;
        if (body.contactName !== undefined) updateData.contactName = body.contactName;
        if (body.contactEmail !== undefined) updateData.contactEmail = body.contactEmail;
        if (body.contactPhone !== undefined) updateData.contactPhone = body.contactPhone;
        if (body.address !== undefined) updateData.address = body.address;

        await db
            .update(companies)
            .set(updateData)
            .where(eq(companies.id, id));

        const [updated] = await db
            .select()
            .from(companies)
            .where(eq(companies.id, id));

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating company:', error);
        return NextResponse.json(
            { error: 'Failed to update company' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/cost-companies/[id]
 * Soft delete a company
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const [existing] = await db
            .select()
            .from(companies)
            .where(
                and(
                    eq(companies.id, id),
                    isNull(companies.deletedAt)
                )
            );

        if (!existing) {
            return NextResponse.json(
                { error: 'Company not found' },
                { status: 404 }
            );
        }

        const now = new Date();

        await db
            .update(companies)
            .set({
                deletedAt: now,
                updatedAt: now,
            })
            .where(eq(companies.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting company:', error);
        return NextResponse.json(
            { error: 'Failed to delete company' },
            { status: 500 }
        );
    }
}
