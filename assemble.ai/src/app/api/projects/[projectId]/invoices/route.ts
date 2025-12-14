import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices, costLines, variations, companies } from '@/lib/db/schema';
import { eq, isNull, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { CreateInvoiceInput } from '@/types/invoice';

/**
 * GET /api/projects/[projectId]/invoices
 * List all invoices for a project
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const { searchParams } = new URL(request.url);

        // Optional filters
        const costLineId = searchParams.get('costLineId');
        const periodYear = searchParams.get('periodYear');
        const periodMonth = searchParams.get('periodMonth');

        let query = db
            .select()
            .from(invoices)
            .where(
                and(
                    eq(invoices.projectId, projectId),
                    isNull(invoices.deletedAt)
                )
            )
            .orderBy(desc(invoices.invoiceDate));

        const projectInvoices = await query;

        // Apply optional filters in memory (SQLite limitation)
        let filtered = projectInvoices;
        if (costLineId) {
            filtered = filtered.filter((inv) => inv.costLineId === costLineId);
        }
        if (periodYear) {
            filtered = filtered.filter((inv) => inv.periodYear === parseInt(periodYear));
        }
        if (periodMonth) {
            filtered = filtered.filter((inv) => inv.periodMonth === parseInt(periodMonth));
        }

        // Fetch related data
        const result = await Promise.all(
            filtered.map(async (inv) => {
                let costLine = null;
                let variation = null;
                let company = null;

                if (inv.costLineId) {
                    const [cl] = await db
                        .select({ id: costLines.id, costCode: costLines.costCode, activity: costLines.activity, section: costLines.section })
                        .from(costLines)
                        .where(eq(costLines.id, inv.costLineId));
                    costLine = cl || null;
                }

                if (inv.variationId) {
                    const [v] = await db
                        .select({ id: variations.id, variationNumber: variations.variationNumber, description: variations.description })
                        .from(variations)
                        .where(eq(variations.id, inv.variationId));
                    variation = v || null;
                }

                if (inv.companyId) {
                    const [c] = await db
                        .select({ id: companies.id, name: companies.name })
                        .from(companies)
                        .where(eq(companies.id, inv.companyId));
                    company = c || null;
                }

                return { ...inv, costLine, variation, company };
            })
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        return NextResponse.json(
            { error: 'Failed to fetch invoices' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/projects/[projectId]/invoices
 * Create a new invoice
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const body: CreateInvoiceInput = await request.json();

        // Validate required fields
        if (!body.invoiceNumber || !body.invoiceDate || body.amountCents === undefined || !body.periodYear || !body.periodMonth) {
            return NextResponse.json(
                { error: 'invoiceNumber, invoiceDate, amountCents, periodYear, and periodMonth are required' },
                { status: 400 }
            );
        }

        // Validate period month
        if (body.periodMonth < 1 || body.periodMonth > 12) {
            return NextResponse.json(
                { error: 'periodMonth must be between 1 and 12' },
                { status: 400 }
            );
        }

        const id = uuidv4();
        const now = new Date().toISOString();

        await db.insert(invoices).values({
            id,
            projectId,
            costLineId: body.costLineId || null,
            variationId: body.variationId || null,
            companyId: body.companyId || null,
            invoiceDate: body.invoiceDate,
            poNumber: body.poNumber || null,
            invoiceNumber: body.invoiceNumber,
            description: body.description || null,
            amountCents: body.amountCents,
            gstCents: body.gstCents || 0,
            periodYear: body.periodYear,
            periodMonth: body.periodMonth,
            paidStatus: body.paidStatus || 'unpaid',
            paidDate: body.paidDate || null,
            createdAt: now,
            updatedAt: now,
        });

        const [created] = await db
            .select()
            .from(invoices)
            .where(eq(invoices.id, id));

        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        console.error('Error creating invoice:', error);
        return NextResponse.json(
            { error: 'Failed to create invoice' },
            { status: 500 }
        );
    }
}
