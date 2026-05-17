/**
 * /api/admin/storage/browse
 *
 * GET - list subdirectories at a given filesystem path so the admin storage
 *       page can render a folder picker. Super-admin only.
 *
 * Query: ?path=<absolute-or-relative-path>   (optional, defaults to home dir)
 */

import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import path from 'path';
import os from 'os';
import { requireSuperAdminApi } from '@/lib/admin/guard';

export async function GET(req: Request) {
    try {
        await requireSuperAdminApi();
    } catch (response) {
        return response as Response;
    }

    const url = new URL(req.url);
    const queryPath = url.searchParams.get('path');
    const resolved =
        queryPath && queryPath.trim() ? path.resolve(queryPath.trim()) : os.homedir();

    try {
        const dirents = await readdir(resolved, { withFileTypes: true });
        const entries = dirents
            .filter((d) => d.isDirectory())
            .map((d) => ({ name: d.name, path: path.join(resolved, d.name) }))
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

        const root = path.parse(resolved).root;
        const isRoot = resolved === root;

        return NextResponse.json({
            path: resolved,
            parent: isRoot ? null : path.dirname(resolved),
            isRoot,
            entries,
            home: os.homedir(),
            separator: path.sep,
        });
    } catch (error) {
        return NextResponse.json(
            {
                path: resolved,
                parent: null,
                isRoot: false,
                entries: [],
                home: os.homedir(),
                separator: path.sep,
                error: error instanceof Error ? error.message : 'Could not open folder',
            },
            { status: 400 }
        );
    }
}
