/**
 * Input-validation tests for the Phase 1 tools. The model is allowed to
 * pass anything as tool input — these tests confirm we reject malformed
 * input before it reaches the DB.
 */

// db is referenced at import-time by the tool modules; mock it so the
// test environment doesn't try to open a real Postgres connection.
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/rag/retrieval', () => ({ retrieve: jest.fn() }));

// The tools register themselves on import via their module's top-level
// `registerTool(definition)` call, so these tests just import them.
import { searchRagTool } from '../search-rag';
import { listCostLinesTool } from '../list-cost-lines';

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
