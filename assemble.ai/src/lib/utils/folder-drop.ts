// Recursive folder-aware file extraction for drag-and-drop events.
// Browsers deliver a dropped folder as a zero-byte File; this walks the
// DataTransferItem entries via webkitGetAsEntry() and returns a flat File[].
// Shape matches react-dropzone's `getFilesFromEvent` option.

import type React from 'react';

type FileSystemEntryLike = {
    isFile: boolean;
    isDirectory: boolean;
    name: string;
    file?: (cb: (file: File) => void, err?: (e: unknown) => void) => void;
    createReader?: () => {
        readEntries: (
            cb: (entries: FileSystemEntryLike[]) => void,
            err?: (e: unknown) => void,
        ) => void;
    };
};

function readEntry(entry: FileSystemEntryLike): Promise<File[]> {
    if (entry.isFile && entry.file) {
        return new Promise<File[]>((resolve) => {
            entry.file!(
                (file) => resolve([file]),
                () => resolve([]),
            );
        });
    }
    if (entry.isDirectory && entry.createReader) {
        const reader = entry.createReader();
        const collected: FileSystemEntryLike[] = [];
        const drain = (): Promise<FileSystemEntryLike[]> =>
            new Promise((resolve) => {
                reader.readEntries(
                    (batch) => {
                        if (batch.length === 0) {
                            resolve(collected);
                        } else {
                            collected.push(...batch);
                            drain().then(resolve);
                        }
                    },
                    () => resolve(collected),
                );
            });
        return drain().then(async (entries) => {
            const nested = await Promise.all(entries.map(readEntry));
            return nested.flat();
        });
    }
    return Promise.resolve([]);
}

type AnyDropEvent =
    | DragEvent
    | Event
    | React.DragEvent<HTMLElement>
    | React.ChangeEvent<HTMLInputElement>
    | Array<FileSystemFileHandle>;

export async function getFilesFromDropEvent(event: AnyDropEvent): Promise<File[]> {
    if (Array.isArray(event)) {
        const handles = event as FileSystemFileHandle[];
        const files = await Promise.all(handles.map((h) => h.getFile().catch(() => null)));
        return files.filter((f): f is File => f !== null);
    }
    const native = (event as React.SyntheticEvent).nativeEvent ?? (event as Event);
    const dt = (native as DragEvent).dataTransfer;
    if (dt && dt.items && dt.items.length > 0) {
        const entries: FileSystemEntryLike[] = [];
        const directFiles: File[] = [];
        for (let i = 0; i < dt.items.length; i++) {
            const item = dt.items[i];
            if (item.kind !== 'file') continue;
            const getAsEntry = (item as DataTransferItem & {
                webkitGetAsEntry?: () => FileSystemEntryLike | null;
            }).webkitGetAsEntry?.bind(item);
            const entry = getAsEntry?.();
            if (entry) {
                entries.push(entry);
            } else {
                const f = item.getAsFile();
                if (f) directFiles.push(f);
            }
        }
        const nested = await Promise.all(entries.map(readEntry));
        return [...directFiles, ...nested.flat()];
    }
    const target = (native as Event).target as HTMLInputElement | null;
    if (target && target.files) {
        return Array.from(target.files);
    }
    if (dt && dt.files) {
        return Array.from(dt.files);
    }
    return [];
}
