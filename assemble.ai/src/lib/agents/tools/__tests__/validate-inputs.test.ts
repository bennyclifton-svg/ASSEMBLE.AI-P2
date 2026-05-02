/**
 * Input-validation tests for the Phase 1 tools. The model is allowed to
 * pass anything as tool input — these tests confirm we reject malformed
 * input before it reaches the DB.
 */

// db is referenced at import-time by the tool modules; mock it so the
// test environment doesn't try to open a real Postgres connection.
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/rag/retrieval', () => ({ retrieve: jest.fn(), retrieveFromDomains: jest.fn() }));
jest.mock('../../events', () => ({ emitChatEvent: jest.fn() }));
jest.mock('../../approvals', () => ({ proposeApproval: jest.fn() }));
jest.mock('../../project-events', () => ({ emitProjectEvent: jest.fn() }));

// The tools register themselves on import via their module's top-level
// `registerTool(definition)` call, so these tests just import them.
import { searchRagTool } from '../search-rag';
import { searchKnowledgeLibraryTool } from '../search-knowledge-library';
import { listCostLinesTool } from '../list-cost-lines';
import { listProjectDocumentsTool } from '../list-project-documents';
import { listProjectObjectivesTool } from '../list-project-objectives';
import { selectProjectDocumentsTool } from '../select-project-documents';
import { setProjectObjectivesTool } from '../set-project-objectives';

describe('search_rag.validate', () => {
    it('accepts a query string', () => {
        expect(searchRagTool.validate({ query: 'water table' })).toEqual({
            query: 'water table',
            maxResults: undefined,
        });
    });

    it('trims the query', () => {
        expect(searchRagTool.validate({ query: '  hello  ' })).toEqual({
            query: 'hello',
            maxResults: undefined,
        });
    });

    it('clamps maxResults to the hard cap', () => {
        const result = searchRagTool.validate({ query: 'q', maxResults: 999 });
        expect(result.maxResults).toBeLessThanOrEqual(15);
    });

    it('rejects empty query', () => {
        expect(() => searchRagTool.validate({ query: '   ' })).toThrow();
    });

    it('rejects missing query', () => {
        expect(() => searchRagTool.validate({})).toThrow();
    });

    it('rejects non-object input', () => {
        expect(() => searchRagTool.validate('foo')).toThrow();
        expect(() => searchRagTool.validate(null)).toThrow();
    });

    it('rejects non-integer maxResults', () => {
        expect(() => searchRagTool.validate({ query: 'q', maxResults: 1.5 })).toThrow();
    });
});

describe('search_knowledge_library.validate', () => {
    it('accepts a query with optional filters', () => {
        expect(
            searchKnowledgeLibraryTool.validate({
                query: ' concept stage contingency ',
                tags: ['cost-management'],
                domainTypes: ['best_practices', 'not-real'],
                maxResults: 999,
            })
        ).toEqual({
            query: 'concept stage contingency',
            tags: ['cost-management'],
            domainTypes: ['best_practices'],
            maxResults: 10,
        });
    });

    it('rejects malformed filters', () => {
        expect(() => searchKnowledgeLibraryTool.validate({ query: 'q', tags: ['ok', 1] })).toThrow();
        expect(() => searchKnowledgeLibraryTool.validate({ query: 'q', domainTypes: 'reference' })).toThrow();
    });

    it('is read-only', () => {
        expect(searchKnowledgeLibraryTool.spec.name).toBe('search_knowledge_library');
        expect(searchKnowledgeLibraryTool.mutating).toBe(false);
    });
});

describe('list_cost_lines.validate', () => {
    it('accepts an empty input', () => {
        expect(listCostLinesTool.validate({})).toEqual({});
    });

    it('accepts undefined input', () => {
        expect(listCostLinesTool.validate(undefined)).toEqual({});
    });

    it('accepts a valid masterStage', () => {
        expect(listCostLinesTool.validate({ masterStage: 'delivery' })).toEqual({
            masterStage: 'delivery',
        });
    });

    it('rejects an invalid masterStage', () => {
        expect(() => listCostLinesTool.validate({ masterStage: 'not-a-stage' })).toThrow();
    });

    it('clamps limit to the hard cap', () => {
        const result = listCostLinesTool.validate({ limit: 99999 });
        expect(result.limit).toBeLessThanOrEqual(500);
    });

    it('rejects non-integer limit', () => {
        expect(() => listCostLinesTool.validate({ limit: 'fifty' })).toThrow();
    });
});

describe('project objective tools', () => {
    it('accepts an objective section filter', () => {
        expect(listProjectObjectivesTool.validate({ objectiveType: 'planning' })).toEqual({
            objectiveType: 'planning',
        });
    });

    it('rejects invalid objective section filters', () => {
        expect(() =>
            listProjectObjectivesTool.validate({ objectiveType: 'budget' })
        ).toThrow();
    });

    it('accepts replacement objectives for multiple sections', () => {
        expect(
            setProjectObjectivesTool.validate({
                mode: 'replace',
                planning: ['DA approval pathway'],
                functional: ['Flexible floor plate'],
            })
        ).toEqual({
            mode: 'replace',
            planning: ['DA approval pathway'],
            functional: ['Flexible floor plate'],
        });
    });

    it('requires at least one objective item', () => {
        expect(() => setProjectObjectivesTool.validate({ mode: 'replace' })).toThrow();
        expect(() => setProjectObjectivesTool.validate({ planning: [] })).toThrow();
    });
});

describe('list_project_documents.validate', () => {
    it('accepts empty input for a count-only request', () => {
        expect(listProjectDocumentsTool.validate(undefined)).toEqual({});
    });

    it('accepts filters and clamps the document list limit', () => {
        expect(
            listProjectDocumentsTool.validate({
                categoryId: 'design',
                subcategoryId: 'architect',
                disciplineOrTrade: 'mechanical',
                includeDocuments: true,
                limit: 999,
            })
        ).toEqual({
            categoryId: 'design',
            subcategoryId: 'architect',
            disciplineOrTrade: 'mechanical',
            includeDocuments: true,
            limit: 100,
        });
    });

    it('rejects malformed document inventory options', () => {
        expect(() => listProjectDocumentsTool.validate({ includeDocuments: 'yes' })).toThrow();
        expect(() => listProjectDocumentsTool.validate({ limit: -1 })).toThrow();
    });
});

describe('select_project_documents.validate', () => {
    it('accepts an explicit selection request', () => {
        expect(
            selectProjectDocumentsTool.validate({
                mode: 'add',
                documentIds: ['doc-1', 'doc-2'],
            })
        ).toEqual({
            mode: 'add',
            documentIds: ['doc-1', 'doc-2'],
        });
    });

    it('accepts discipline text filters for selection requests', () => {
        expect(
            selectProjectDocumentsTool.validate({
                mode: 'replace',
                disciplineOrTrade: 'mech',
            })
        ).toEqual({
            mode: 'replace',
            disciplineOrTrade: 'mech',
        });
    });

    it('accepts clearing the current selection without document IDs', () => {
        expect(selectProjectDocumentsTool.validate({ mode: 'clear' })).toEqual({
            mode: 'clear',
        });
    });

    it('requires a selector unless clearing selection', () => {
        expect(() => selectProjectDocumentsTool.validate({ mode: 'replace' })).toThrow();
    });
});

describe('tool specs are well-formed', () => {
    it('search_rag has a name and inputSchema', () => {
        expect(searchRagTool.spec.name).toBe('search_rag');
        expect(searchRagTool.spec.inputSchema).toBeDefined();
        expect(searchRagTool.mutating).toBe(false);
    });

    it('list_cost_lines has a name and inputSchema', () => {
        expect(listCostLinesTool.spec.name).toBe('list_cost_lines');
        expect(listCostLinesTool.spec.inputSchema).toBeDefined();
        expect(listCostLinesTool.mutating).toBe(false);
    });
});
