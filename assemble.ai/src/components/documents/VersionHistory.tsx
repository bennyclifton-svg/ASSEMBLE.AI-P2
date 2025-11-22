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
import { Loader2, History } from 'lucide-react';

interface Version {
    id: string;
    versionNumber: number;
    createdAt: string;
    uploadedBy: string;
    originalName: string;
    sizeBytes: number;
}

interface VersionHistoryProps {
    documentId: string;
}

export function VersionHistory({ documentId }: VersionHistoryProps) {
    const [versions, setVersions] = useState<Version[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVersions = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/documents/${documentId}/versions`);
                if (res.ok) {
                    const data = await res.json();
                    setVersions(data);
                }
            } catch (error) {
                console.error('Failed to fetch versions', error);
            } finally {
                setLoading(false);
            }
        };

        if (documentId) {
            fetchVersions();
        }
    }, [documentId]);

    if (loading) {
        return <div className="flex justify-center p-4"><Loader2 className="animate-spin h-4 w-4" /></div>;
    }

    if (versions.length === 0) {
        return <div className="text-center p-4 text-muted-foreground">No version history found.</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <History className="h-4 w-4" />
                Version History
            </div>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">Version</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Uploaded By</TableHead>
                            <TableHead>File Name</TableHead>
                            <TableHead className="text-right">Size</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {versions.map((v) => (
                            <TableRow key={v.id}>
                                <TableCell className="font-medium">v{v.versionNumber}</TableCell>
                                <TableCell>{new Date(v.createdAt).toLocaleDateString()} {new Date(v.createdAt).toLocaleTimeString()}</TableCell>
                                <TableCell>{v.uploadedBy}</TableCell>
                                <TableCell>{v.originalName}</TableCell>
                                <TableCell className="text-right">{(v.sizeBytes / 1024 / 1024).toFixed(2)} MB</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
