import { randomUUID } from 'crypto';
import {
    createInitialTrialState,
    type InitialTrialState,
    type TrialStatus,
} from '@/lib/subscription/trial';
import type { PublicPlanId } from '@/lib/subscription/plan-catalog';

export interface SignupLifecycleUser {
    id: string;
    email?: string | null;
    name?: string | null;
    trialPlanId?: string | null;
}

export interface SignupOrganizationValues {
    id: string;
    name: string;
    defaultSettings: string;
    createdAt: number;
    updatedAt: number;
}

export interface SignupUserUpdateValues {
    organizationId: string;
    trialStartedAt: Date;
    trialEndsAt: Date;
    trialPlanId: PublicPlanId;
    trialStatus: TrialStatus;
}

export interface SignupKnowledgeLibraryValues {
    id: string;
    organizationId: string;
    type: string;
    documentCount: number;
    createdAt: number;
    updatedAt: number;
}

export interface SignupLifecycleStore {
    createOrganization(values: SignupOrganizationValues): Promise<void>;
    updateUser(userId: string, values: SignupUserUpdateValues): Promise<void>;
    createKnowledgeLibrary(values: SignupKnowledgeLibraryValues): Promise<void>;
}

export interface CompleteNewUserSignupResult {
    organizationId: string;
    trial: InitialTrialState;
}

export function getSignupDisplayName(user: SignupLifecycleUser): string {
    return user.name?.trim() || user.email?.split('@')[0] || 'New User';
}

export async function completeNewUserSignup(args: {
    user: SignupLifecycleUser;
    store: SignupLifecycleStore;
    libraryTypes: ReadonlyArray<{ id: string }>;
    now?: Date;
    idFactory?: () => string;
}): Promise<CompleteNewUserSignupResult> {
    const now = args.now ?? new Date();
    const nowSeconds = Math.floor(now.getTime() / 1000);
    const idFactory = args.idFactory ?? randomUUID;
    const organizationId = idFactory();
    const displayName = getSignupDisplayName(args.user);
    const trial = createInitialTrialState({
        requestedPlanId: args.user.trialPlanId,
        now,
    });

    await args.store.createOrganization({
        id: organizationId,
        name: `${displayName}'s Organization`,
        defaultSettings: '{}',
        createdAt: nowSeconds,
        updatedAt: nowSeconds,
    });

    await args.store.updateUser(args.user.id, {
        organizationId,
        ...trial,
    });

    for (const libraryType of args.libraryTypes) {
        await args.store.createKnowledgeLibrary({
            id: idFactory(),
            organizationId,
            type: libraryType.id,
            documentCount: 0,
            createdAt: nowSeconds,
            updatedAt: nowSeconds,
        });
    }

    return { organizationId, trial };
}
