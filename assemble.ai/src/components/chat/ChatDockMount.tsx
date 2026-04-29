'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { ChatDock } from './ChatDock';

/**
 * Renders ChatDock only on routes that are scoped to a single project.
 * Reads the projectId from the URL — /projects/[projectId][/...].
 *
 * Hidden on /admin, /dashboard, /projects (list), and unauthenticated pages.
 */
export function ChatDockMount() {
    const pathname = usePathname();
    const projectId = useMemo(() => {
        if (!pathname) return null;
        const match = pathname.match(/^\/projects\/([^/]+)(?:\/|$)/);
        if (!match) return null;
        const candidate = match[1];
        // Skip the "new" sub-route under /projects/new
        if (candidate === 'new') return null;
        return candidate;
    }, [pathname]);

    if (!projectId) return null;
    return <ChatDock projectId={projectId} />;
}
