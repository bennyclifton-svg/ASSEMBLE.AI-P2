/**
 * Polar Checkout API
 * POST /api/polar/checkout
 *
 * Creates a Polar checkout session and returns the checkout URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { polar, polarOrganizationId, getAppUrl, isPolarConfigured } from '@/lib/polar/client';
import { getPlanById } from '@/lib/polar/plans';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users, sessions } from '@/lib/db/pg-schema';
import { eq } from 'drizzle-orm';

interface CheckoutRequest {
    planId: string;
    billingPeriod?: 'monthly' | 'annually';
}

async function getCurrentUser() {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
        return null;
    }

    try {
        // Get session and user
        const [session] = await db
            .select()
            .from(sessions)
            .where(eq(sessions.tokenHash, sessionToken))
            .limit(1);

        if (!session || session.expiresAt < Date.now() / 1000) {
            return null;
        }

        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, session.userId))
            .limit(1);

        return user || null;
    } catch {
        return null;
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        // Check if Polar is configured
        if (!isPolarConfigured()) {
            return NextResponse.json(
                { error: 'Billing is not configured' },
                { status: 503 }
            );
        }

        // Get current user
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Parse request body
        const body: CheckoutRequest = await request.json();
        const { planId } = body;

        if (!planId) {
            return NextResponse.json(
                { error: 'Plan ID is required' },
                { status: 400 }
            );
        }

        // Get plan details
        const plan = getPlanById(planId);
        if (!plan || !plan.polarProductId) {
            return NextResponse.json(
                { error: 'Invalid plan or plan not available for purchase' },
                { status: 400 }
            );
        }

        const appUrl = getAppUrl();
        const successUrl = `${appUrl}/billing?success=true`;
        const cancelUrl = `${appUrl}/pricing?canceled=true`;

        // Create checkout session with Polar
        const checkout = await polar.checkouts.create({
            products: [plan.polarProductId],
            successUrl,
            customerEmail: user.email,
            metadata: {
                userId: user.id,
                planId: plan.id,
            },
        });

        // If user doesn't have a Polar customer ID yet, we'll get it from the webhook
        // after successful checkout

        return NextResponse.json({
            checkoutUrl: checkout.url,
        });
    } catch (error) {
        console.error('Checkout error:', error);

        return NextResponse.json(
            { error: 'Failed to create checkout session' },
            { status: 500 }
        );
    }
}

// GET request to check if billing is enabled
export async function GET(): Promise<NextResponse> {
    return NextResponse.json({
        billingEnabled: isPolarConfigured(),
        organizationId: polarOrganizationId ? 'configured' : 'not configured',
    });
}
