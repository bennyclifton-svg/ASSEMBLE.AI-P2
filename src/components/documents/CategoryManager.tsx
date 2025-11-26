'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface Category {
    id: string;
    name: string;
    subcategories: Subcategory[];
}

interface Subcategory {
    id: string;
    name: string;
}

interface CategoryManagerProps {
    selectedIds: string[];
    onComplete: () => void;
    onCancel: () => void;
}

export function CategoryManager({ selectedIds, onComplete, onCancel }: CategoryManagerProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch('/api/categories');
                if (res.ok) {
                    const data = await res.json();
                    setCategories(data);
                }
            } catch (error) {
                console.error('Failed to fetch categories', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, []);

    const handleSave = async () => {
        if (!selectedCategory) return;

        setSaving(true);
        try {
            const res = await fetch('/api/documents/bulk', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentIds: selectedIds,
                    updates: {
                        categoryId: selectedCategory,
                        subcategoryId: selectedSubcategory || null,
                    },
                }),
            });

            if (res.ok) {
                onComplete();
            } else {
                console.error('Failed to update documents');
            }
        } catch (error) {
            console.error('Error updating documents', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;
    }

    const activeSubcategories = categories.find(c => c.id === selectedCategory)?.subcategories || [];

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={selectedCategory}
                    onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setSelectedSubcategory('');
                    }}
                >
                    <option value="">Select a category...</option>
                    {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Subcategory</label>
                <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                    value={selectedSubcategory}
                    onChange={(e) => setSelectedSubcategory(e.target.value)}
                    disabled={!selectedCategory || activeSubcategories.length === 0}
                >
                    <option value="">Select a subcategory...</option>
                    {activeSubcategories.map((sub) => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                </select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
                <Button onClick={handleSave} disabled={!selectedCategory || saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Apply to {selectedIds.length} documents
                </Button>
            </div>
        </div>
    );
}
