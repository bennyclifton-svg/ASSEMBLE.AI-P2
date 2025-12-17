import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { companies } from '@/lib/db';
import { eq, isNull, like, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { CreateCompanyInput } from '@/types/cost-plan';

/**
 * GET /api/cost-companies
 * List all companies (with optional search)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');

        let query = db
            .select()
            .from(companies)
            .where(isNull(companies.deletedAt));

        const allCompanies = await query;

        // Apply search filter in memory if provided
        let filtered = allCompanies;
        if (search) {
            const searchLower = search.toLowerCase();
            filtered = allCompanies.filter(
                (c) =>
                    c.name.toLowerCase().includes(searchLower) ||
                    c.abn?.toLowerCase().includes(searchLower) ||
                    c.contactName?.toLowerCase().includes(searchLower)
            );
        }

        return NextResponse.json(filtered);
    } catch (error) {
        console.error('Error fetching companies:', error);
        return NextResponse.json(
            { error: 'Failed to fetch companies' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/cost-companies
 * Create a new company
 */
export async function POST(request: NextRequest) {
    try {
        const body: CreateCompanyInput = await request.json();

        // Validate required fields
        if (!body.name) {
            return NextResponse.json(
                { error: 'Company name is required' },
                { status: 400 }
            );
        }

        const id = uuidv4();
        const now = new Date();

        await db.insert(companies).values({
            id,
            name: body.name,
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
        console.error('Error creating company:', error);
        return NextResponse.json(
            { error: 'Failed to create company' },
            { status: 500 }
        );
    }
}
