'use client';

/**
 * Products Table Component
 *
 * Client component for displaying and editing products.
 * Allows updating Polar product IDs and toggling active status.
 */

import { useState } from 'react';
import { Check, X, Edit2, Save, Loader2 } from 'lucide-react';

interface Product {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    polarProductId: string;
    priceCents: number;
    billingInterval: string;
    features: string | null;
    isActive: boolean | null;
    displayOrder: number | null;
    createdAt: number;
    updatedAt: number;
}

interface ProductsTableProps {
    products: Product[];
}

export function ProductsTable({ products: initialProducts }: ProductsTableProps) {
    const [products, setProducts] = useState(initialProducts);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const startEditing = (product: Product) => {
        setEditingId(product.id);
        setEditValue(product.polarProductId);
        setError(null);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditValue('');
        setError(null);
    };

    const saveProduct = async (productId: string) => {
        setSaving(productId);
        setError(null);

        try {
            const response = await fetch('/api/admin/products', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: productId,
                    polarProductId: editValue,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update product');
            }

            // Update local state
            setProducts(products.map(p =>
                p.id === productId ? { ...p, polarProductId: editValue } : p
            ));
            setEditingId(null);
            setEditValue('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSaving(null);
        }
    };

    const toggleActive = async (product: Product) => {
        setSaving(product.id);
        setError(null);

        try {
            const response = await fetch('/api/admin/products', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: product.id,
                    isActive: !product.isActive,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update product');
            }

            // Update local state
            setProducts(products.map(p =>
                p.id === product.id ? { ...p, isActive: !p.isActive } : p
            ));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to toggle');
        } finally {
            setSaving(null);
        }
    };

    const formatPrice = (cents: number) => {
        return `$${(cents / 100).toFixed(2)}`;
    };

    return (
        <div className="sitewise-card overflow-hidden">
            {error && (
                <div className="border-b border-[var(--sw-rule)] bg-[var(--sw-rose-tint)] px-4 py-2 text-sm text-[var(--sw-rose-dk)]">
                    {error}
                </div>
            )}
            <table className="w-full">
                <thead className="border-b border-[var(--sw-rule-2)]">
                    <tr>
                        <th className="px-4 py-3 text-left">Product</th>
                        <th className="px-4 py-3 text-left">Price</th>
                        <th className="px-4 py-3 text-left">Polar Product ID</th>
                        <th className="px-4 py-3 text-left">Active</th>
                        <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((product) => (
                        <tr
                            key={product.id}
                            className="border-b border-[var(--sw-rule-2)] last:border-0"
                        >
                            <td className="px-4 py-4">
                                <div>
                                    <div className="font-medium text-[var(--sw-ink)]">{product.name}</div>
                                    <div className="font-mono text-xs text-[var(--sw-muted)]">{product.slug}</div>
                                </div>
                            </td>
                            <td className="px-4 py-4">
                                <div className="font-medium text-[var(--sw-ink)]">{formatPrice(product.priceCents)}</div>
                                <div className="font-mono text-xs text-[var(--sw-muted)]">/{product.billingInterval}</div>
                            </td>
                            <td className="px-4 py-4">
                                {editingId === product.id ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="w-64 border px-2 py-1 text-sm"
                                            placeholder="prod_..."
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => saveProduct(product.id)}
                                            disabled={saving === product.id}
                                            className="sitewise-icon-button text-[#4b653c]"
                                        >
                                            {saving === product.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Save className="h-4 w-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={cancelEditing}
                                            className="sitewise-icon-button"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <code className={`sitewise-code ${
                                            product.polarProductId.startsWith('REPLACE')
                                                ? 'bg-[var(--sw-rose-tint)] text-[var(--sw-rose-dk)]'
                                                : 'text-[var(--sw-muted)]'
                                        }`}>
                                            {product.polarProductId}
                                        </code>
                                        <button
                                            onClick={() => startEditing(product)}
                                            className="sitewise-icon-button"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </td>
                            <td className="px-4 py-4">
                                <button
                                    onClick={() => toggleActive(product)}
                                    disabled={saving === product.id}
                                    className={`sitewise-chip ${
                                        product.isActive
                                            ? 'sitewise-chip-green'
                                            : 'text-[var(--sw-muted)]'
                                    }`}
                                >
                                    {saving === product.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : product.isActive ? (
                                        <Check className="h-3 w-3" />
                                    ) : (
                                        <X className="h-3 w-3" />
                                    )}
                                    {product.isActive ? 'Active' : 'Inactive'}
                                </button>
                            </td>
                            <td className="px-4 py-4">
                                <a
                                    href={`https://polar.sh`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-xs text-[var(--sw-rose-dk)] hover:underline"
                                >
                                    View in Polar
                                </a>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
