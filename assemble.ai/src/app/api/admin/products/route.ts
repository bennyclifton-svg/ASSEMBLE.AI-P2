/**
 * Admin Products API
 *
 * CRUD operations for managing subscription products.
 * Protected endpoint - requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/better-auth';
import { db } from '@/lib/db';
import { products } from '@/lib/db/pg-schema';
import { eq, asc } from 'drizzle-orm';

/**
 * Check if user is authenticated
 */
async function checkAuth() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });
        return session?.user || null;
    } catch {
        return null;
    }
}

/**
 * GET /api/admin/products
 * List all products
 */
export async function GET() {
    const user = await checkAuth();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const allProducts = await db
            .select()
            .from(products)
            .orderBy(asc(products.displayOrder));

        return NextResponse.json({ products: allProducts });
    } catch (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json(
            { error: 'Failed to fetch products' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/admin/products
 * Update a product
 */
export async function PATCH(request: NextRequest) {
    const user = await checkAuth();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { id, polarProductId, isActive } = body;

        if (!id) {
            return NextResponse.json(
                { error: 'Product ID is required' },
                { status: 400 }
            );
        }

        // Build update object
        const updates: Record<string, unknown> = {
            updatedAt: Math.floor(Date.now() / 1000),
        };

        if (polarProductId !== undefined) {
            updates.polarProductId = polarProductId;
        }

        if (isActive !== undefined) {
            updates.isActive = isActive;
        }

        // Update the product
        await db
            .update(products)
            .set(updates)
            .where(eq(products.id, id));

        // Fetch and return updated product
        const [updated] = await db
            .select()
            .from(products)
            .where(eq(products.id, id));

        return NextResponse.json({ product: updated });
    } catch (error) {
        console.error('Error updating product:', error);
        return NextResponse.json(
            { error: 'Failed to update product' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/products
 * Create a new product
 */
export async function POST(request: NextRequest) {
    const user = await checkAuth();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const {
            id,
            name,
            description,
            slug,
            polarProductId,
            priceCents,
            billingInterval = 'month',
            features,
            isActive = true,
            displayOrder = 0,
        } = body;

        if (!id || !name || !slug || !polarProductId || priceCents === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields: id, name, slug, polarProductId, priceCents' },
                { status: 400 }
            );
        }

        const now = Math.floor(Date.now() / 1000);

        await db.insert(products).values({
            id,
            name,
            description,
            slug,
            polarProductId,
            priceCents,
            billingInterval,
            features: features ? JSON.stringify(features) : null,
            isActive,
            displayOrder,
            createdAt: now,
            updatedAt: now,
        });

        const [created] = await db
            .select()
            .from(products)
            .where(eq(products.id, id));

        return NextResponse.json({ product: created }, { status: 201 });
    } catch (error) {
        console.error('Error creating product:', error);
        return NextResponse.json(
            { error: 'Failed to create product' },
            { status: 500 }
        );
    }
}
