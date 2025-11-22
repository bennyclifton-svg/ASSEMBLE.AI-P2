'use client';

import React, { useEffect, useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Transmittal {
    id: string;
    name: string;
    status: string;
    issuedAt: string | null;
    createdAt: string;
    subcategoryName: string | null;
}

export function TransmittalsList() {
    const [transmittals, setTransmittals] = useState<Transmittal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTransmittals();
    }, []);

    const fetchTransmittals = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/transmittals');
            if (res.ok) {
                const data = await res.json();
                setTransmittals(data);
            }
        } catch (error) {
            console.error('Failed to fetch transmittals', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (id: string, name: string) => {
        // Trigger download
        window.open(`/api/transmittals/${id}/export`, '_blank');
    };

    if (loading && transmittals.length === 0) {
        return (
            <div className="space-y-4">
                <div className="border rounded-md p-4 space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-[200px]" />
                                <Skeleton className="h-4 w-[150px]" />
                            </div>
                            <Skeleton className="h-8 w-[100px]" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (transmittals.length === 0) {
        return <div className="text-center p-8 text-muted-foreground">No transmittals created yet.</div>;
    }

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Subcategory</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transmittals.map((t) => (
                        <TableRow key={t.id}>
                            <TableCell className="font-medium">{t.name}</TableCell>
                            <TableCell>{t.subcategoryName || '-'}</TableCell>
                            <TableCell>
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${t.status === 'ISSUED'
                                    ? 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80'
                                    : 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                    }`}>
                                    {t.status}
                                </span>
                            </TableCell>
                            <TableCell>{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleDownload(t.id, t.name)}>
                                        <Download className="h-4 w-4 mr-2" />
                                        Download
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
