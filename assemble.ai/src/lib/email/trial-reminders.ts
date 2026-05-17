import { TRIAL_STATUS } from '@/lib/subscription/trial';
import { getPlanById } from '@/lib/subscription/plan-catalog';
import {
    sendTrialEndingReminderEmail,
    type TransactionalEmailProvider,
    type TransactionalEmailResult,
} from './transactional';

export interface TrialReminderUser {
    id: string;
    email: string;
    name?: string | null;
    trialStatus?: string | null;
    trialPlanId?: string | null;
    trialEndsAt?: Date | string | null;
    trialReminderSentAt?: Date | string | null;
}

export interface TrialReminderStore {
    listTrialReminderCandidates(args: {
        now: Date;
        daysBeforeEnd: number;
    }): Promise<TrialReminderUser[]>;
    markTrialReminderSent(userId: string, sentAt: Date): Promise<void>;
}

export interface TrialReminderDispatchResult {
    considered: number;
    sent: number;
    skipped: number;
}

function parseDate(value?: Date | string | null): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDaysBeforeEnd(env: NodeJS.ProcessEnv = process.env): number {
    const raw = Number.parseInt(env.TRIAL_REMINDER_DAYS_BEFORE_END ?? '', 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 3;
}

function appUrl(env: NodeJS.ProcessEnv = process.env): string {
    return (env.NEXT_PUBLIC_APP_URL || env.BETTER_AUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function isTrialReminderEligible(args: {
    user: TrialReminderUser;
    now?: Date;
    daysBeforeEnd?: number;
}): boolean {
    const now = args.now ?? new Date();
    const daysBeforeEnd = args.daysBeforeEnd ?? getDaysBeforeEnd();
    const trialEndsAt = parseDate(args.user.trialEndsAt);
    const reminderSentAt = parseDate(args.user.trialReminderSentAt);

    if (args.user.trialStatus !== TRIAL_STATUS.ACTIVE) return false;
    if (!trialEndsAt || reminderSentAt) return false;
    if (trialEndsAt.getTime() <= now.getTime()) return false;

    const windowEnd = new Date(now.getTime() + daysBeforeEnd * 24 * 60 * 60 * 1000);
    return trialEndsAt.getTime() <= windowEnd.getTime();
}

export async function createDatabaseTrialReminderStore(): Promise<TrialReminderStore> {
    const [{ db }, { user }, drizzle] = await Promise.all([
        import('@/lib/db'),
        import('@/lib/db/auth-schema'),
        import('drizzle-orm'),
    ]);

    return {
        async listTrialReminderCandidates({ now, daysBeforeEnd }) {
            const windowEnd = new Date(now.getTime() + daysBeforeEnd * 24 * 60 * 60 * 1000);
            return db
                .select({
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    trialStatus: user.trialStatus,
                    trialPlanId: user.trialPlanId,
                    trialEndsAt: user.trialEndsAt,
                    trialReminderSentAt: user.trialReminderSentAt,
                })
                .from(user)
                .where(drizzle.and(
                    drizzle.eq(user.trialStatus, TRIAL_STATUS.ACTIVE),
                    drizzle.gte(user.trialEndsAt, now),
                    drizzle.lte(user.trialEndsAt, windowEnd),
                    drizzle.isNull(user.trialReminderSentAt)
                ));
        },
        async markTrialReminderSent(userId, sentAt) {
            await db
                .update(user)
                .set({ trialReminderSentAt: sentAt })
                .where(drizzle.and(
                    drizzle.eq(user.id, userId),
                    drizzle.isNull(user.trialReminderSentAt)
                ));
        },
    };
}

export async function dispatchTrialEndingReminders(args: {
    store?: TrialReminderStore;
    provider?: TransactionalEmailProvider;
    now?: Date;
    daysBeforeEnd?: number;
    env?: NodeJS.ProcessEnv;
} = {}): Promise<TrialReminderDispatchResult> {
    const env = args.env ?? process.env;
    const now = args.now ?? new Date();
    const daysBeforeEnd = args.daysBeforeEnd ?? getDaysBeforeEnd(env);
    const store = args.store ?? await createDatabaseTrialReminderStore();
    const users = await store.listTrialReminderCandidates({ now, daysBeforeEnd });

    let sent = 0;
    let skipped = 0;

    for (const user of users) {
        if (!isTrialReminderEligible({ user, now, daysBeforeEnd })) {
            skipped += 1;
            continue;
        }

        const trialEndsAt = parseDate(user.trialEndsAt);
        if (!trialEndsAt) {
            skipped += 1;
            continue;
        }

        const plan = getPlanById(user.trialPlanId ?? 'starter');
        const result: TransactionalEmailResult = await sendTrialEndingReminderEmail({
            to: user.email,
            name: user.name,
            planName: plan?.name ?? 'Starter',
            trialEndsAt,
            billingUrl: `${appUrl(env)}/settings/billing?plan=${plan?.id ?? 'starter'}`,
        }, args.provider);

        if (result.status === 'sent') {
            await store.markTrialReminderSent(user.id, now);
            sent += 1;
        } else {
            skipped += 1;
        }
    }

    return {
        considered: users.length,
        sent,
        skipped,
    };
}
