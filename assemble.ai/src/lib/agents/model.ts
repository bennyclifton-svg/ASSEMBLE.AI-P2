import { getProviderAndModelFor } from '@/lib/ai/registry';
import type { FeatureGroup, ModelChoice } from '@/lib/ai/types';

export async function resolveAgentModel(group: FeatureGroup): Promise<ModelChoice> {
    return getProviderAndModelFor(group);
}
