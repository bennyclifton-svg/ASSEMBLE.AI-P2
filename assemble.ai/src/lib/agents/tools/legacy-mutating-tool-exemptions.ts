export type LegacyMutatingToolKind = 'legacy-agent-tool' | 'workflow-launcher';

export interface LegacyMutatingToolExemption {
    kind: LegacyMutatingToolKind;
    domain: string;
    reason: string;
    migrationTarget: string;
}

export const LEGACY_MUTATING_TOOL_EXEMPTIONS: Record<string, LegacyMutatingToolExemption> = {
    start_issue_variation_workflow: {
        kind: 'workflow-launcher',
        domain: 'workflow',
        reason:
            'This tool starts workflow state and materializes registered action steps; it must not apply project data directly.',
        migrationTarget:
            'Move workflow launchers into a typed workflow catalog while keeping every write step as a registered action.',
    },
    start_issue_variation_assessment_revision_workflow: {
        kind: 'workflow-launcher',
        domain: 'workflow',
        reason:
            'This tool starts workflow state and materializes registered action steps; it must not apply project data directly.',
        migrationTarget:
            'Move workflow launchers into a typed workflow catalog while keeping every write step as a registered action.',
    },
};
