/**
 * @jest-environment node
 */

jest.mock('../_context', () => ({
    assertProjectOrg: jest.fn(),
    CrossTenantAccessError: class CrossTenantAccessError extends Error {},
}));
jest.mock('@/lib/rag/retrieval', () => ({
    retrieveFromDomains: jest.fn(),
}));
jest.mock('@/lib/rag/seed-knowledge-retrieval', () => ({
    retrieveSeedKnowledgeFallback: jest.fn(),
}));

import { retrieveFromDomains } from '@/lib/rag/retrieval';
import { retrieveSeedKnowledgeFallback } from '@/lib/rag/seed-knowledge-retrieval';
import { searchKnowledgeLibraryTool } from '../search-knowledge-library';
import type { ToolContext } from '../_context';

const mockedRetrieveFromDomains = jest.mocked(retrieveFromDomains);
const mockedRetrieveSeedKnowledgeFallback = jest.mocked(retrieveSeedKnowledgeFallback);

const ctx: ToolContext = {
    userId: 'user-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    threadId: 'thread-1',
    runId: 'run-1',
};

describe('search_knowledge_library.execute', () => {
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('falls back to local seed knowledge when domain retrieval is unavailable', async () => {
        mockedRetrieveFromDomains.mockRejectedValue(new Error('relation "document_sets" does not exist'));
        mockedRetrieveSeedKnowledgeFallback.mockReturnValue([
            {
                id: 'domain-program-scheduling:1',
                content: 'Milestone programmes should include authority approval and certification gates.',
                sectionTitle: 'Milestone Planning and Tracking',
                domainSlug: 'domain-program-scheduling',
                domainName: 'Program & Scheduling Guide',
                domainTags: ['programming', 'milestones'],
                sourceVersion: '1.0.0',
                relevanceScore: 0.75,
            },
        ]);

        const output = await searchKnowledgeLibraryTool.execute(ctx, {
            query: 'construction certificate programme milestones',
            tags: ['programming', 'milestones'],
            maxResults: 3,
        });

        expect(output.resultCount).toBe(1);
        expect(output.results[0]).toEqual(
            expect.objectContaining({
                domainName: 'Program & Scheduling Guide',
                sectionTitle: 'Milestone Planning and Tracking',
            })
        );
        expect(mockedRetrieveSeedKnowledgeFallback).toHaveBeenCalledWith(
            'construction certificate programme milestones',
            expect.objectContaining({
                domainTags: ['programming', 'milestones'],
                topK: 3,
            })
        );
    });
});
