import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { companies } from '@/lib/db';
import { eq, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface FindOrCreateInput {
    name: string;
    abn?: string | null;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    address?: string | null;
}

/**
 * POST /api/cost-companies/find-or-create
 * Find a company by name (case-insensitive) or create a new one.
 * Used by Award toggle to promote consultants/contractors to companies master list.
 */
export async function POST(request: NextRequest) {
    try {
        const body: FindOrCreateInput = await request.json();

        // Validate required fields
        if (!body.name || body.name.trim() === '') {
            return NextResponse.json(
                { error: 'Company name is required' },
                { status: 400 }
            );
        }

        const normalizedName = body.name.trim().toLowerCase();

        // Try to find existing company by name (case-insensitive)
        const existingCompanies = await db
            .select()
            .from(companies)
            .where(isNull(companies.deletedAt));

        const match = existingCompanies.find(
            (c) => c.name.toLowerCase() === normalizedName
        );

        if (match) {
            // Company found - optionally update empty contact details
            const updates: Record<string, string | null> = {};
            let hasUpdates = false;

            if (!match.abn && body.abn) {
                updates.abn = body.abn;
                hasUpdates = true;
            }
            if (!match.contactName && body.contactName) {
                updates.contactName = body.contactName;
                hasUpdates = true;
            }
            if (!match.contactEmail && body.contactEmail) {
                updates.contactEmail = body.contactEmail;
                hasUpdates = true;
            }
            if (!match.contactPhone && body.contactPhone) {
                updates.contactPhone = body.contactPhone;
                hasUpdates = true;
            }
            if (!match.address && body.address) {
                updates.address = body.address;
                hasUpdates = true;
            }

            if (hasUpdates) {
                updates.updatedAt = new Date().toISOString();
                await db
                    .update(companies)
                    .set(updates)
                    .where(eq(companies.id, match.id));

                // Return updated company
                const [updated] = await db
                    .select()
                    .from(companies)
                    .where(eq(companies.id, match.id));
                return NextResponse.json(updated);
            }

            return NextResponse.json(match);
        }

        // No match found - create new company
        const id = uuidv4();
        const now = new Date().toISOString();

        await db.insert(companies).values({
            id,
            name: body.name.trim(),
            abn: body.abn || null,
            contactName: body.contactName || null,
            contactEmail: body.contactEmail || null,
            contactPhone: body.contactPhone || null,
            address: body.address || null,
            createdAt: now,
            updatedAt: now,
        });

        const [created] = await db
            .select()
            .from(companies)
            .where(eq(companies.id, id));

        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        console.error('Error in find-or-create company:', error);
        return NextResponse.json(
            { error: 'Failed to find or create company' },
            { status: 500 }
        );
    }
}
