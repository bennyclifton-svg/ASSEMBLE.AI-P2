export interface CostLineMatchRow {
    id: string;
    section: string;
    costCode: string | null;
    activity: string;
    reference?: string | null;
    stakeholderName?: string | null;
    disciplineOrTrade?: string | null;
}

export const COST_LINE_MATCH_THRESHOLD = 0.72;
export const COST_LINE_LIST_MATCH_THRESHOLD = 0.52;
export const COST_LINE_AMBIGUITY_GAP = 0.06;

export function rankCostLineMatches(
    rows: CostLineMatchRow[],
    input: { reference?: string; discipline?: string; category?: string },
    threshold = COST_LINE_MATCH_THRESHOLD
): Array<{ row: CostLineMatchRow; score: number }> {
    return rows
        .map((row) => ({
            row,
            score: scoreCostLine(row, input.reference, input.discipline, input.category),
        }))
        .filter((candidate) => candidate.score >= threshold)
        .sort((a, b) => b.score - a.score);
}

export function scoreCostLine(
    row: CostLineMatchRow,
    reference?: string,
    discipline?: string,
    category?: string
): number {
    const refScore = reference
        ? bestTextScore(reference, [
              row.activity,
              row.costCode,
              row.reference,
              row.section,
              `${row.costCode ?? ''} ${row.activity}`,
              `${row.section} ${row.activity}`,
              `${row.activity} ${row.reference ?? ''}`,
              formatCostLineLabel(row),
          ])
        : 1;
    const disciplineScore = discipline
        ? bestTextScore(discipline, [
              row.stakeholderName,
              row.disciplineOrTrade,
              ...sectionCategoryCandidates(row.section),
          ])
        : 1;
    const categoryScore = category
        ? bestTextScore(category, sectionCategoryCandidates(row.section))
        : 1;

    if (reference && refScore < 0.5) return 0;
    if (discipline && disciplineScore < 0.5) return 0;
    if (category && !reference && !discipline && categoryScore < 0.5) return 0;
    if (reference && discipline && category) {
        return refScore * 0.58 + disciplineScore * 0.22 + categoryScore * 0.2;
    }
    if (reference && discipline) return refScore * 0.7 + disciplineScore * 0.3;
    if (reference && category) return refScore * 0.78 + categoryScore * 0.22;
    if (discipline && category) return disciplineScore * 0.55 + categoryScore * 0.45;
    if (reference) return refScore;
    if (discipline) return disciplineScore;
    return categoryScore;
}

export function bestTextScore(query: string, candidates: Array<string | null | undefined>): number {
    return Math.max(0, ...candidates.map((candidate) => textScore(query, candidate ?? '')));
}

export function textScore(query: string, candidate: string): number {
    const a = normalizeText(query);
    const b = normalizeText(candidate);
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.includes(b) || b.includes(a)) return 0.94;

    const queryTokens = uniqueTokens(a);
    const candidateTokens = uniqueTokens(b);
    if (queryTokens.length === 0 || candidateTokens.length === 0) return 0;

    const queryCoverage = averageBestTokenScore(queryTokens, candidateTokens);
    const candidateCoverage = averageBestTokenScore(candidateTokens, queryTokens);
    const coverageScore = queryCoverage * 0.82 + candidateCoverage * 0.18;
    const editScore = 1 - levenshteinDistance(a, b) / Math.max(a.length, b.length);

    return Math.max(coverageScore, editScore);
}

export function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function formatCostLineLabel(row: CostLineMatchRow): string {
    const owner = row.stakeholderName || row.disciplineOrTrade || defaultOwnerForSection(row.section);
    const line = [row.costCode, row.activity, row.reference].filter(Boolean).join(' - ');
    return owner ? `${owner} - ${line}` : line;
}

function sectionCategoryCandidates(section: string | null | undefined): string[] {
    const raw = section ?? '';
    const normalized = normalizeText(raw);
    const candidates = [raw];

    if (normalized === 'fees') {
        candidates.push(
            'Authorities',
            'Authority Costs',
            'Authority & Statutory Costs',
            'Statutory Costs',
            'Developer',
            'Developer Expense',
            'Developer Expenses',
            'Developer Costs',
            'Development Costs',
            'Government Fees',
            'Levies'
        );
    }
    if (normalized === 'consultants') {
        candidates.push('Consultants', 'Consultant Fees', 'Professional Fees', 'Design Team');
    }
    if (normalized === 'construction') {
        candidates.push('Construction', 'Construction Costs', 'Works', 'Trade Costs', 'Builder');
    }
    if (normalized === 'contingency') {
        candidates.push('Contingency', 'Contingencies', 'Risk Allowance');
    }

    return candidates;
}

function defaultOwnerForSection(section: string | null | undefined): string | null {
    return normalizeText(section ?? '') === 'fees' ? 'Developer' : null;
}

function uniqueTokens(value: string): string[] {
    return Array.from(new Set(value.split(' ').filter(Boolean)));
}

function averageBestTokenScore(source: string[], candidates: string[]): number {
    const total = source.reduce((sum, token) => {
        return sum + Math.max(0, ...candidates.map((candidate) => tokenSimilarity(token, candidate)));
    }, 0);
    return total / source.length;
}

function tokenSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length <= 2 || b.length <= 2) return 0;
    if (a.includes(b) || b.includes(a)) return 0.9;

    const editScore = 1 - levenshteinDistance(a, b) / Math.max(a.length, b.length);
    return editScore >= 0.72 ? editScore : 0;
}

function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i += 1) matrix[i] = [i];
    for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i += 1) {
        for (let j = 1; j <= a.length; j += 1) {
            matrix[i][j] =
                b.charAt(i - 1) === a.charAt(j - 1)
                    ? matrix[i - 1][j - 1]
                    : Math.min(
                          matrix[i - 1][j - 1] + 1,
                          matrix[i][j - 1] + 1,
                          matrix[i - 1][j] + 1
                      );
        }
    }

    return matrix[b.length][a.length];
}
