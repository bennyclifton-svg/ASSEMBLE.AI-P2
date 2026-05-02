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
        <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            {error && (
                <div className="border-b border-red-800/60 bg-red-950/40 px-4 py-2 text-sm text-red-300">
                    {error}
                </div>
            )}
            <table className="w-full">
                <thead className="border-b border-[var(--color-border)]">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Polar Product ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Active</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((product) => (
                        <tr
                            key={product.id}
                            className="border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-bg-hover)]"
                        >
                            <td className="px-4 py-4">
                                <div>
                                    <div className="font-medium text-[var(--color-text-primary)]">{product.name}</div>
                                    <div className="text-sm text-[var(--color-text-secondary)]">{product.slug}</div>
                                </div>
                            </td>
                            <td className="px-4 py-4">
                                <div className="font-medium text-[var(--color-text-primary)]">{formatPrice(product.priceCents)}</div>
                                <div className="text-sm text-[var(--color-text-secondary)]">/{product.billingInterval}</div>
                            </td>
                            <td className="px-4 py-4">
                                {editingId === product.id ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="w-64 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent-primary)] focus:outline-none"
                                            placeholder="prod_..."
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => saveProduct(product.id)}
                                            disabled={saving === product.id}
                                            className="rounded p-1 text-[var(--color-accent-green)] hover:bg-[var(--color-accent-green-tint)]"
                                        >
                                            {saving === product.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Save className="h-4 w-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={cancelEditing}
                                            className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <code className={`rounded px-2 py-1 text-sm ${
                                            product.polarProductId.startsWith('REPLACE')
                                                ? 'bg-[var(--color-accent-coral-tint)] text-[var(--color-accent-coral)]'
                                                : 'bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]'
                                        }`}>
                                            {product.polarProductId}
                                        </code>
                                        <button
                                            onClick={() => startEditing(product)}
                                            className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
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
                                    className={`flex items-center gap-1 rounded px-2 py-1 text-sm ${
                                        product.isActive
                                            ? 'bg-[var(--color-accent-green-tint)] text-[var(--color-accent-green)]'
                                            : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]'
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
                                    className="text-sm text-[var(--color-accent-primary)] hover:underline"
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
