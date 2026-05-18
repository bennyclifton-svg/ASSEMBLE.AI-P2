import { aiComplete } from '@/lib/ai/client';
import { assembleContext } from '@/lib/context/orchestrator';
import { fetchAttachedDocuments } from '@/lib/context/modules/attached-documents';
import { getDocumentChunksByIds, retrieve } from '@/lib/rag/retrieval';
import { generateNoteContent } from '../note-content-generation';

jest.mock('@/lib/ai/client', () => ({
    aiComplete: jest.fn(),
}));

jest.mock('@/lib/context/orchestrator', () => ({
    assembleContext: jest.fn(),
}));

jest.mock('@/lib/context/modules/attached-documents', () => ({
    fetchAttachedDocuments: jest.fn(),
}));

jest.mock('@/lib/rag/retrieval', () => ({
    getDocumentChunksByIds: jest.fn(),
    retrieve: jest.fn(),
}));

const mockAiComplete = aiComplete as jest.MockedFunction<typeof aiComplete>;
const mockAssembleContext = assembleContext as jest.MockedFunction<typeof assembleContext>;
const mockFetchAttachedDocuments = fetchAttachedDocuments as jest.MockedFunction<typeof fetchAttachedDocuments>;
const mockGetDocumentChunksByIds = getDocumentChunksByIds as jest.MockedFunction<typeof getDocumentChunksByIds>;
const mockRetrieve = retrieve as jest.MockedFunction<typeof retrieve>;

const attachedDocsResult = {
    moduleName: 'attachedDocuments' as const,
    success: true,
    data: {
        documents: [{
            id: 'doc-1',
            documentId: 'doc-1',
            documentName: 'Consultant Response.pdf',
            categoryName: 'Mechanical',
        }],
        totalCount: 1,
        documentIds: ['doc-1'],
    },
    estimatedTokens: 18,
};

describe('generateNoteContent', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAiComplete.mockResolvedValue({ text: 'Generated from attached document' } as Awaited<ReturnType<typeof aiComplete>>);
    });

    it('uses full attached document chunks for broad document review without project context or RAG', async () => {
        mockFetchAttachedDocuments.mockResolvedValue(attachedDocsResult);
        mockGetDocumentChunksByIds.mockResolvedValue([{
            chunkId: 'chunk-1',
            documentId: 'doc-1',
            content: 'The consultant confirms the rooftop plant noise mitigation proposal.',
            relevanceScore: 1,
            hierarchyLevel: 1,
            hierarchyPath: '1',
            sectionTitle: 'Response',
            clauseNumber: null,
            tokenCount: 16,
            createdAt: null,
        }]);

        const result = await generateNoteContent({
            noteId: 'note-1',
            projectId: 'project-1',
            existingTitle: 'Review note',
            existingContent: 'Review the attached document.',
        });

        expect(result.content).toBe('Generated from attached document');
        expect(result.sourcesUsed).toEqual(expect.objectContaining({
            attachedDocs: 1,
            ragChunks: 0,
            documentChunks: 1,
            sourceMode: 'attached-document',
            usedStagedSummary: false,
        }));
        expect(mockAssembleContext).not.toHaveBeenCalled();
        expect(mockRetrieve).not.toHaveBeenCalled();

        const userMessage = mockAiComplete.mock.calls[0][0].messages[0].content;
        expect(userMessage).toContain('## Attached Document Text');
        expect(userMessage).toContain('rooftop plant noise mitigation');
        expect(userMessage).toContain('Do not use project profile');
        expect(userMessage).not.toContain('Building Class');
    });

    it('preflights large whole-document reviews into section summaries before synthesis', async () => {
        mockFetchAttachedDocuments.mockResolvedValue(attachedDocsResult);
        mockGetDocumentChunksByIds.mockResolvedValue(
            Array.from({ length: 19 }, (_, index) => ({
                chunkId: `chunk-${index + 1}`,
                documentId: 'doc-1',
                content: `Document chunk ${index + 1} exact full text.`,
                relevanceScore: 1,
                hierarchyLevel: 1,
                hierarchyPath: `${index + 1}`,
                sectionTitle: `Section ${index + 1}`,
                clauseNumber: null,
                tokenCount: 1000,
                createdAt: null,
            }))
        );
        mockAiComplete.mockImplementation(async (req) => {
            const prompt = req.messages[0].content;
            return {
                text: prompt.includes('Summarize this portion')
                    ? 'Section summary'
                    : 'Generated from summarized document',
            } as Awaited<ReturnType<typeof aiComplete>>;
        });

        const result = await generateNoteContent({
            noteId: 'note-1',
            projectId: 'project-1',
            existingTitle: 'Large review',
            existingContent: 'Review the attached document.',
        });

        expect(result.content).toBe('Generated from summarized document');
        expect(result.notice).toContain('This document is large');
        expect(result.sourcesUsed).toEqual(expect.objectContaining({
            attachedDocs: 1,
            ragChunks: 0,
            documentChunks: 19,
            sourceMode: 'attached-document-summary',
            estimatedDocumentTokens: 19000,
            usedStagedSummary: true,
        }));

        const calls = mockAiComplete.mock.calls.map(([req]) => req);
        const summaryCalls = calls.filter((req) => req.messages[0].content.includes('Summarize this portion'));
        expect(summaryCalls.length).toBeGreaterThan(1);
        expect(summaryCalls.every((req) => req.maxTokens === 700)).toBe(true);

        const finalCall = calls[calls.length - 1];
        expect(finalCall.maxTokens).toBe(1600);
        expect(finalCall.messages[0].content).toContain('## Attached Document Section Summaries');
        expect(finalCall.messages[0].content).toContain('Section summary');
        expect(finalCall.messages[0].content).not.toContain('Document chunk 1 exact full text');
    });

    it('splits a single oversized document chunk before section summaries', async () => {
        mockFetchAttachedDocuments.mockResolvedValue(attachedDocsResult);
        mockGetDocumentChunksByIds.mockResolvedValue([{
            chunkId: 'chunk-giant',
            documentId: 'doc-1',
            content: Array.from({ length: 120 }, (_, index) => `Oversized paragraph ${index + 1} ${'x '.repeat(400)}`).join('\n\n'),
            relevanceScore: 1,
            hierarchyLevel: 1,
            hierarchyPath: '1',
            sectionTitle: 'Full PDF Text',
            clauseNumber: null,
            tokenCount: 30000,
            createdAt: null,
        }]);
        mockAiComplete.mockImplementation(async (req) => {
            if (req.messages[0].content.length > 30_000) {
                throw new Error('summary request was still too large');
            }
            return {
                text: req.messages[0].content.includes('Summarize this portion')
                    ? 'Section summary'
                    : 'Generated from split summaries',
            } as Awaited<ReturnType<typeof aiComplete>>;
        });

        const result = await generateNoteContent({
            noteId: 'note-1',
            projectId: 'project-1',
            existingTitle: 'Large review',
            existingContent: 'Review the attached document.',
        });

        expect(result.content).toBe('Generated from split summaries');
        expect(result.sourcesUsed).toEqual(expect.objectContaining({
            sourceMode: 'attached-document-summary',
            estimatedDocumentTokens: 30000,
            usedStagedSummary: true,
        }));

        const summaryCalls = mockAiComplete.mock.calls
            .map(([req]) => req)
            .filter((req) => req.messages[0].content.includes('Summarize this portion'));
        expect(summaryCalls.length).toBeGreaterThan(1);
        expect(summaryCalls.every((req) => req.messages[0].content.length <= 30_000)).toBe(true);
    });

    it('does not generate when attached document text is unavailable', async () => {
        mockFetchAttachedDocuments.mockResolvedValue(attachedDocsResult);
        mockGetDocumentChunksByIds.mockResolvedValue([]);

        const result = await generateNoteContent({
            noteId: 'note-1',
            projectId: 'project-1',
            existingContent: 'Summarize the attached document.',
        });

        expect(result.content).toContain('could not retrieve readable text');
        expect(mockAiComplete).not.toHaveBeenCalled();
        expect(mockAssembleContext).not.toHaveBeenCalled();
        expect(mockRetrieve).not.toHaveBeenCalled();
    });

    it('uses attached-document-only RAG for targeted attachment questions', async () => {
        mockFetchAttachedDocuments.mockResolvedValue(attachedDocsResult);
        mockRetrieve.mockResolvedValue([{
            chunkId: 'chunk-2',
            documentId: 'doc-1',
            content: 'Acoustic treatment is required around the rooftop condenser units.',
            relevanceScore: 0.86,
            hierarchyLevel: 1,
            hierarchyPath: '2',
            sectionTitle: 'Acoustic requirements',
            clauseNumber: null,
        }]);

        await generateNoteContent({
            noteId: 'note-1',
            projectId: 'project-1',
            existingContent: 'What acoustic requirements are in the attached document?',
        });

        expect(mockRetrieve).toHaveBeenCalledWith(
            'What acoustic requirements are in the attached document?',
            expect.objectContaining({ documentIds: ['doc-1'] })
        );
        expect(mockGetDocumentChunksByIds).not.toHaveBeenCalled();
        expect(mockAssembleContext).not.toHaveBeenCalled();

        const userMessage = mockAiComplete.mock.calls[0][0].messages[0].content;
        expect(userMessage).toContain('## Retrieved Attached Document Excerpts');
        expect(userMessage).toContain('Acoustic treatment');
        expect(userMessage).toContain('Do not use project profile');
        expect(userMessage).not.toContain('Building Class');
    });
});
