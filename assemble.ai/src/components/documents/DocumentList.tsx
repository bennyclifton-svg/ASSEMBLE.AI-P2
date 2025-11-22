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
import { FileIcon, Loader2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { VersionHistory } from './VersionHistory';

interface Document {
    id: string;
    originalName: string;
    versionNumber: number;
    sizeBytes: number;
    updatedAt: string;
    categoryId?: string;
}

export function DocumentList({ refreshTrigger }: { refreshTrigger: number }) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

    useEffect(() => {
        fetchDocuments();
    }, [refreshTrigger]);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/documents');
            if (res.ok) {
                const data = await res.json();
                setDocuments(data);
            }
        } catch (error) {
            console.error('Failed to fetch documents', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && documents.length === 0) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    if (documents.length === 0) {
        return <div className="text-center p-8 text-muted-foreground">No documents uploaded yet.</div>;
    }

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {documents.map((doc) => (
                        <TableRow key={doc.id}>
                            <TableCell className="font-medium flex items-center gap-2">
                                <FileIcon className="h-4 w-4 text-blue-500" />
                                {doc.originalName || 'Untitled'}
                            </TableCell>
                            <TableCell>
                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                    v{doc.versionNumber}
                                </span>
                            </TableCell>
                            <TableCell>{(doc.sizeBytes / 1024 / 1024).toFixed(2)} MB</TableCell>
                            <TableCell>{new Date(doc.updatedAt).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => setSelectedDocId(doc.id)}>
                                    <History className="h-4 w-4 mr-2" />
                                    History
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Modal
                isOpen={!!selectedDocId}
                onClose={() => setSelectedDocId(null)}
                title="Document History"
                className="max-w-3xl"
            >
                {selectedDocId && <VersionHistory documentId={selectedDocId} />}
            </Modal>
        </div>
    );
}
