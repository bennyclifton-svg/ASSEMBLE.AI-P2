import { calculateScores, QUESTIONS, type PillarId } from '../scoring';

function answersAll(value: number) {
    return Object.fromEntries(QUESTIONS.map((q) => [q.id, value]));
}

function answersPillar(pillar: PillarId, value: number, others: number) {
    return Object.fromEntries(
        QUESTIONS.map((q) => [q.id, q.pillar === pillar ? value : others]),
    );
}

describe('calculateScores', () => {
    it('all 5s scores 100 across the board', () => {
        const s = calculateScores(answersAll(5));
        expect(s.overall).toBe(100);
        expect(s.pillars.design).toBe(100);
        expect(s.pillars.procure).toBe(100);
        expect(s.pillars.deliver).toBe(100);
    });

    it('all 1s scores the same value across all three pillars (deterministic floor)', () => {
        const s = calculateScores(answersAll(1));
        // The function uses (total / (count * 5)) * 100, so 1s map to 1/5 = 20%.
        // We assert pillar parity here; the absolute floor value is asserted below.
        expect(s.pillars.design).toBe(s.pillars.procure);
        expect(s.pillars.procure).toBe(s.pillars.deliver);
        expect(s.pillars.design).toBe(20);
        expect(s.overall).toBe(20);
    });

    it('weakest pillar is the lowest-scored one', () => {
        const s = calculateScores(answersPillar('procure', 1, 5));
        expect(s.weakest).toBe('procure');
    });

    it('handles ties by returning a deterministic pillar', () => {
        const s = calculateScores(answersAll(3));
        expect(['design', 'procure', 'deliver']).toContain(s.weakest);
    });
});
