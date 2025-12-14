/**
 * Dashboard Home Page
 * Main landing page for authenticated users
 * Redirects to the first project or shows project selection
 */

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users, sessions, projects } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { hashToken } from '@/lib/auth/session';
import Link from 'next/link';

async function getProjectsForUser() {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
        return null;
    }

    // Get user from session
    const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.tokenHash, hashToken(sessionToken)))
        .limit(1);

    if (!session) {
        return null;
    }

    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

    if (!user?.organizationId) {
        return [];
    }

    // Get user's projects
    const userProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.organizationId, user.organizationId))
        .orderBy(desc(projects.updatedAt));

    return userProjects;
}

export default async function DashboardPage() {
    const userProjects = await getProjectsForUser();

    // If user has projects, redirect to the first one
    if (userProjects && userProjects.length > 0) {
        redirect(`/projects/${userProjects[0].id}`);
    }

    // If no projects, show welcome screen
    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-8">
                <h1 className="text-3xl font-bold text-white mb-4">
                    Welcome to Assemble.ai
                </h1>
                <p className="text-gray-400 mb-8">
                    You don&apos;t have any projects yet. Create your first project to get started.
                </p>
                <Link
                    href="/projects/new"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Create Your First Project
                </Link>
            </div>
        </div>
    );
}
