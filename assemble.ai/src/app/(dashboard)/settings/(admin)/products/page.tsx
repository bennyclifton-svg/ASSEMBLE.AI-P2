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
        <div className="sitewise-page-frame">
            <div className="sitewise-page-header">
                <div>
                    <div className="sitewise-page-kicker">admin / products</div>
                    <h1 className="mt-2">Products</h1>
                    <p className="sitewise-page-subtitle">
                        Manage subscription products, plan availability, and Polar product IDs.
                    </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                    <span className="sitewise-status-pill">{productList.length} products</span>
                    <span className="sitewise-status-pill sitewise-status-pill-dark">
                        {process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'}
                    </span>
                </div>
            </div>

            {/* Info Box */}
            <div className="sitewise-info-card mb-8 p-4">
                <h3>How to set up products</h3>
                <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-[var(--sw-ink)]">
                    <li>Create products in your <a href="https://polar.sh" target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent-primary)] hover:underline">Polar dashboard</a></li>
                    <li>Copy the product ID from Polar (starts with <code className="sitewise-code">prod_</code>)</li>
                    <li>Paste the product ID below for the corresponding plan</li>
                    <li>Use different product IDs for sandbox vs production</li>
                </ol>
            </div>

            {/* Products Table */}
            {productList.length === 0 ? (
                <div className="sitewise-card p-8 text-center">
                    <p className="text-[var(--sw-muted)]">No products found.</p>
                    <p className="mt-2 text-sm text-[var(--sw-muted)]">
                        Run the database migration to create initial products:
                    </p>
                    <code className="sitewise-code mt-2 block p-2">
                        npx drizzle-kit push
                    </code>
                </div>
            ) : (
                <ProductsTable products={productList} />
            )}

            {/* Environment Info */}
            <div className="sitewise-card mt-8 p-4">
                <div className="sitewise-section-label">Current Environment</div>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-[var(--sw-muted)]">Mode:</span>{' '}
                        <span className={process.env.NODE_ENV === 'production' ? 'text-[#4b653c]' : 'text-[#8a5a16]'}>
                            {process.env.NODE_ENV === 'production' ? 'Production' : 'Sandbox'}
                        </span>
                    </div>
                    <div>
                        <span className="text-[var(--sw-muted)]">Polar Configured:</span>{' '}
                        <span className={process.env.POLAR_ACCESS_TOKEN ? 'text-[#4b653c]' : 'text-[var(--sw-rose-dk)]'}>
                            {process.env.POLAR_ACCESS_TOKEN ? 'Yes' : 'No'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
