/**
 * Polar Webhook Handler
 * POST /api/polar/webhook
 *
 * Handles incoming webhook events from Polar for subscription lifecycle
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleWebhookEvent, type PolarWebhookPayload } from '@/lib/polar/webhooks';
import crypto from 'crypto';

// Webhook secret for signature verification
const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET;

/**
 * Verify Polar webhook signature
 * Polar signs webhooks using HMAC-SHA256
 */
function verifySignature(payload: string, signature: string | null): boolean {
    if (!POLAR_WEBHOOK_SECRET || !signature) {
        console.warn('Webhook signature verification skipped - missing secret or signature');
        // In development, allow unsigned webhooks
        return process.env.NODE_ENV !== 'production';
    }

    try {
        // Polar signature format: v1=<signature>
        const expectedSignature = crypto
            .createHmac('sha256', POLAR_WEBHOOK_SECRET)
            .update(payload)
            .digest('hex');

        const providedSignature = signature.replace('v1=', '');

        return crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(providedSignature, 'hex')
        );
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        // Get raw body for signature verification
        const rawBody = await request.text();
        const signature = request.headers.get('polar-signature');

        // Verify webhook signature
        if (!verifySignature(rawBody, signature)) {
            console.error('Invalid webhook signature');
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 401 }
            );
        }

        // Parse the payload
        let payload: PolarWebhookPayload;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return NextResponse.json(
                { error: 'Invalid JSON payload' },
                { status: 400 }
            );
        }

        // Validate payload structure
        if (!payload.type || !payload.data) {
            return NextResponse.json(
                { error: 'Invalid payload structure' },
                { status: 400 }
            );
        }

        // Handle the webhook event
        await handleWebhookEvent(payload);

        // Return success
        return NextResponse.json({ received: true }, { status: 200 });
    } catch (error) {
        console.error('Webhook processing error:', error);

        // Return 200 to prevent retries for non-retryable errors
        // Polar will retry on 5xx errors
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 200 }
        );
    }
}

// Polar uses POST for webhooks
export async function GET(): Promise<NextResponse> {
    return NextResponse.json(
        { error: 'Method not allowed. Use POST for webhooks.' },
        { status: 405 }
    );
}
