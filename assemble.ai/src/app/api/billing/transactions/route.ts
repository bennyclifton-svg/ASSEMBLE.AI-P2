import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/better-auth';
import { db } from '@/lib/db';
import { transactions, products } from '@/lib/db/pg-schema';
import { polarCustomer } from '@/lib/db/auth-schema';
import { eq, desc } from 'drizzle-orm';

interface TransactionWithProduct {
    id: string;
    userId: string;
    productId: string | null;
    polarOrderId: string | null;
    amountCents: number;
    currency: string | null;
    status: string;
    createdAt: number;
    productName?: string;
}

export async function GET() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // Check if user has a polar customer record
        const customer = await db
            .select()
            .from(polarCustomer)
            .where(eq(polarCustomer.userId, userId))
            .limit(1);

        if (!customer.length) {
            return NextResponse.json({ transactions: [] });
        }

        // Get transactions
        const userTx = await db
            .select()
            .from(transactions)
            .where(eq(transactions.userId, userId))
            .orderBy(desc(transactions.createdAt))
            .limit(10);

        // Get product names for transactions
        const txWithProducts: TransactionWithProduct[] = await Promise.all(
            userTx.map(async (tx) => {
                let productName = 'Unknown Product';
                if (tx.productId) {
                    const [product] = await db
                        .select()
                        .from(products)
                        .where(eq(products.id, tx.productId))
                        .limit(1);
                    if (product) {
                        productName = product.name;
                    }
                }
                return { ...tx, productName };
            })
        );

        return NextResponse.json({ transactions: txWithProducts });
    } catch (error) {
        console.error('[Billing API] Error fetching transactions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
