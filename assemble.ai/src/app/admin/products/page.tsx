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
                <h1 className="text-2xl font-bold">Product Management</h1>
                <p className="mt-1 text-gray-400">
                    Manage subscription products and their Polar product IDs.
                </p>
            </div>

            {/* Info Box */}
            <div className="mb-8 rounded-lg border border-blue-800 bg-blue-950/30 p-4">
                <h3 className="font-medium text-blue-300">How to set up products</h3>
                <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-gray-300">
                    <li>Create products in your <a href="https://polar.sh" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Polar dashboard</a></li>
                    <li>Copy the product ID from Polar (starts with <code className="rounded bg-gray-800 px-1">prod_</code>)</li>
                    <li>Paste the product ID below for the corresponding plan</li>
                    <li>Use different product IDs for sandbox vs production</li>
                </ol>
            </div>

            {/* Products Table */}
            {productList.length === 0 ? (
                <div className="rounded-lg border border-gray-800 bg-[#252526] p-8 text-center">
                    <p className="text-gray-400">No products found.</p>
                    <p className="mt-2 text-sm text-gray-500">
                        Run the database migration to create initial products:
                    </p>
                    <code className="mt-2 block rounded bg-gray-800 p-2 text-sm">
                        npx drizzle-kit push
                    </code>
                </div>
            ) : (
                <ProductsTable products={productList} />
            )}

            {/* Environment Info */}
            <div className="mt-8 rounded-lg border border-gray-800 bg-[#252526] p-4">
                <h3 className="font-medium">Current Environment</h3>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-400">Mode:</span>{' '}
                        <span className={process.env.NODE_ENV === 'production' ? 'text-green-400' : 'text-yellow-400'}>
                            {process.env.NODE_ENV === 'production' ? 'Production' : 'Sandbox'}
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-400">Polar Configured:</span>{' '}
                        <span className={process.env.POLAR_ACCESS_TOKEN ? 'text-green-400' : 'text-red-400'}>
                            {process.env.POLAR_ACCESS_TOKEN ? 'Yes' : 'No'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
