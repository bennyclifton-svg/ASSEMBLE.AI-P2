import { ilike, or, sql, type SQL } from 'drizzle-orm';
import { fileAssets } from '@/lib/db/pg-schema';

export function buildDocumentTextSearchTerms(value: string): string[] {
    const trimmed = normaliseWhitespace(value);
    if (!trimmed) return [];

    return unique([
        trimmed,
        singulariseTrailingSTokens(trimmed),
    ]);
}

export function buildDocumentTextSearchVariants(value: string): string[] {
    const trimmed = normaliseWhitespace(value);
    if (!trimmed) return [];

    return unique([
        trimmed,
        compactForSearch(trimmed),
    ]);
}

export function documentTitleSearchCondition(value: string): SQL {
    const terms = buildDocumentTextSearchTerms(value);
    const compactTerms = unique(terms.map(compactForSearch).filter(Boolean));
    const conditions: SQL[] = [];

    for (const term of terms) {
        const pattern = `%${term}%`;
        conditions.push(
            ilike(fileAssets.drawingName, pattern),
            ilike(fileAssets.originalName, pattern),
            ilike(fileAssets.drawingNumber, pattern),
            sql`concat_ws(' ', ${fileAssets.drawingNumber}, ${fileAssets.drawingName}) ILIKE ${pattern}`,
            sql`concat_ws(' ', ${fileAssets.drawingNumber}, ${fileAssets.originalName}) ILIKE ${pattern}`
        );
    }

    for (const compactTerm of compactTerms) {
        const pattern = `%${compactTerm}%`;
        conditions.push(
            sql`regexp_replace(lower(concat_ws(' ', ${fileAssets.drawingNumber}, ${fileAssets.drawingName}, ${fileAssets.originalName})), '[^a-z0-9]', '', 'g') LIKE ${pattern}`
        );
    }

    return conditions.length > 0 ? or(...conditions)! : sql`false`;
}

function normaliseWhitespace(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
}

function singulariseTrailingSTokens(value: string): string {
    return value.replace(/\b([A-Za-z][A-Za-z0-9-]{2,})s\b/g, (match, stem: string) => {
        if (stem.toLowerCase().endsWith('s')) return match;
        return stem;
    });
}

function compactForSearch(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function unique(values: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const value of values) {
        if (!value || seen.has(value)) continue;
        seen.add(value);
        out.push(value);
    }
    return out;
}
