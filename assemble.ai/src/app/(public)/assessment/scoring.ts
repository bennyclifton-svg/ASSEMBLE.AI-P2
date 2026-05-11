/**
 * Project Health Check — pure scoring logic and pillar definitions.
 *
 * Extracted from page.tsx so the scoring transform can be unit-tested
 * without booting the React tree.
 */

export type PillarId = 'design' | 'procure' | 'deliver';

export type Question = {
    id: string;
    pillar: PillarId;
    text: string;
};

export type Scores = {
    overall: number;
    pillars: Record<PillarId, number>;
    weakest: PillarId;
};

export const PILLARS: Record<PillarId, { label: string; code: string; color: string; description: string }> = {
    design: {
        label: 'Design',
        code: '01',
        color: 'var(--sw-rose)',
        description: 'How well the brief, consultant team and design coordination set the project up to be built.',
    },
    procure: {
        label: 'Procure',
        code: '02',
        color: 'var(--sw-peach)',
        description: 'How tightly tenders are scoped, issued, evaluated and awarded.',
    },
    deliver: {
        label: 'Deliver',
        code: '03',
        color: 'var(--sw-cyan)',
        description: 'How contract administration, variations, claims and completion are controlled.',
    },
};

export const QUESTIONS: Question[] = [
    // DESIGN (3)
    { id: 'design-brief',        pillar: 'design',  text: 'The project brief is documented and used to test design decisions.' },
    { id: 'design-consultants',  pillar: 'design',  text: 'Consultants are appointed against scopes of service that match the project, with clear deliverables per stage.' },
    { id: 'design-coordination', pillar: 'design',  text: 'Drawings, specifications and reports are coordinated and revision-controlled before issue.' },
    // PROCURE (3)
    { id: 'procure-scope',       pillar: 'procure', text: 'Tender packages have clear scope, inclusions, exclusions and evaluation criteria before issue.' },
    { id: 'procure-rfi',         pillar: 'procure', text: 'RFIs and addenda are managed through one register so every bidder has the same information.' },
    { id: 'procure-award',       pillar: 'procure', text: 'Award recommendations are prepared from captured evidence, not rebuilt manually at the end.' },
    // DELIVER (3)
    { id: 'deliver-ca',          pillar: 'deliver', text: 'Contract administration runs through a structured workflow — directions, instructions, notices, EOTs.' },
    { id: 'deliver-cost',        pillar: 'deliver', text: 'Variations, progress claims and contingency are tracked against the contract sum month-on-month.' },
    { id: 'deliver-completion',  pillar: 'deliver', text: 'Practical completion, defects and final account run from a known checklist, not a scramble.' },
];

export function calculateScores(answers: Record<string, number>): Scores {
    const pillars = (Object.keys(PILLARS) as PillarId[]).reduce(
        (acc, pillar) => {
            const pillarQuestions = QUESTIONS.filter((question) => question.pillar === pillar);
            const total = pillarQuestions.reduce((sum, question) => sum + (answers[question.id] ?? 0), 0);
            acc[pillar] = Math.round((total / (pillarQuestions.length * 5)) * 100);
            return acc;
        },
        {} as Record<PillarId, number>,
    );

    const totalScore = QUESTIONS.reduce((sum, question) => sum + (answers[question.id] ?? 0), 0);
    const overall = Math.round((totalScore / (QUESTIONS.length * 5)) * 100);
    const weakest = (Object.keys(pillars) as PillarId[]).sort((a, b) => pillars[a] - pillars[b])[0];

    return { overall, pillars, weakest };
}
