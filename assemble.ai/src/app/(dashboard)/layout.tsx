/**
 * Dashboard Layout
 * Layout for authenticated pages (requires login)
 * Wraps existing LandingLayout functionality
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Check for Better Auth session cookie
    const cookieStore = await cookies();
    const session = cookieStore.get('better-auth.session_token');

    if (!session) {
        redirect('/login');
    }

    return <>{children}</>;
}
