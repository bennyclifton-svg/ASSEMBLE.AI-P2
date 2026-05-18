import {
    filterProjectsForWorkspace,
    projectBelongsToWorkspace,
} from '../workspace-access';

describe('workspace project access', () => {
    it('keeps project lists scoped to the current workspace', () => {
        const projects = [
            { id: 'project-1', organizationId: 'org-1' },
            { id: 'project-2', organizationId: 'org-2' },
            { id: 'project-3', organizationId: 'org-1' },
            { id: 'project-4', organizationId: null },
        ];

        expect(filterProjectsForWorkspace(projects, 'org-1')).toEqual([
            { id: 'project-1', organizationId: 'org-1' },
            { id: 'project-3', organizationId: 'org-1' },
        ]);
    });

    it('does not allow project selection across workspaces', () => {
        expect(projectBelongsToWorkspace({ organizationId: 'org-2' }, 'org-1')).toBe(false);
        expect(projectBelongsToWorkspace({ organizationId: 'org-1' }, 'org-1')).toBe(true);
        expect(projectBelongsToWorkspace({ organizationId: 'org-1' }, null)).toBe(false);
    });
});
