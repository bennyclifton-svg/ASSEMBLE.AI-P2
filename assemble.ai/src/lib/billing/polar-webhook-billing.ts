import {
    syncPolarWebhookPayload,
    type PolarWebhookPayload,
    type PolarWebhookSyncStore,
} from './polar-webhook-sync';
import { sendBillingEmail } from '@/lib/email/billing';
import type { TransactionalEmailProvider, TransactionalEmailResult } from '@/lib/email/transactional';

export async function processPolarWebhookWithBillingEmails(args: {
    payload: PolarWebhookPayload;
    store: PolarWebhookSyncStore;
    signatureVerified: boolean;
    provider?: TransactionalEmailProvider;
    env?: NodeJS.ProcessEnv;
    now?: Date;
    idFactory?: () => string;
}) {
    const result = await syncPolarWebhookPayload({
        payload: args.payload,
        store: args.store,
        signatureVerified: args.signatureVerified,
        now: args.now,
        idFactory: args.idFactory,
    });

    let email: TransactionalEmailResult | null = null;
    if (result.ok && result.billingEmailEvent) {
        email = await sendBillingEmail(result.billingEmailEvent, {
            provider: args.provider,
            env: args.env,
        });
    }

    return { ...result, email };
}
