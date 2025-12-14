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
    // Check for session cookie (basic auth check)
    const cookieStore = await cookies();
    const session = cookieStore.get('session');

    if (!session) {
        redirect('/login');
    }

    return <>{children}</>;
}
