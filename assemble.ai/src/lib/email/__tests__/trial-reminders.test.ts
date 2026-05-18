import {
    dispatchTrialEndingReminders,
    isTrialReminderEligible,
    type TrialReminderStore,
    type TrialReminderUser,
} from '../trial-reminders';
import type { TransactionalEmailProvider } from '../transactional';

function createStore(users: TrialReminderUser[]) {
    const rows = [...users];
    const store: TrialReminderStore = {
        listTrialReminderCandidates: jest.fn(async () => rows.filter((user) => !user.trialReminderSentAt)),
        markTrialReminderSent: jest.fn(async (userId, sentAt) => {
            const user = rows.find((row) => row.id === userId);
            if (user && !user.trialReminderSentAt) {
                user.trialReminderSentAt = sentAt;
            }
        }),
    };

    return { store, rows };
}

function createProvider(): TransactionalEmailProvider {
    return {
        send: jest.fn(async () => ({ id: 'email-1' })),
    };
}

describe('trial reminders', () => {
    const now = new Date('2026-05-17T10:00:00.000Z');

    it('derives reminder eligibility from active trial metadata', () => {
        expect(isTrialReminderEligible({
            now,
            daysBeforeEnd: 3,
            user: {
                id: 'user-1',
                email: 'person@example.com',
                trialStatus: 'active',
                trialEndsAt: '2026-05-19T10:00:00.000Z',
            },
        })).toBe(true);

        expect(isTrialReminderEligible({
            now,
            daysBeforeEnd: 3,
            user: {
                id: 'user-1',
                email: 'person@example.com',
                trialStatus: 'active',
                trialEndsAt: '2026-05-25T10:00:00.000Z',
            },
        })).toBe(false);

        expect(isTrialReminderEligible({
            now,
            daysBeforeEnd: 3,
            user: {
                id: 'user-1',
                email: 'person@example.com',
                trialStatus: 'converted',
                trialEndsAt: '2026-05-19T10:00:00.000Z',
            },
        })).toBe(false);
    });

    it('sends trial reminders through the provider and records sent timestamp', async () => {
        const { store } = createStore([{
            id: 'user-1',
            email: 'person@example.com',
            name: 'Person Example',
            trialStatus: 'active',
            trialPlanId: 'professional',
            trialEndsAt: '2026-05-19T10:00:00.000Z',
        }]);
        const provider = createProvider();

        const result = await dispatchTrialEndingReminders({
            store,
            provider,
            now,
            daysBeforeEnd: 3,
            env: { NEXT_PUBLIC_APP_URL: 'https://app.example.com' } as NodeJS.ProcessEnv,
        });

        expect(result).toEqual({ considered: 1, sent: 1, skipped: 0 });
        expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({
            to: 'person@example.com',
            subject: 'Your Sitewise Professional trial ends soon',
            tags: { type: 'trial_ending_reminder', plan: 'Professional' },
        }));
        expect(store.markTrialReminderSent).toHaveBeenCalledWith('user-1', now);
    });

    it('prevents duplicate dispatch when the reminder timestamp exists', async () => {
        const { store } = createStore([{
            id: 'user-1',
            email: 'person@example.com',
            trialStatus: 'active',
            trialEndsAt: '2026-05-19T10:00:00.000Z',
        }]);
        const provider = createProvider();

        await dispatchTrialEndingReminders({ store, provider, now, daysBeforeEnd: 3 });
        const secondRun = await dispatchTrialEndingReminders({ store, provider, now, daysBeforeEnd: 3 });

        expect(secondRun).toEqual({ considered: 0, sent: 0, skipped: 0 });
        expect(provider.send).toHaveBeenCalledTimes(1);
        expect(store.markTrialReminderSent).toHaveBeenCalledTimes(1);
    });
});
