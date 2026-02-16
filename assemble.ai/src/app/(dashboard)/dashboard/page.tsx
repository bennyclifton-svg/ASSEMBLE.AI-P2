/**
 * Dashboard Home Page
 * Redirects authenticated users to their first project or to /projects
 */

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { projects } from '@/lib/db';
import { user as userTable } from '@/lib/db/auth-schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@/lib/better-auth';

async function getProjectsForUser() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return null;
        }

        const [user] = await db
            .select()
            .from(userTable)
            .where(eq(userTable.id, session.user.id))
            .limit(1);

        if (!user?.organizationId) {
            return [];
        }

        const userProjects = await db
            .select()
            .from(projects)
            .where(eq(projects.organizationId, user.organizationId))
            .orderBy(desc(projects.updatedAt));

        return userProjects;
    } catch (error) {
        console.error('Error getting projects:', error);
        return null;
    }
}

export default async function DashboardPage() {
    const userProjects = await getProjectsForUser();

    if (userProjects && userProjects.length > 0) {
        redirect(`/projects/${userProjects[0].id}`);
    }

    // No projects — go to the project dashboard empty state
    redirect('/projects');
}
