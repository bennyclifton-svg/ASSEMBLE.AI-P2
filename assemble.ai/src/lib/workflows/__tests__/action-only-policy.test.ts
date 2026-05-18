/**
 * @jest-environment node
 */

import fs from 'node:fs';
import path from 'node:path';

jest.mock('@/lib/db', () => ({
    db: {
        select: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        transaction: jest.fn(),
    },
}));

jest.mock('@/lib/agents/applicators', () => ({
    applyCreateAddendum: jest.fn(),
    applyCreateTransmittal: jest.fn(),
    applyCreateVariation: jest.fn(),
    applySetProjectObjectives: jest.fn(),
    applyUpdateCostLine: jest.fn(),
    applyUpdateNote: jest.fn(),
    applyUpdateProgramActivity: jest.fn(),
}));

jest.mock('@/lib/agents/project-events', () => ({
    emitProjectEvent: jest.fn(),
}));

import '@/lib/actions';
import { getAction } from '@/lib/actions';

const WORKFLOW_DIR = path.join(process.cwd(), 'src', 'lib', 'workflows');
const ACTION_ID_RE = /actionId:\s*['"`]([^'"`]+)['"`]/g;
const FORBIDDEN_PLAN_SURFACES = [
    {
        label: 'direct approval proposals',
        pattern: /\bproposeApproval\s*\(|@\/lib\/agents\/approvals|\.\.\/agents\/approvals/,
    },
    {
        label: 'legacy agent applicators',
        pattern: /@\/lib\/agents\/applicators|\.\.\/agents\/applicators/,
    },
    {
        label: 'agent tool registration',
        pattern: /\bregisterTool\s*\(|@\/lib\/agents\/tools|\.\.\/agents\/tools/,
    },
];

function collectWorkflowPlanFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === '__tests__') return [];
            return collectWorkflowPlanFiles(fullPath);
        }
        if (!entry.name.endsWith('.ts')) return [];
        if (['index.ts', 'runner.ts', 'types.ts'].includes(entry.name)) return [];
        return [fullPath];
    });
}

describe('workflow action-only mutation policy', () => {
    it('keeps workflow plan steps pointed at registered actions', () => {
        const missingActions = collectWorkflowPlanFiles(WORKFLOW_DIR).flatMap((file) => {
            const source = fs.readFileSync(file, 'utf8');
            return Array.from(source.matchAll(ACTION_ID_RE))
                .map((match) => match[1])
                .filter((actionId) => !getAction(actionId))
                .map((actionId) => `${path.relative(process.cwd(), file)} -> ${actionId}`);
        });

        expect(missingActions).toEqual([]);
    });

    it('keeps workflow plan modules off legacy write surfaces', () => {
        const violations = collectWorkflowPlanFiles(WORKFLOW_DIR).flatMap((file) => {
            const source = fs.readFileSync(file, 'utf8');
            return FORBIDDEN_PLAN_SURFACES.filter((surface) => surface.pattern.test(source)).map(
                (surface) => `${path.relative(process.cwd(), file)} uses ${surface.label}`
            );
        });

        expect(violations).toEqual([]);
    });
});
