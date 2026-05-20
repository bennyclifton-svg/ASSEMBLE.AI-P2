/**
 * @jest-environment node
 */

import {
    createEmbeddedDocumentChunkRows,
    ingestRagDocument,
    insertDocumentChunkRows,
    parseSeedKnowledgeMarkdown,
    queueRagDocumentForIngestion,
    replaceDocumentChunkRows,
    splitSeedKnowledgeBody,
    updateDocumentSetMemberSyncStatus,
    RAG_SYNC_STATUS,
    type DocumentChunkInsertRow,
} from '../ingestion';
import type { Chunk } from '../chunking';

const baseChunk = (overrides: Partial<Chunk>): Chunk => ({
    id: 'chunk-1',
    content: 'Chunk content',
    hierarchyLevel: 1,
    hierarchyPath: '1',
    sectionTitle: null,
    clauseNumber: null,
    parentId: null,
    tokenCount: 10,
    ...overrides,
});

function makeRagClient() {
    const values = jest.fn().mockResolvedValue(undefined);
    const deleteWhere = jest.fn().mockResolvedValue(undefined);
    const updateWhere = jest.fn().mockResolvedValue(undefined);
    const set = jest.fn(() => ({ where: updateWhere }));

    return {
        insert: jest.fn(() => ({ values })),
        delete: jest.fn(() => ({ where: deleteWhere })),
        update: jest.fn(() => ({ set })),
        values,
        deleteWhere,
        updateWhere,
        set,
    };
}

describe('RAG ingestion module', () => {
    it('creates embedded document chunk rows through one interface', async () => {
        const chunks = [
            baseChunk({ id: 'chunk-1', content: 'First chunk', tokenCount: 3 }),
            baseChunk({ id: 'chunk-2', content: 'Second chunk', tokenCount: 4 }),
        ];
        const embed = jest.fn().mockResolvedValue({
            embeddings: [[0.1, 0.2], [0.3, 0.4]],
            totalTokens: 7,
        });

        const result = await createEmbeddedDocumentChunkRows({
            documentId: 'doc-1',
            content: 'source text',
            chunk: () => chunks,
            embed,
        });

        expect(embed).toHaveBeenCalledWith(['First chunk', 'Second chunk']);
        expect(result).toEqual({
            chunks,
            totalTokens: 7,
            chunkRows: [
                expect.objectContaining({
                    id: 'chunk-1',
                    documentId: 'doc-1',
                    content: 'First chunk',
                    embedding: [0.1, 0.2],
                }),
                expect.objectContaining({
                    id: 'chunk-2',
                    documentId: 'doc-1',
                    content: 'Second chunk',
                    embedding: [0.3, 0.4],
                }),
            ],
        });
    });

    it('does not call the embedder when chunking returns no chunks', async () => {
        const embed = jest.fn();

        const result = await createEmbeddedDocumentChunkRows({
            documentId: 'doc-empty',
            content: '   ',
            chunk: () => [],
            embed,
        });

        expect(embed).not.toHaveBeenCalled();
        expect(result).toEqual({
            chunks: [],
            chunkRows: [],
            totalTokens: 0,
        });
    });

    it('inserts chunk rows in batches', async () => {
        const values = jest.fn().mockResolvedValue(undefined);
        const client = { insert: jest.fn(() => ({ values })) };
        const rows = [
            { id: 'chunk-1' },
            { id: 'chunk-2' },
            { id: 'chunk-3' },
        ] as DocumentChunkInsertRow[];

        const result = await insertDocumentChunkRows(client, rows, 2);

        expect(result).toEqual({ insertedCount: 3 });
        expect(values).toHaveBeenCalledTimes(2);
        expect(values.mock.calls[0][0]).toEqual([{ id: 'chunk-1' }, { id: 'chunk-2' }]);
        expect(values.mock.calls[1][0]).toEqual([{ id: 'chunk-3' }]);
    });

    it('replaces chunk rows for a document before inserting fresh rows', async () => {
        const values = jest.fn().mockResolvedValue(undefined);
        const where = jest.fn().mockResolvedValue(undefined);
        const client = {
            insert: jest.fn(() => ({ values })),
            delete: jest.fn(() => ({ where })),
        };
        const rows = [{ id: 'chunk-1' }] as DocumentChunkInsertRow[];

        const result = await replaceDocumentChunkRows(client, 'doc-1', rows);

        expect(result).toEqual({ insertedCount: 1 });
        expect(client.delete).toHaveBeenCalledTimes(1);
        expect(where).toHaveBeenCalledTimes(1);
        expect(values).toHaveBeenCalledWith(rows);
    });

    it('updates document set member sync status in one place', async () => {
        const where = jest.fn().mockResolvedValue(undefined);
        const set = jest.fn(() => ({ where }));
        const client = { update: jest.fn(() => ({ set })) };

        await updateDocumentSetMemberSyncStatus(client, {
            documentSetId: 'set-1',
            documentId: 'doc-1',
            syncStatus: RAG_SYNC_STATUS.failed,
            errorMessage: 'Parse failed',
        });

        expect(set).toHaveBeenCalledWith({
            syncStatus: RAG_SYNC_STATUS.failed,
            errorMessage: 'Parse failed',
        });
        expect(where).toHaveBeenCalledTimes(1);
    });

    it('runs the document ingestion state machine with fake storage and embedding adapters', async () => {
        const client = makeRagClient();
        const chunks = [
            baseChunk({ id: 'chunk-1', content: 'First chunk', tokenCount: 3 }),
            baseChunk({ id: 'chunk-2', content: 'Second chunk', tokenCount: 4 }),
        ];
        const loadContent = jest.fn().mockResolvedValue('source text');
        const embed = jest.fn().mockResolvedValue({
            embeddings: [[0.1], [0.2]],
            totalTokens: 7,
        });
        const onStage = jest.fn();

        const result = await ingestRagDocument({
            client,
            documentSetId: 'set-1',
            documentId: 'doc-1',
            contentKind: 'project_document',
            loadContent,
            chunk: () => chunks,
            embed,
            onStage,
        });

        expect(result).toMatchObject({
            status: RAG_SYNC_STATUS.synced,
            documentId: 'doc-1',
            documentSetId: 'set-1',
            insertedCount: 2,
            totalTokens: 7,
        });
        expect(loadContent).toHaveBeenCalledTimes(1);
        expect(embed).toHaveBeenCalledWith(['First chunk', 'Second chunk']);
        expect(client.delete).toHaveBeenCalledTimes(1);
        expect(client.values).toHaveBeenCalledWith([
            expect.objectContaining({ id: 'chunk-1', documentId: 'doc-1', embedding: [0.1] }),
            expect.objectContaining({ id: 'chunk-2', documentId: 'doc-1', embedding: [0.2] }),
        ]);
        expect(client.set).toHaveBeenNthCalledWith(1, {
            syncStatus: RAG_SYNC_STATUS.processing,
            errorMessage: null,
            syncedAt: null,
            chunksCreated: 0,
        });
        expect(client.set).toHaveBeenLastCalledWith({
            syncStatus: RAG_SYNC_STATUS.synced,
            errorMessage: null,
            syncedAt: expect.any(Date),
            chunksCreated: 2,
        });
        expect(onStage.mock.calls.map(([event]) => event.stage)).toEqual([
            'processing',
            'loaded',
            'chunked',
            'embedded',
            'persisted',
            'synced',
        ]);
    });

    it('marks ingestion failed when an adapter throws', async () => {
        const client = makeRagClient();
        const chunks = [baseChunk({ id: 'chunk-1', content: 'First chunk', tokenCount: 3 })];

        await expect(
            ingestRagDocument({
                client,
                documentSetId: 'set-1',
                documentId: 'doc-1',
                contentKind: 'project_document',
                loadContent: () => 'source text',
                chunk: () => chunks,
                embed: jest.fn().mockRejectedValue(new Error('embedding service unavailable')),
            })
        ).rejects.toThrow('embedding service unavailable');

        expect(client.delete).not.toHaveBeenCalled();
        expect(client.set).toHaveBeenLastCalledWith({
            syncStatus: RAG_SYNC_STATUS.failed,
            errorMessage: 'embedding service unavailable',
            syncedAt: null,
        });
    });

    it('resets failed members to pending before enqueueing ingestion', async () => {
        const client = makeRagClient();
        const enqueue = jest.fn().mockResolvedValue(undefined);

        const result = await queueRagDocumentForIngestion(client, {
            documentSetId: 'set-1',
            documentId: 'doc-1',
            existingStatus: RAG_SYNC_STATUS.failed,
            createMemberId: () => 'member-1',
            enqueue,
        });

        expect(result).toEqual({
            status: 'queued',
            previousStatus: RAG_SYNC_STATUS.failed,
        });
        expect(client.values).not.toHaveBeenCalled();
        expect(client.set).toHaveBeenCalledWith({
            syncStatus: RAG_SYNC_STATUS.pending,
            errorMessage: null,
            chunksCreated: 0,
            syncedAt: null,
        });
        expect(enqueue).toHaveBeenCalledTimes(1);
    });

    it('repairs existing members with a null status instead of inserting duplicates', async () => {
        const client = makeRagClient();
        const enqueue = jest.fn().mockResolvedValue(undefined);

        const result = await queueRagDocumentForIngestion(client, {
            documentSetId: 'set-1',
            documentId: 'doc-1',
            existingStatus: null,
            existingMember: true,
            createMemberId: () => 'member-1',
            enqueue,
        });

        expect(result).toEqual({
            status: 'queued',
            previousStatus: null,
        });
        expect(client.values).not.toHaveBeenCalled();
        expect(client.set).toHaveBeenCalledWith({
            syncStatus: RAG_SYNC_STATUS.pending,
            errorMessage: null,
            chunksCreated: 0,
            syncedAt: null,
        });
        expect(enqueue).toHaveBeenCalledTimes(1);
    });

    it('records queue failures on the member status', async () => {
        const client = makeRagClient();

        const result = await queueRagDocumentForIngestion(client, {
            documentSetId: 'set-1',
            documentId: 'doc-1',
            existingStatus: null,
            createMemberId: () => 'member-1',
            enqueue: jest.fn().mockRejectedValue(new Error('redis unavailable')),
        });

        expect(result).toEqual({
            status: 'failed',
            previousStatus: null,
            errorMessage: 'redis unavailable',
        });
        expect(client.values).toHaveBeenCalledWith({
            id: 'member-1',
            documentSetId: 'set-1',
            documentId: 'doc-1',
            syncStatus: RAG_SYNC_STATUS.pending,
            createdAt: expect.any(Date),
        });
        expect(client.set).toHaveBeenLastCalledWith({
            syncStatus: RAG_SYNC_STATUS.failed,
            errorMessage: 'redis unavailable',
        });
    });

    it('parses seed markdown for ingestion and fallback retrieval through shared helpers', () => {
        const raw = [
            '---',
            'domainSlug: cost',
            'name: Cost Management',
            'domainType: best_practices',
            'tags: [cost-management, budgeting]',
            'version: 1.2.0',
            'repoType: knowledge_practices',
            'applicableProjectTypes: [apartments]',
            'applicableStates: [NSW, AU]',
            '---',
            '## Budgeting',
            'Keep the cost plan current.',
            '',
            '### Contingency',
            'Track risk separately.',
        ].join('\n');

        const { frontmatter, body } = parseSeedKnowledgeMarkdown(raw);
        const sections = splitSeedKnowledgeBody(body);

        expect(frontmatter).toMatchObject({
            domainSlug: 'cost',
            tags: ['cost-management', 'budgeting'],
            applicableStates: ['NSW', 'AU'],
        });
        expect(sections).toEqual([
            { title: 'Budgeting', content: '## Budgeting\nKeep the cost plan current.' },
            { title: 'Contingency', content: '### Contingency\nTrack risk separately.' },
        ]);
    });
});
