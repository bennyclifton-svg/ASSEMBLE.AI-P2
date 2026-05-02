/**
 * Per-project layout. Wraps every /projects/[projectId][/...] page so the
 * ChatDock is available across the whole project workspace (workbench,
 * cost plan, future tabs).
 *
 * Auth check happens here — same pattern as the (dashboard) route group.
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ChatDockMount } from '@/components/chat/ChatDockMount';
import { ChatViewContextProvider } from '@/lib/contexts/chat-view-context';

export default async function ProjectLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const session = cookieStore.get('better-auth.session_token');
    if (!session) {
        redirect('/login');
    }

    return (
        <ChatViewContextProvider>
            {children}
            <ChatDockMount />
        </ChatViewContextProvider>
    );
}
