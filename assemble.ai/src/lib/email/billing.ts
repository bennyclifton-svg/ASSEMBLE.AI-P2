import {
    sendTransactionalEmail,
    type TransactionalEmailInput,
    type TransactionalEmailProvider,
    type TransactionalEmailResult,
} from './transactional';
import { getPlanById } from '@/lib/subscription/plan-catalog';

export type BillingEmailEventType =
    | 'subscription_activated'
    | 'subscription_canceled'
    | 'payment_failed'
    | 'plan_changed';

export interface BillingEmailEvent {
    type: BillingEmailEventType;
    to: string;
    name?: string | null;
    productId: string;
    previousProductId?: string | null;
    currentPeriodEnd?: Date | string | null;
    billingUrl?: string;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function firstName(name?: string | null): string {
    return name?.trim().split(/\s+/)[0] || 'there';
}

function appUrl(env: NodeJS.ProcessEnv = process.env): string {
    return (env.NEXT_PUBLIC_APP_URL || env.BETTER_AUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function planNameForProduct(productId?: string | null, env: NodeJS.ProcessEnv = process.env): string {
    if (!productId) return 'Sitewise';
    if (env.POLAR_STARTER_PRODUCT_ID && productId === env.POLAR_STARTER_PRODUCT_ID) {
        return getPlanById('starter')?.name ?? 'Starter';
    }
    if (env.POLAR_PROFESSIONAL_PRODUCT_ID && productId === env.POLAR_PROFESSIONAL_PRODUCT_ID) {
        return getPlanById('professional')?.name ?? 'Professional';
    }
    return productId.toLowerCase().includes('pro') ? 'Professional' : 'Starter';
}

function formatDate(value?: Date | string | null): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export function buildBillingEmail(
    event: BillingEmailEvent,
    env: NodeJS.ProcessEnv = process.env
): TransactionalEmailInput {
    const name = escapeHtml(firstName(event.name));
    const planName = planNameForProduct(event.productId, env);
    const previousPlanName = planNameForProduct(event.previousProductId, env);
    const billingUrl = escapeHtml(event.billingUrl ?? `${appUrl(env)}/settings/billing`);
    const renewal = formatDate(event.currentPeriodEnd);

    if (event.type === 'subscription_activated') {
        return {
            to: event.to,
            subject: `Your Sitewise ${planName} subscription is active`,
            html: `
                <p>Hi ${name},</p>
                <p>Your Sitewise ${escapeHtml(planName)} subscription is active.</p>
                ${renewal ? `<p>Your next billing date is ${renewal}.</p>` : ''}
                <p><a href="${billingUrl}">Manage billing</a></p>
            `,
            text: `Hi ${firstName(event.name)},\n\nYour Sitewise ${planName} subscription is active.${renewal ? `\nNext billing date: ${renewal}.` : ''}\n\nManage billing: ${event.billingUrl ?? `${appUrl(env)}/settings/billing`}`,
            tags: { type: event.type },
        };
    }

    if (event.type === 'subscription_canceled') {
        return {
            to: event.to,
            subject: 'Your Sitewise subscription has been canceled',
            html: `
                <p>Hi ${name},</p>
                <p>Your Sitewise subscription has been canceled.</p>
                ${renewal ? `<p>Your current access is scheduled through ${renewal}.</p>` : ''}
                <p><a href="${billingUrl}">Manage billing</a></p>
            `,
            text: `Hi ${firstName(event.name)},\n\nYour Sitewise subscription has been canceled.${renewal ? `\nCurrent access is scheduled through ${renewal}.` : ''}\n\nManage billing: ${event.billingUrl ?? `${appUrl(env)}/settings/billing`}`,
            tags: { type: event.type },
        };
    }

    if (event.type === 'payment_failed') {
        return {
            to: event.to,
            subject: 'Payment needs attention for Sitewise',
            html: `
                <p>Hi ${name},</p>
                <p>We could not complete the latest payment for your Sitewise subscription.</p>
                <p>Please update billing to keep write, upload, and AI actions available.</p>
                <p><a href="${billingUrl}">Update billing</a></p>
            `,
            text: `Hi ${firstName(event.name)},\n\nWe could not complete the latest payment for your Sitewise subscription.\n\nUpdate billing: ${event.billingUrl ?? `${appUrl(env)}/settings/billing`}`,
            tags: { type: event.type },
        };
    }

    return {
        to: event.to,
        subject: `Your Sitewise plan changed to ${planName}`,
        html: `
            <p>Hi ${name},</p>
            <p>Your Sitewise plan changed from ${escapeHtml(previousPlanName)} to ${escapeHtml(planName)}.</p>
            <p><a href="${billingUrl}">View billing</a></p>
        `,
        text: `Hi ${firstName(event.name)},\n\nYour Sitewise plan changed from ${previousPlanName} to ${planName}.\n\nView billing: ${event.billingUrl ?? `${appUrl(env)}/settings/billing`}`,
        tags: { type: event.type },
    };
}

export function sendBillingEmail(
    event: BillingEmailEvent,
    options: {
        provider?: TransactionalEmailProvider;
        env?: NodeJS.ProcessEnv;
    } = {}
): Promise<TransactionalEmailResult> {
    return sendTransactionalEmail(buildBillingEmail(event, options.env), {
        provider: options.provider,
        env: options.env,
    });
}
