/**
 * @jest-environment node
 */

jest.mock('../orchestrator', () => ({
    assembleContext: jest.fn(),
}));

import { formatAgentContext } from '../agent-context';
import type { AssembledContext } from '../types';

describe('formatAgentContext memory precedence', () => {
    test('places project records and documents before advisory memory', () => {
        const context: AssembledContext = {
            projectSummary: '## Project Summary\nRegion: NSW',
            moduleContext: '## Project Records\nThe canonical project region is NSW.',
            knowledgeContext: '',
            ragContext: '## Document Excerpts\nThe planning consent references NSW conditions.',
            aiMemoryContext:
                '## AI Memory (Advisory Preferences And Context)\nThese entries are user-reviewable preferences/context only. Schema-backed project records, stored files, document excerpts, issued artefacts, and explicit instructions in the current task override this memory if anything conflicts.\n- Assumption: Legacy region note - Region is VIC.',
            crossModuleInsights: '',
            rawModules: new Map(),
            metadata: {
                modulesRequested: [],
                modulesFetched: [],
                modulesFailed: [],
                totalEstimatedTokens: 0,
                formattingTier: 'summary',
                assemblyTimeMs: 0,
                cacheHits: 0,
                cacheMisses: 0,
            },
        };

        const output = formatAgentContext(context);

        expect(output).toContain('Schema-backed project records');
        expect(output.indexOf('Region: NSW')).toBeLessThan(output.indexOf('Region is VIC'));
        expect(output.indexOf('Document Excerpts')).toBeLessThan(output.indexOf('AI Memory'));
    });
});
