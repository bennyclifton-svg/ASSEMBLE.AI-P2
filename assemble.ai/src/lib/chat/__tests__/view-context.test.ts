import {
    formatChatViewContextForPrompt,
    sanitizeChatViewContext,
    selectedDocumentIdsFromViewContext,
} from '../view-context';

describe('chat view context', () => {
    it('sanitizes and dedupes selected document ids', () => {
        const context = sanitizeChatViewContext(
            {
                projectId: 'project-1',
                route: '/projects/project-1',
                selectedEntityIds: {
                    document: ['doc-1', 'doc-1', '  doc-2  ', '', 123],
                },
            },
            'fallback-project'
        );

        expect(selectedDocumentIdsFromViewContext(context)).toEqual(['doc-1', 'doc-2']);
    });

    it('labels selected documents as authoritative current app context', () => {
        const prompt = formatChatViewContextForPrompt({
            projectId: 'project-1',
            route: '/projects/project-1?tab=notes',
            pendingApprovalIds: [],
            recentlyViewedIds: [],
            selectedEntityIds: {
                document: ['hyd-1', 'hyd-2'],
                stakeholder: ['stakeholder-1'],
            },
        });

        expect(prompt).toContain(
            'Current selected document ids (authoritative for "selection", "selected set", or "selected documents"; use these before older chat context): hyd-1, hyd-2'
        );
        expect(prompt).toContain('Selected stakeholder ids: stakeholder-1');
        expect(prompt).not.toContain('Selected document ids: hyd-1, hyd-2');
    });

    it('keeps larger document selections intact for drawing-set actions', () => {
        const documentIds = Array.from({ length: 30 }, (_, index) => `doc-${index + 1}`);
        const context = sanitizeChatViewContext(
            {
                projectId: 'project-1',
                route: '/projects/project-1',
                selectedEntityIds: {
                    document: documentIds,
                    stakeholder: Array.from({ length: 30 }, (_, index) => `stakeholder-${index + 1}`),
                },
            },
            'fallback-project'
        );

        expect(selectedDocumentIdsFromViewContext(context)).toHaveLength(30);
        expect(context.selectedEntityIds?.stakeholder).toHaveLength(25);
    });
});
