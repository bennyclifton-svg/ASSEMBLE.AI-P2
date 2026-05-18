import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { polarCustomer, polarSubscription, user as userTable } from '@/lib/db/auth-schema';
import {
    type LocalPolarSubscription,
    type PolarWebhookPayload,
} from './polar-webhook-sync';
import { processPolarWebhookWithBillingEmails } from './polar-webhook-billing';

export async function processValidatedPolarWebhook(payload: PolarWebhookPayload) {
    return processPolarWebhookWithBillingEmails({
        payload,
        signatureVerified: true,
        store: {
            async findCustomerByPolarId(polarCustomerId) {
                const [customer] = await db
                    .select({
                        id: polarCustomer.id,
                        userId: polarCustomer.userId,
                        polarCustomerId: polarCustomer.polarCustomerId,
                        email: userTable.email,
                        name: userTable.name,
                    })
                    .from(polarCustomer)
                    .leftJoin(userTable, eq(userTable.id, polarCustomer.userId))
                    .where(eq(polarCustomer.polarCustomerId, polarCustomerId))
                    .limit(1);

                return customer ?? null;
            },
            async findSubscriptionByPolarId(polarSubscriptionId) {
                const [subscription] = await db
                    .select()
                    .from(polarSubscription)
                    .where(eq(polarSubscription.polarSubscriptionId, polarSubscriptionId))
                    .limit(1);

                return subscription ?? null;
            },
            async upsertSubscription(values) {
                await db
                    .insert(polarSubscription)
                    .values(values)
                    .onConflictDoUpdate({
                        target: polarSubscription.polarSubscriptionId,
                        set: {
                            customerId: values.customerId,
                            productId: values.productId,
                            priceId: values.priceId,
                            status: values.status,
                            currentPeriodStart: values.currentPeriodStart,
                            currentPeriodEnd: values.currentPeriodEnd,
                            cancelAtPeriodEnd: values.cancelAtPeriodEnd,
                            canceledAt: values.canceledAt,
                            updatedAt: values.updatedAt,
                        },
                    });

                return values as LocalPolarSubscription;
            },
        },
    });
}
