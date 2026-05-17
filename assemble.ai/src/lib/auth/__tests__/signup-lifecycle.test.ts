import { completeNewUserSignup, type SignupLifecycleStore } from '../signup-lifecycle';
import { TRIAL_STATUS } from '@/lib/subscription/trial';

function createStore() {
    const organizations: unknown[] = [];
    const users: Array<{ userId: string; values: unknown }> = [];
    const libraries: unknown[] = [];

    const store: SignupLifecycleStore = {
        createOrganization: jest.fn(async (values) => {
            organizations.push(values);
        }),
        updateUser: jest.fn(async (userId, values) => {
            users.push({ userId, values });
        }),
        createKnowledgeLibrary: jest.fn(async (values) => {
            libraries.push(values);
        }),
    };

    return { store, organizations, users, libraries };
}

describe('signup lifecycle', () => {
    const now = new Date('2026-05-17T10:00:00.000Z');
    const expectedTrialEndsAt = new Date('2026-05-31T10:00:00.000Z');
    const libraryTypes = [{ id: 'due-diligence' }, { id: 'house' }];

    function createIds() {
        const ids = ['org-1', 'library-1', 'library-2'];
        return () => ids.shift() ?? 'extra-id';
    }

    it.each([
        ['starter', 'starter'],
        ['professional', 'professional'],
        [undefined, 'starter'],
        ['enterprise', 'starter'],
    ])('starts a no-card trial for requested plan %s', async (requestedPlanId, expectedPlanId) => {
        const { store, users } = createStore();

        await completeNewUserSignup({
            user: {
                id: 'user-1',
                email: 'person@example.com',
                name: 'Person Example',
                trialPlanId: requestedPlanId,
            },
            store,
            libraryTypes,
            now,
            idFactory: createIds(),
        });

        expect(users).toEqual([
            {
                userId: 'user-1',
                values: {
                    organizationId: 'org-1',
                    trialStartedAt: now,
                    trialEndsAt: expectedTrialEndsAt,
                    trialPlanId: expectedPlanId,
                    trialStatus: TRIAL_STATUS.ACTIVE,
                },
            },
        ]);
    });

    it('creates exactly one workspace and initial knowledge libraries for the new user', async () => {
        const { store, organizations, libraries } = createStore();

        const result = await completeNewUserSignup({
            user: {
                id: 'user-1',
                email: 'person@example.com',
                name: 'Person Example',
                trialPlanId: 'starter',
            },
            store,
            libraryTypes,
            now,
            idFactory: createIds(),
        });

        expect(result.organizationId).toBe('org-1');
        expect(organizations).toEqual([
            {
                id: 'org-1',
                name: "Person Example's Organization",
                defaultSettings: '{}',
                createdAt: 1779012000,
                updatedAt: 1779012000,
            },
        ]);
        expect(libraries).toEqual([
            {
                id: 'library-1',
                organizationId: 'org-1',
                type: 'due-diligence',
                documentCount: 0,
                createdAt: 1779012000,
                updatedAt: 1779012000,
            },
            {
                id: 'library-2',
                organizationId: 'org-1',
                type: 'house',
                documentCount: 0,
                createdAt: 1779012000,
                updatedAt: 1779012000,
            },
        ]);
        expect(store.createOrganization).toHaveBeenCalledTimes(1);
        expect(store.updateUser).toHaveBeenCalledTimes(1);
        expect(store.createKnowledgeLibrary).toHaveBeenCalledTimes(2);
    });
});
