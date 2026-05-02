/**
 * Admin Products Page
 *
 * Manage subscription products and their Polar product IDs.
 * This allows different product IDs for sandbox vs production environments.
 */

import { db } from '@/lib/db';
import { products } from '@/lib/db/pg-schema';
import { asc } from 'drizzle-orm';
import { ProductsTable } from './ProductsTable';

async function getProducts() {
    try {
        const allProducts = await db
            .select()
            .from(products)
            .orderBy(asc(products.displayOrder));
        return allProducts;
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

export default async function AdminProductsPage() {
    const productList = await getProducts();

    return (
        <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Product Management</h1>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    Manage subscription products and their Polar product IDs.
                </p>
            </div>

            {/* Info Box */}
            <div className="mb-8 rounded-lg border border-[var(--color-accent-primary)] bg-[var(--color-accent-primary-tint)] p-4">
                <h3 className="font-medium text-[var(--color-text-primary)]">How to set up products</h3>
                <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-[var(--color-text-secondary)]">
                    <li>Create products in your <a href="https://polar.sh" target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent-primary)] hover:underline">Polar dashboard</a></li>
                    <li>Copy the product ID from Polar (starts with <code className="rounded bg-[var(--color-bg-primary)] px-1 text-[var(--color-text-primary)]">prod_</code>)</li>
                    <li>Paste the product ID below for the corresponding plan</li>
                    <li>Use different product IDs for sandbox vs production</li>
                </ol>
            </div>

            {/* Products Table */}
            {productList.length === 0 ? (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-8 text-center">
                    <p className="text-[var(--color-text-secondary)]">No products found.</p>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                        Run the database migration to create initial products:
                    </p>
                    <code className="mt-2 block rounded bg-[var(--color-bg-tertiary)] p-2 text-sm text-[var(--color-text-primary)]">
                        npx drizzle-kit push
                    </code>
                </div>
            ) : (
                <ProductsTable products={productList} />
            )}

            {/* Environment Info */}
            <div className="mt-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                <h3 className="font-medium text-[var(--color-text-primary)]">Current Environment</h3>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-[var(--color-text-secondary)]">Mode:</span>{' '}
                        <span className={process.env.NODE_ENV === 'production' ? 'text-green-300' : 'text-yellow-300'}>
                            {process.env.NODE_ENV === 'production' ? 'Production' : 'Sandbox'}
                        </span>
                    </div>
                    <div>
                        <span className="text-[var(--color-text-secondary)]">Polar Configured:</span>{' '}
                        <span className={process.env.POLAR_ACCESS_TOKEN ? 'text-green-300' : 'text-red-300'}>
                            {process.env.POLAR_ACCESS_TOKEN ? 'Yes' : 'No'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
