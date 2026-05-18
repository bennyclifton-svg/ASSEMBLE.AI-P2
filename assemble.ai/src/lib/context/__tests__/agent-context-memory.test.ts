/**
 * @jest-environment node
 */

jest.mock('../orchestrator', () => ({
    assembleContext: jest.fn(),
}));

import { assembleAgentContext, formatAgentContext } from '../agent-context';
import { assembleContext } from '../orchestrator';
import type { AssembledContext } from '../types';

const mockedAssembleContext = jest.mocked(assembleContext);

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

    test('keeps retrieved knowledge before document and memory context', () => {
        const context: AssembledContext = {
            projectSummary: 'Project summary',
            moduleContext: '## Project Profile\nResidential apartments in NSW.',
            knowledgeContext: '## Knowledge Domain Context\nProgram & Scheduling Guide',
            ragContext: '## Document Excerpts\nProject brief excerpt.',
            aiMemoryContext: '## AI Memory\nAdvisory note.',
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

        expect(output).toContain('Program & Scheduling Guide');
        expect(output.indexOf('Knowledge Domain Context')).toBeLessThan(output.indexOf('Document Excerpts'));
        expect(output.indexOf('Knowledge Domain Context')).toBeLessThan(output.indexOf('AI Memory'));
    });

    test('requests knowledge domains only when agent domain tags are supplied', async () => {
        mockedAssembleContext.mockResolvedValue({
            projectSummary: 'Project summary',
            moduleContext: '',
            knowledgeContext: '',
            ragContext: '',
            aiMemoryContext: '',
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
        });

        await assembleAgentContext({
            projectId: 'project-1',
            task: 'create a programme',
            modules: ['profile', 'program'],
            domainTags: ['programming', 'milestones'],
        });

        expect(mockedAssembleContext).toHaveBeenCalledWith(
            expect.objectContaining({
                includeKnowledgeDomains: true,
                domainTags: ['programming', 'milestones'],
            })
        );
    });
});
