/**
 * Company Matcher Service
 * Feature 006 - Cost Planning Module (Task T141)
 *
 * Matches extracted company names from invoices to existing
 * consultants/contractors and their disciplines/trades.
 */

import { db } from '@/lib/db';
import { companies, consultants, contractors, consultantDisciplines, contractorTrades } from '@/lib/db/schema';
import { eq, like, and, isNull } from 'drizzle-orm';

// ============================================================================
// TYPES
// ============================================================================

export interface CompanyMatch {
  companyId: string;
  companyName: string;
  matchScore: number; // 0-1, how confident the match is
  matchType: 'exact' | 'partial' | 'fuzzy';
}

export interface DisciplineInfo {
  disciplineId: string;
  disciplineName: string;
  consultantId: string; // The project-specific consultant entry
}

export interface TradeInfo {
  tradeId: string;
  tradeName: string;
  contractorId: string; // The project-specific contractor entry
}

export interface CompanyMatchResult {
  found: boolean;
  company: CompanyMatch | null;
  type: 'consultant' | 'contractor' | null;
  discipline: DisciplineInfo | null;
  trade: TradeInfo | null;
  categoryPath: {
    category: string; // 'Consultants' or 'Contractors'
    subcategory: string; // Discipline or Trade name
  } | null;
}

// ============================================================================
// FUZZY MATCHING UTILITIES
// ============================================================================

/**
 * Normalize company name for comparison
 * - Lowercase
 * - Remove common suffixes (Pty Ltd, Inc, LLC, etc.)
 * - Remove punctuation
 * - Collapse multiple spaces
 */
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(pty\.?\s*ltd\.?|ltd\.?|inc\.?|llc|limited|corporation|corp\.?)\b/gi, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score between two strings (0-1)
 */
function calculateSimilarity(a: string, b: string): number {
  const normA = normalizeCompanyName(a);
  const normB = normalizeCompanyName(b);

  // Exact match after normalization
  if (normA === normB) return 1.0;

  // One contains the other (partial match)
  if (normA.includes(normB) || normB.includes(normA)) {
    return 0.9;
  }

  // Levenshtein-based similarity
  const maxLength = Math.max(normA.length, normB.length);
  if (maxLength === 0) return 1.0;

  const distance = levenshteinDistance(normA, normB);
  const similarity = 1 - distance / maxLength;

  return Math.max(0, similarity);
}

/**
 * Check if two company names are likely the same
 * Threshold: 0.7 for a reasonable match
 */
function isLikelyMatch(name1: string, name2: string, threshold = 0.7): boolean {
  return calculateSimilarity(name1, name2) >= threshold;
}

// ============================================================================
// MATCHING FUNCTIONS
// ============================================================================

/**
 * Match extracted company name to existing companies in the database
 * Searches across:
 * 1. Master companies table
 * 2. Project-specific consultants
 * 3. Project-specific contractors
 */
export async function matchCompany(
  extractedCompanyName: string,
  projectId: string
): Promise<CompanyMatchResult> {
  if (!extractedCompanyName?.trim()) {
    return {
      found: false,
      company: null,
      type: null,
      discipline: null,
      trade: null,
      categoryPath: null,
    };
  }

  const searchName = extractedCompanyName.trim();
  console.log(`[company-matcher] Searching for: "${searchName}" in project ${projectId}`);

  // Strategy 1: Try exact match on master companies first
  const exactCompany = await db.query.companies.findFirst({
    where: and(
      eq(companies.name, searchName),
      isNull(companies.deletedAt)
    ),
  });

  if (exactCompany) {
    // Found in master list, now find if linked to consultant/contractor in this project
    const linkedInfo = await findLinkedDisciplineOrTrade(exactCompany.id, projectId);
    return {
      found: true,
      company: {
        companyId: exactCompany.id,
        companyName: exactCompany.name,
        matchScore: 1.0,
        matchType: 'exact',
      },
      ...linkedInfo,
    };
  }

  // Strategy 2: Search project consultants by company name
  const consultantMatches = await db.query.consultants.findMany({
    where: eq(consultants.projectId, projectId),
  });

  for (const consultant of consultantMatches) {
    const similarity = calculateSimilarity(searchName, consultant.companyName);
    if (similarity >= 0.7) {
      // Find the discipline for this consultant
      const discipline = await db.query.consultantDisciplines.findFirst({
        where: and(
          eq(consultantDisciplines.projectId, projectId),
          eq(consultantDisciplines.disciplineName, consultant.discipline)
        ),
      });

      return {
        found: true,
        company: consultant.companyId ? {
          companyId: consultant.companyId,
          companyName: consultant.companyName,
          matchScore: similarity,
          matchType: similarity === 1.0 ? 'exact' : similarity >= 0.9 ? 'partial' : 'fuzzy',
        } : null, // Don't return invalid company ID - consultant.id is not a valid companies FK
        type: 'consultant',
        discipline: discipline
          ? {
              disciplineId: discipline.id,
              disciplineName: discipline.disciplineName,
              consultantId: consultant.id,
            }
          : null,
        trade: null,
        categoryPath: discipline
          ? {
              category: 'Consultants',
              subcategory: discipline.disciplineName,
            }
          : null,
      };
    }
  }

  // Strategy 3: Search project contractors by company name
  const contractorMatches = await db.query.contractors.findMany({
    where: eq(contractors.projectId, projectId),
  });

  for (const contractor of contractorMatches) {
    const similarity = calculateSimilarity(searchName, contractor.companyName);
    if (similarity >= 0.7) {
      // Find the trade for this contractor
      const trade = await db.query.contractorTrades.findFirst({
        where: and(
          eq(contractorTrades.projectId, projectId),
          eq(contractorTrades.tradeName, contractor.trade)
        ),
      });

      return {
        found: true,
        company: contractor.companyId ? {
          companyId: contractor.companyId,
          companyName: contractor.companyName,
          matchScore: similarity,
          matchType: similarity === 1.0 ? 'exact' : similarity >= 0.9 ? 'partial' : 'fuzzy',
        } : null, // Don't return invalid company ID - contractor.id is not a valid companies FK
        type: 'contractor',
        discipline: null,
        trade: trade
          ? {
              tradeId: trade.id,
              tradeName: trade.tradeName,
              contractorId: contractor.id,
            }
          : null,
        categoryPath: trade
          ? {
              category: 'Contractors',
              subcategory: trade.tradeName,
            }
          : null,
      };
    }
  }

  // Strategy 4: Fuzzy search on master companies table
  const allCompanies = await db.query.companies.findMany({
    where: isNull(companies.deletedAt),
  });

  let bestMatch: { company: typeof allCompanies[0]; score: number } | null = null;

  for (const company of allCompanies) {
    const similarity = calculateSimilarity(searchName, company.name);
    if (similarity >= 0.7 && (!bestMatch || similarity > bestMatch.score)) {
      bestMatch = { company, score: similarity };
    }
  }

  if (bestMatch) {
    const linkedInfo = await findLinkedDisciplineOrTrade(bestMatch.company.id, projectId);
    return {
      found: true,
      company: {
        companyId: bestMatch.company.id,
        companyName: bestMatch.company.name,
        matchScore: bestMatch.score,
        matchType: bestMatch.score === 1.0 ? 'exact' : bestMatch.score >= 0.9 ? 'partial' : 'fuzzy',
      },
      ...linkedInfo,
    };
  }

  // No match found
  console.log(`[company-matcher] No match found for: "${searchName}"`);
  return {
    found: false,
    company: null,
    type: null,
    discipline: null,
    trade: null,
    categoryPath: null,
  };
}

/**
 * Find the discipline or trade linked to a company in a project
 */
async function findLinkedDisciplineOrTrade(
  companyId: string,
  projectId: string
): Promise<{
  type: 'consultant' | 'contractor' | null;
  discipline: DisciplineInfo | null;
  trade: TradeInfo | null;
  categoryPath: { category: string; subcategory: string } | null;
}> {
  // Check consultants first
  const linkedConsultant = await db.query.consultants.findFirst({
    where: and(
      eq(consultants.projectId, projectId),
      eq(consultants.companyId, companyId)
    ),
  });

  if (linkedConsultant) {
    const discipline = await db.query.consultantDisciplines.findFirst({
      where: and(
        eq(consultantDisciplines.projectId, projectId),
        eq(consultantDisciplines.disciplineName, linkedConsultant.discipline)
      ),
    });

    return {
      type: 'consultant',
      discipline: discipline
        ? {
            disciplineId: discipline.id,
            disciplineName: discipline.disciplineName,
            consultantId: linkedConsultant.id,
          }
        : null,
      trade: null,
      categoryPath: discipline
        ? { category: 'Consultants', subcategory: discipline.disciplineName }
        : null,
    };
  }

  // Check contractors
  const linkedContractor = await db.query.contractors.findFirst({
    where: and(
      eq(contractors.projectId, projectId),
      eq(contractors.companyId, companyId)
    ),
  });

  if (linkedContractor) {
    const trade = await db.query.contractorTrades.findFirst({
      where: and(
        eq(contractorTrades.projectId, projectId),
        eq(contractorTrades.tradeName, linkedContractor.trade)
      ),
    });

    return {
      type: 'contractor',
      discipline: null,
      trade: trade
        ? {
            tradeId: trade.id,
            tradeName: trade.tradeName,
            contractorId: linkedContractor.id,
          }
        : null,
      categoryPath: trade
        ? { category: 'Contractors', subcategory: trade.tradeName }
        : null,
    };
  }

  return {
    type: null,
    discipline: null,
    trade: null,
    categoryPath: null,
  };
}

/**
 * Search for companies by partial name (for autocomplete)
 */
export async function searchCompanies(
  searchTerm: string,
  projectId: string,
  limit = 10
): Promise<Array<{ id: string; name: string; type: 'master' | 'consultant' | 'contractor' }>> {
  if (!searchTerm?.trim()) return [];

  const normalizedSearch = `%${normalizeCompanyName(searchTerm)}%`;
  const results: Array<{ id: string; name: string; type: 'master' | 'consultant' | 'contractor' }> = [];

  // Search master companies
  const masterCompanies = await db.query.companies.findMany({
    where: and(
      like(companies.name, `%${searchTerm}%`),
      isNull(companies.deletedAt)
    ),
    limit,
  });

  results.push(...masterCompanies.map((c) => ({ id: c.id, name: c.name, type: 'master' as const })));

  // Search consultants
  const projectConsultants = await db.query.consultants.findMany({
    where: and(
      eq(consultants.projectId, projectId),
      like(consultants.companyName, `%${searchTerm}%`)
    ),
    limit,
  });

  results.push(
    ...projectConsultants
      .filter((c) => !results.some((r) => r.name === c.companyName))
      .map((c) => ({ id: c.id, name: c.companyName, type: 'consultant' as const }))
  );

  // Search contractors
  const projectContractors = await db.query.contractors.findMany({
    where: and(
      eq(contractors.projectId, projectId),
      like(contractors.companyName, `%${searchTerm}%`)
    ),
    limit,
  });

  results.push(
    ...projectContractors
      .filter((c) => !results.some((r) => r.name === c.companyName))
      .map((c) => ({ id: c.id, name: c.companyName, type: 'contractor' as const }))
  );

  return results.slice(0, limit);
}
