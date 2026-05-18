export interface TransactionalEmailInput {
    to: string;
    subject: string;
    html: string;
    text?: string;
    tags?: Record<string, string>;
}

export interface TransactionalEmailProvider {
    send(input: TransactionalEmailInput): Promise<{ id?: string }>;
}

export type TransactionalEmailResult =
    | { status: 'sent'; id?: string }
    | { status: 'skipped'; reason: 'disabled' | 'missing_config' };

export interface TransactionalEmailConfig {
    enabled: boolean;
    valid: boolean;
    missing: string[];
    apiKey?: string;
    fromEmail?: string;
}

export interface AccountEmailArgs {
    to: string;
    name?: string | null;
    url: string;
}

export interface TrialEndingReminderEmailArgs {
    to: string;
    name?: string | null;
    planName: string;
    trialEndsAt: Date;
    billingUrl: string;
}

const RESEND_API_URL = 'https://api.resend.com/emails';

function isTruthy(value: string | undefined): boolean {
    return value === 'true' || value === '1' || value === 'yes';
}

function isFalsey(value: string | undefined): boolean {
    return value === 'false' || value === '0' || value === 'no';
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

function formatDate(date: Date): string {
    return date.toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export function validateTransactionalEmailConfig(env: NodeJS.ProcessEnv = process.env): TransactionalEmailConfig {
    const productionRequiresEmail = env.NODE_ENV === 'production' && !isFalsey(env.TRANSACTIONAL_EMAILS_ENABLED);
    const enabled = productionRequiresEmail || isTruthy(env.TRANSACTIONAL_EMAILS_ENABLED);
    const missing = [
        env.RESEND_API_KEY?.trim() ? null : 'RESEND_API_KEY',
        env.RESEND_FROM_EMAIL?.trim() ? null : 'RESEND_FROM_EMAIL',
    ].filter((value): value is string => Boolean(value));

    return {
        enabled,
        valid: !enabled || missing.length === 0,
        missing: enabled ? missing : [],
        apiKey: env.RESEND_API_KEY,
        fromEmail: env.RESEND_FROM_EMAIL,
    };
}

export function createResendEmailProvider(
    env: NodeJS.ProcessEnv = process.env,
    fetchImpl: typeof fetch = fetch
): TransactionalEmailProvider {
    return {
        async send(input) {
            const config = validateTransactionalEmailConfig(env);
            if (!config.valid || !config.apiKey || !config.fromEmail) {
                throw new Error(`Transactional email is missing ${config.missing.join(', ') || 'configuration'}.`);
            }

            const response = await fetchImpl(RESEND_API_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: config.fromEmail,
                    to: [input.to],
                    subject: input.subject,
                    html: input.html,
                    text: input.text,
                    tags: input.tags
                        ? Object.entries(input.tags).map(([name, value]) => ({ name, value }))
                        : undefined,
                }),
            });

            if (!response.ok) {
                const body = await response.text().catch(() => '');
                throw new Error(`Resend email failed with HTTP ${response.status}${body ? `: ${body}` : ''}`);
            }

            const data = await response.json().catch(() => ({} as { id?: string }));
            return { id: typeof data.id === 'string' ? data.id : undefined };
        },
    };
}

export async function sendTransactionalEmail(
    input: TransactionalEmailInput,
    options: {
        provider?: TransactionalEmailProvider;
        env?: NodeJS.ProcessEnv;
    } = {}
): Promise<TransactionalEmailResult> {
    if (options.provider) {
        const result = await options.provider.send(input);
        return { status: 'sent', id: result.id };
    }

    const env = options.env ?? process.env;
    const config = validateTransactionalEmailConfig(env);
    if (!config.enabled) {
        return { status: 'skipped', reason: 'disabled' };
    }

    if (!config.valid) {
        return { status: 'skipped', reason: 'missing_config' };
    }

    const provider = createResendEmailProvider(env);
    const result = await provider.send(input);
    return { status: 'sent', id: result.id };
}

export function buildVerificationEmail(args: AccountEmailArgs): TransactionalEmailInput {
    const name = escapeHtml(firstName(args.name));
    const url = escapeHtml(args.url);

    return {
        to: args.to,
        subject: 'Verify your Sitewise account',
        html: `
            <p>Hi ${name},</p>
            <p>Please verify your email address to finish setting up your Sitewise account.</p>
            <p><a href="${url}">Verify email</a></p>
            <p>If you did not create this account, you can ignore this email.</p>
        `,
        text: `Hi ${firstName(args.name)},\n\nPlease verify your Sitewise account:\n${args.url}\n\nIf you did not create this account, you can ignore this email.`,
        tags: { type: 'account_verification' },
    };
}

export function buildPasswordResetEmail(args: AccountEmailArgs): TransactionalEmailInput {
    const name = escapeHtml(firstName(args.name));
    const url = escapeHtml(args.url);

    return {
        to: args.to,
        subject: 'Reset your Sitewise password',
        html: `
            <p>Hi ${name},</p>
            <p>Use the secure link below to reset your Sitewise password.</p>
            <p><a href="${url}">Reset password</a></p>
            <p>If you did not request this, you can ignore this email.</p>
        `,
        text: `Hi ${firstName(args.name)},\n\nReset your Sitewise password:\n${args.url}\n\nIf you did not request this, you can ignore this email.`,
        tags: { type: 'password_reset' },
    };
}

export function buildTrialEndingReminderEmail(args: TrialEndingReminderEmailArgs): TransactionalEmailInput {
    const name = escapeHtml(firstName(args.name));
    const planName = escapeHtml(args.planName);
    const billingUrl = escapeHtml(args.billingUrl);
    const trialEnds = formatDate(args.trialEndsAt);

    return {
        to: args.to,
        subject: `Your Sitewise ${args.planName} trial ends soon`,
        html: `
            <p>Hi ${name},</p>
            <p>Your Sitewise ${planName} trial ends on ${trialEnds}.</p>
            <p>You can upgrade before then to keep creating, uploading, and running AI actions without interruption.</p>
            <p><a href="${billingUrl}">Manage billing</a></p>
        `,
        text: `Hi ${firstName(args.name)},\n\nYour Sitewise ${args.planName} trial ends on ${trialEnds}.\n\nManage billing: ${args.billingUrl}`,
        tags: { type: 'trial_ending_reminder', plan: args.planName },
    };
}

export function sendAccountVerificationEmail(
    args: AccountEmailArgs,
    provider?: TransactionalEmailProvider
): Promise<TransactionalEmailResult> {
    return sendTransactionalEmail(buildVerificationEmail(args), { provider });
}

export function sendPasswordResetEmail(
    args: AccountEmailArgs,
    provider?: TransactionalEmailProvider
): Promise<TransactionalEmailResult> {
    return sendTransactionalEmail(buildPasswordResetEmail(args), { provider });
}

export function sendTrialEndingReminderEmail(
    args: TrialEndingReminderEmailArgs,
    provider?: TransactionalEmailProvider
): Promise<TransactionalEmailResult> {
    return sendTransactionalEmail(buildTrialEndingReminderEmail(args), { provider });
}
