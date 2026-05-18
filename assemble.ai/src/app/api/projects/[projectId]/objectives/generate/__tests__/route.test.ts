/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/db', () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
  },
}));

jest.mock('@/lib/auth/get-user', () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock('@/lib/ai/client', () => ({
  aiComplete: jest.fn(),
}));

jest.mock('@/lib/rag/retrieval', () => ({
  getDocumentChunksByIds: jest.fn(),
  retrieve: jest.fn(),
  retrieveFromDomains: jest.fn(),
}));

jest.mock('@/lib/rag/seed-knowledge-retrieval', () => ({
  retrieveSeedKnowledgeFallback: jest.fn(() => []),
}));

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { aiComplete } from '@/lib/ai/client';
import { getDocumentChunksByIds, retrieve, retrieveFromDomains } from '@/lib/rag/retrieval';
import { POST } from '../route';

const mockDb = db as unknown as {
  select: jest.Mock;
  update: jest.Mock;
  insert: jest.Mock;
};
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockAiComplete = aiComplete as jest.MockedFunction<typeof aiComplete>;
const mockGetDocumentChunksByIds = getDocumentChunksByIds as jest.MockedFunction<typeof getDocumentChunksByIds>;
const mockRetrieve = retrieve as jest.MockedFunction<typeof retrieve>;
const mockRetrieveFromDomains = retrieveFromDomains as jest.MockedFunction<typeof retrieveFromDomains>;

function request(body: unknown): NextRequest {
  return new Request('http://localhost/api/projects/project-1/objectives/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function selectResult(rows: unknown[]) {
  return {
    from: jest.fn(() => ({
      where: jest.fn(() => ({
        limit: jest.fn().mockResolvedValue(rows),
      })),
    })),
  };
}

function selectWhereResult(rows: unknown[]) {
  return {
    from: jest.fn(() => ({
      where: jest.fn().mockResolvedValue(rows),
    })),
  };
}

const params = { params: Promise.resolve({ projectId: 'project-1' }) };

describe('/api/projects/[projectId]/objectives/generate', () => {
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetCurrentUser.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'Test User',
        organizationId: 'org-1',
      },
      status: 200,
    });
    mockRetrieveFromDomains.mockResolvedValue([]);
    mockRetrieve.mockResolvedValue([]);
    mockGetDocumentChunksByIds.mockResolvedValue([]);
    mockAiComplete.mockResolvedValue({
      text: JSON.stringify({ planning: ['Monthly status report'] }),
      provider: 'anthropic',
      modelId: 'claude-test',
    });
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('does not fail regeneration when the optional generation audit table is missing', async () => {
    mockDb.select
      .mockReturnValueOnce(
        selectResult([
          {
            projectId: 'project-1',
            buildingClass: 'residential',
            projectType: 'advisory',
            subclass: '["apartments"]',
            scaleData: '{"storeys":8,"units":60}',
            complexity: '{}',
            workScope: '["cost_plan_review"]',
            region: 'NSW',
          },
        ])
      )
      .mockReturnValueOnce(selectResult([
        { projectName: 'Amenities Block 2 Replacement', jurisdiction: 'Hawkesbury City Council', lotArea: 0 },
      ]))
      .mockReturnValueOnce(selectWhereResult([]));

    mockDb.update.mockReturnValue({
      set: jest.fn(() => ({
        where: jest.fn().mockResolvedValue(undefined),
      })),
    });

    mockDb.insert
      .mockReturnValueOnce({
        values: jest.fn(() => ({
          returning: jest.fn().mockResolvedValue([
            {
              id: 'objective-1',
              projectId: 'project-1',
              objectiveType: 'planning',
              text: 'Monthly status report',
            },
          ]),
        })),
      })
      .mockReturnValueOnce({
        values: jest.fn().mockRejectedValue(
          Object.assign(
            new Error('relation "objective_generation_sessions" does not exist'),
            { code: '42P01' }
          )
        ),
      });

    const response = await POST(request({ section: 'planning' }), params);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.planning).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('objective_generation_sessions table is missing')
    );
  });

  it('does not fail regeneration when Drizzle wraps the missing audit table error', async () => {
    mockDb.select
      .mockReturnValueOnce(
        selectResult([
          {
            projectId: 'project-1',
            buildingClass: 'residential',
            projectType: 'new',
            subclass: '["apartments"]',
            scaleData: '{"storeys":8,"units":60}',
            complexity: '{}',
            workScope: '[]',
            region: 'NSW',
          },
        ])
      )
      .mockReturnValueOnce(selectResult([
        { projectName: 'Amenities Block 2 Replacement', jurisdiction: 'Hawkesbury City Council', lotArea: 0 },
      ]))
      .mockReturnValueOnce(selectWhereResult([]));

    mockDb.update.mockReturnValue({
      set: jest.fn(() => ({
        where: jest.fn().mockResolvedValue(undefined),
      })),
    });

    mockDb.insert
      .mockReturnValueOnce({
        values: jest.fn(() => ({
          returning: jest.fn().mockResolvedValue([
            {
              id: 'objective-1',
              projectId: 'project-1',
              objectiveType: 'planning',
              text: 'Monthly status report',
            },
          ]),
        })),
      })
      .mockReturnValueOnce({
        values: jest.fn().mockRejectedValue(
          Object.assign(
            new Error('Failed query: insert into "objective_generation_sessions"'),
            {
              cause: Object.assign(
                new Error('relation "objective_generation_sessions" does not exist'),
                { code: '42P01' }
              ),
            }
          )
        ),
      });

    const response = await POST(request({ section: 'planning' }), params);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.planning).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('objective_generation_sessions table is missing')
    );
  });

  it('loads indexed brief attachments into the full-document objectives prompt', async () => {
    mockDb.select
      .mockReturnValueOnce(
        selectResult([
          {
            projectId: 'project-1',
            buildingClass: 'residential',
            projectType: 'new',
            subclass: '["apartments"]',
            scaleData: '{"storeys":5,"gfa_sqm":781}',
            complexity: '{}',
            workScope: '[]',
            region: 'NSW',
          },
        ])
      )
      .mockReturnValueOnce(selectResult([
        { projectName: 'Amenities Block 2 Replacement', jurisdiction: 'Hawkesbury City Council', lotArea: 0 },
      ]))
      .mockReturnValueOnce(selectWhereResult([{ documentId: 'doc-ppr' }]));

    mockGetDocumentChunksByIds.mockResolvedValue([{
      chunkId: 'chunk-ppr-1',
      documentId: 'doc-ppr',
      content: 'PPR requires Principal approval. Development Consent DA201500704 applies at 568-572 Parramatta Rd with GFA 781 sqm.',
      relevanceScore: 1,
      hierarchyLevel: 1,
      hierarchyPath: '1',
      sectionTitle: 'Principal Project Requirements',
      clauseNumber: null,
      tokenCount: 32,
      createdAt: null,
    }]);
    mockAiComplete
      .mockResolvedValueOnce({
        text: JSON.stringify({
          planning: [
            {
              text: 'Coordinate Council public domain works',
              source: 'explicit',
              sourceDetail: 'Council signage design requirements apply to public domain works.',
            },
            {
              text: 'Submit Sydney Water notices',
              source: 'explicit',
              sourceDetail: 'Construction Commencement Notice must be submitted to Sydney Water.',
            },
          ],
        }),
        provider: 'anthropic',
        modelId: 'claude-test',
      });

    mockDb.update.mockReturnValue({
      set: jest.fn(() => ({
        where: jest.fn().mockResolvedValue(undefined),
      })),
    });

    mockDb.insert
      .mockReturnValueOnce({
        values: jest.fn(() => ({
          returning: jest.fn().mockResolvedValue([{
            id: 'objective-1',
            projectId: 'project-1',
            objectiveType: 'planning',
            text: 'Confirm Principal approval requirements',
          }]),
        })),
      })
      .mockReturnValueOnce({
        values: jest.fn().mockResolvedValue(undefined),
      });

    const response = await POST(request({ section: 'planning' }), params);

    expect(response.status).toBe(200);
    expect(mockGetDocumentChunksByIds).toHaveBeenCalledWith(['doc-ppr']);
    expect(mockRetrieve).not.toHaveBeenCalled();
    expect(mockRetrieveFromDomains).not.toHaveBeenCalled();
    expect(mockAiComplete).toHaveBeenCalledTimes(1);
    expect(mockAiComplete.mock.calls[0][0].featureGroup).toBe('objectives_generation');

    const prompt = mockAiComplete.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain('Attached Document Text - Authoritative');
    expect(prompt).toContain('Development Consent DA201500704');
    expect(prompt).toContain('568-572 Parramatta Rd');
    expect(prompt).toContain('Read the attached document text as a whole');
    expect(prompt).not.toContain('Retrieved Content');
    expect(prompt).not.toContain('candidate extraction pass');
  });

  it('returns a clear 413 before calling the model when brief attachments are too large for the direct document path', async () => {
    mockDb.select
      .mockReturnValueOnce(
        selectResult([
          {
            projectId: 'project-1',
            buildingClass: 'residential',
            projectType: 'new',
            subclass: '["apartments"]',
            scaleData: '{"storeys":5,"gfa_sqm":781}',
            complexity: '{}',
            workScope: '[]',
            region: 'NSW',
          },
        ])
      )
      .mockReturnValueOnce(selectResult([
        { projectName: 'Amenities Block 2 Replacement', jurisdiction: 'Hawkesbury City Council', lotArea: 0 },
      ]))
      .mockReturnValueOnce(selectWhereResult([{ documentId: 'doc-ppr' }]));

    mockGetDocumentChunksByIds.mockResolvedValue([{
      chunkId: 'chunk-ppr-large',
      documentId: 'doc-ppr',
      content: 'Large PPR text chunk.',
      relevanceScore: 1,
      hierarchyLevel: 1,
      hierarchyPath: '1',
      sectionTitle: 'Principal Project Requirements',
      clauseNumber: null,
      tokenCount: 100_001,
      createdAt: null,
    }]);

    const response = await POST(request({ section: 'planning' }), params);

    expect(response.status).toBe(413);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('ATTACHED_DOCUMENT_TOO_LARGE');
    expect(body.error.message).toContain('Attached documents are too large');
    expect(mockAiComplete).not.toHaveBeenCalled();
  });

  it('maps provider context-window failures to a clear 413 response', async () => {
    mockDb.select
      .mockReturnValueOnce(
        selectResult([
          {
            projectId: 'project-1',
            buildingClass: 'residential',
            projectType: 'new',
            subclass: '["apartments"]',
            scaleData: '{"storeys":5,"gfa_sqm":781}',
            complexity: '{}',
            workScope: '[]',
            region: 'NSW',
          },
        ])
      )
      .mockReturnValueOnce(selectResult([
        { projectName: 'Amenities Block 2 Replacement', jurisdiction: 'Hawkesbury City Council', lotArea: 0 },
      ]))
      .mockReturnValueOnce(selectWhereResult([{ documentId: 'doc-ppr' }]));

    mockGetDocumentChunksByIds.mockResolvedValue([{
      chunkId: 'chunk-ppr-1',
      documentId: 'doc-ppr',
      content: 'PPR requires Principal approval and planning compliance tracking.',
      relevanceScore: 1,
      hierarchyLevel: 1,
      hierarchyPath: '1',
      sectionTitle: 'Principal Project Requirements',
      clauseNumber: null,
      tokenCount: 12,
      createdAt: null,
    }]);
    mockAiComplete.mockRejectedValueOnce(
      Object.assign(new Error('maximum context length is 128000 tokens'), { status: 400 })
    );

    const response = await POST(request({ section: 'planning' }), params);

    expect(response.status).toBe(413);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('MODEL_CONTEXT_LIMIT');
    expect(body.error.message).toContain('selected generation model');
    expect(mockAiComplete).toHaveBeenCalledTimes(1);
  });

  it('maps provider token-rate-limit failures to a clear 429 response', async () => {
    mockDb.select
      .mockReturnValueOnce(
        selectResult([
          {
            projectId: 'project-1',
            buildingClass: 'residential',
            projectType: 'new',
            subclass: '["apartments"]',
            scaleData: '{"storeys":5,"gfa_sqm":781}',
            complexity: '{}',
            workScope: '[]',
            region: 'NSW',
          },
        ])
      )
      .mockReturnValueOnce(selectResult([
        { projectName: 'Amenities Block 2 Replacement', jurisdiction: 'Hawkesbury City Council', lotArea: 0 },
      ]))
      .mockReturnValueOnce(selectWhereResult([{ documentId: 'doc-ppr' }]));

    mockGetDocumentChunksByIds.mockResolvedValue([{
      chunkId: 'chunk-ppr-1',
      documentId: 'doc-ppr',
      content: 'PPR requires Principal approval and planning compliance tracking.',
      relevanceScore: 1,
      hierarchyLevel: 1,
      hierarchyPath: '1',
      sectionTitle: 'Principal Project Requirements',
      clauseNumber: null,
      tokenCount: 12,
      createdAt: null,
    }]);
    mockAiComplete.mockRejectedValueOnce(
      Object.assign(
        new Error('429 Request too large for gpt-4o on tokens per min (TPM): Limit 30000, Requested 34307.'),
        { status: 429, code: 'rate_limit_exceeded', type: 'tokens' }
      )
    );

    const response = await POST(request({ section: 'planning' }), params);

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('AI_RATE_LIMIT');
    expect(body.error.message).toContain('Objectives generation model');
  });
});
