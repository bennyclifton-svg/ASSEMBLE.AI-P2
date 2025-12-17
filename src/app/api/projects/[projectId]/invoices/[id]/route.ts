import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices } from '@/lib/db';
import { eq, and, isNull } from 'drizzle-orm';
import type { UpdateInvoiceInput } from '@/types/invoice';

/**
 * GET /api/projects/[projectId]/invoices/[id]
 * Get a single invoice
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; id: string }> }
) {
    try {
        const { projectId, id } = await params;

        const [invoice] = await db
            .select()
            .from(invoices)
            .where(
                and(
                    eq(invoices.id, id),
                    eq(invoices.projectId, projectId),
                    isNull(invoices.deletedAt)
                )
            );

        if (!invoice) {
            return NextResponse.json(
                { error: 'Invoice not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(invoice);
    } catch (error) {
        console.error('Error fetching invoice:', error);
        return NextResponse.json(
            { error: 'Failed to fetch invoice' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/projects/[projectId]/invoices/[id]
 * Update an invoice
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; id: string }> }
) {
    try {
        const { projectId, id } = await params;
        const body: UpdateInvoiceInput = await request.json();

        const [existing] = await db
            .select()
            .from(invoices)
            .where(
                and(
                    eq(invoices.id, id),
                    eq(invoices.projectId, projectId),
                    isNull(invoices.deletedAt)
                )
            );

        if (!existing) {
            return NextResponse.json(
                { error: 'Invoice not found' },
                { status: 404 }
            );
        }

        // Validate period month if provided
        if (body.periodMonth !== undefined && (body.periodMonth < 1 || body.periodMonth > 12)) {
            return NextResponse.json(
                { error: 'periodMonth must be between 1 and 12' },
                { status: 400 }
            );
        }

        const now = new Date();

        const updateData: Record<string, unknown> = {
            updatedAt: now,
        };

        if (body.costLineId !== undefined) updateData.costLineId = body.costLineId;
        if (body.variationId !== undefined) updateData.variationId = body.variationId;
        if (body.companyId !== undefined) updateData.companyId = body.companyId;
        if (body.invoiceDate !== undefined) updateData.invoiceDate = body.invoiceDate;
        if (body.poNumber !== undefined) updateData.poNumber = body.poNumber;
        if (body.invoiceNumber !== undefined) updateData.invoiceNumber = body.invoiceNumber;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.amountCents !== undefined) updateData.amountCents = body.amountCents;
        if (body.gstCents !== undefined) updateData.gstCents = body.gstCents;
        if (body.periodYear !== undefined) updateData.periodYear = body.periodYear;
        if (body.periodMonth !== undefined) updateData.periodMonth = body.periodMonth;
        if (body.paidStatus !== undefined) updateData.paidStatus = body.paidStatus;
        if (body.paidDate !== undefined) updateData.paidDate = body.paidDate;

        await db
            .update(invoices)
            .set(updateData)
            .where(eq(invoices.id, id));

        const [updated] = await db
            .select()
            .from(invoices)
            .where(eq(invoices.id, id));

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating invoice:', error);
        return NextResponse.json(
            { error: 'Failed to update invoice' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/projects/[projectId]/invoices/[id]
 * Soft delete an invoice
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; id: string }> }
) {
    try {
        const { projectId, id } = await params;

        const [existing] = await db
            .select()
            .from(invoices)
            .where(
                and(
                    eq(invoices.id, id),
                    eq(invoices.projectId, projectId),
                    isNull(invoices.deletedAt)
                )
            );

        if (!existing) {
            return NextResponse.json(
                { error: 'Invoice not found' },
                { status: 404 }
            );
        }

        const now = new Date();

        await db
            .update(invoices)
            .set({
                deletedAt: now,
                updatedAt: now,
            })
            .where(eq(invoices.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting invoice:', error);
        return NextResponse.json(
            { error: 'Failed to delete invoice' },
            { status: 500 }
        );
    }
}
