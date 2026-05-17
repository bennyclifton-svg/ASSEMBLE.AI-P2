export interface WorkspaceProject {
    organizationId: string | null;
}

export function projectBelongsToWorkspace(
    project: WorkspaceProject,
    organizationId: string | null | undefined
): boolean {
    return Boolean(organizationId) && project.organizationId === organizationId;
}

export function filterProjectsForWorkspace<T extends WorkspaceProject>(
    projects: T[],
    organizationId: string | null | undefined
): T[] {
    if (!organizationId) return [];
    return projects.filter((project) => projectBelongsToWorkspace(project, organizationId));
}

export async function getProjectForWorkspace(
    projectId: string,
    organizationId: string | null | undefined
): Promise<WorkspaceProject | null> {
    if (!organizationId) return null;

    const [{ db, projects }, { and, eq }] = await Promise.all([
        import('@/lib/db'),
        import('drizzle-orm'),
    ]);

    const [project] = await db
        .select({ id: projects.id, organizationId: projects.organizationId })
        .from(projects)
        .where(and(
            eq(projects.id, projectId),
            eq(projects.organizationId, organizationId)
        ))
        .limit(1);

    return project ?? null;
}
