'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Subcategory {
    id: string;
    name: string;
}

interface TransmittalManagerProps {
    selectedIds: string[];
    onComplete: () => void;
    onCancel: () => void;
}

export function TransmittalManager({ selectedIds, onComplete, onCancel }: TransmittalManagerProps) {
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchSubcategories = async () => {
            try {
                // We need subcategories. We can fetch all categories and flatten, or fetch subcategories directly.
                // The /api/categories endpoint returns categories with nested subcategories.
                const res = await fetch('/api/categories');
                if (res.ok) {
                    const data = await res.json();
                    // Flatten subcategories
                    const subs: Subcategory[] = [];
                    data.forEach((cat: any) => {
                        if (cat.subcategories) {
                            subs.push(...cat.subcategories);
                        }
                    });
                    setSubcategories(subs);
                }
            } catch (error) {
                console.error('Failed to fetch subcategories', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSubcategories();
    }, []);

    const handleCreate = async () => {
        if (!name || !selectedSubcategory) return;

        setSaving(true);
        try {
            // 1. Create Transmittal
            const res = await fetch('/api/transmittals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    subcategoryId: selectedSubcategory,
                    documentIds: selectedIds
                }),
            });

            if (res.ok) {
                toast({
                    title: "Transmittal created",
                    description: "Successfully created transmittal.",
                    variant: "success",
                });
                onComplete();
            } else {
                toast({
                    title: "Error",
                    description: "Failed to create transmittal.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error creating transmittal', error);
            toast({
                title: "Error",
                description: "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Transmittal Name</label>
                <input
                    type="text"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="e.g., Tender Package A"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Subcategory</label>
                <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={selectedSubcategory}
                    onChange={(e) => setSelectedSubcategory(e.target.value)}
                >
                    <option value="">Select a subcategory...</option>
                    {subcategories.map((sub) => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                </select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!name || !selectedSubcategory || saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create & Add {selectedIds.length} Documents
                </Button>
            </div>
        </div>
    );
}
