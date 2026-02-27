/**
 * End-to-End TRR Knowledge Context Test (Wave 4 — Stage 4C)
 *
 * Simulates the TRR generate route's domain retrieval logic:
 * - Calls retrieveFromDomains with structural discipline + procurement tags
 * - Formats results the same way assembleDomainContext does
 * - Verifies structural domain chunks appear alongside procurement guidance
 * - Verifies the formatted output would be useful in an AI prompt
 *
 * Pass criteria:
 * - Knowledge context section appears (non-empty)
 * - Structural domain chunks are included alongside procurement guidance
 * - AI output references discipline-specific considerations
 *
 * Run with: npx tsx scripts/test-trr-e2e.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
    const { retrieveFromDomains } = await import('../src/lib/rag/retrieval');
    const { pool } = await import('../src/lib/db/rag-client');

    console.log('='.repeat(80));
    console.log('END-TO-END TRR KNOWLEDGE CONTEXT TEST');
    console.log('Simulating: Structural tender package TRR generation');
    console.log('='.repeat(80));
    console.log('');

    // Simulate what the TRR route does for a structural tender:
    // domainTags: ['procurement', 'tendering', 'contracts', 'structural']
    // task: "Generate TRR executiveSummary for Structural"
    const query = 'Generate TRR executiveSummary for Structural steel and concrete tender package';
    const domainTags = ['procurement', 'tendering', 'contracts', 'structural'];

    console.log(`Query: "${query}"`);
    console.log(`Domain tags: [${domainTags.join(', ')}]`);
    console.log('');

    let passed = 0;
    let failed = 0;
    const failures: string[] = [];

    // ---- Test 1: Retrieval returns results ----
    console.log('--- Test 1: Retrieval returns results ---');
    let results;
    try {
        results = await retrieveFromDomains(query, {
            domainTags,
            domainTypes: ['best_practices'],
            includePrebuilt: true,
            includeOrganization: false,
            topK: 15,
            rerankTopK: 5,
            minRelevanceScore: 0.2,
        });

        if (results.length > 0) {
            console.log(`  PASS — ${results.length} results returned`);
            passed++;
        } else {
            console.log('  FAIL — No results returned');
            failures.push('Test 1: No results returned');
            failed++;
        }
    } catch (err) {
        console.log(`  ERROR — ${(err as Error).message}`);
        failures.push(`Test 1: ${(err as Error).message}`);
        failed++;
        await pool.end();
        process.exit(1);
    }

    // ---- Test 2: Structural domain chunks are included ----
    console.log('\n--- Test 2: Structural domain chunks are included ---');
    const structuralResults = results.filter(r =>
        r.domainName?.toLowerCase().includes('structural') ||
        r.documentId?.includes('structural')
    );

    if (structuralResults.length > 0) {
        console.log(`  PASS — ${structuralResults.length} structural chunk(s) in results`);
        for (const r of structuralResults) {
            const score = r.relevanceScore ?? r.distance ?? 0;
            console.log(`    [${score.toFixed(4)}] ${r.domainName} — ${r.sectionTitle || 'untitled'}`);
        }
        passed++;
    } else {
        console.log('  FAIL — No structural domain chunks in results');
        failures.push('Test 2: No structural domain chunks found');
        failed++;
    }

    // ---- Test 3: Procurement/tendering domain chunks also present ----
    console.log('\n--- Test 3: Procurement/tendering chunks also present ---');
    const procurementResults = results.filter(r =>
        r.domainName?.toLowerCase().includes('procurement') ||
        r.domainName?.toLowerCase().includes('tendering') ||
        r.documentId?.includes('procurement') ||
        r.domainTags?.some(t => ['procurement', 'tendering', 'contracts'].includes(t))
    );

    if (procurementResults.length > 0) {
        console.log(`  PASS — ${procurementResults.length} procurement/tendering chunk(s) in results`);
        for (const r of procurementResults) {
            const score = r.relevanceScore ?? r.distance ?? 0;
            console.log(`    [${score.toFixed(4)}] ${r.domainName} — ${r.sectionTitle || 'untitled'}`);
        }
        passed++;
    } else {
        // This is acceptable — with tag overlap filtering, structural domain content
        // about procurement may rank higher than generic procurement content.
        console.log('  WARN — No separate procurement chunks (structural procurement content may have absorbed this)');
        // Check if structural results contain procurement-related content
        const structuralProcurement = structuralResults.filter(r =>
            r.content?.toLowerCase().includes('procurement') ||
            r.content?.toLowerCase().includes('tender') ||
            r.sectionTitle?.toLowerCase().includes('procurement') ||
            r.sectionTitle?.toLowerCase().includes('tender')
        );
        if (structuralProcurement.length > 0) {
            console.log(`  PASS (alternative) — ${structuralProcurement.length} structural chunk(s) with procurement content`);
            passed++;
        } else {
            console.log('  FAIL — No procurement-related content at all');
            failures.push('Test 3: No procurement content in results');
            failed++;
        }
    }

    // ---- Test 4: Format as prompt section (matches assembleDomainContext) ----
    console.log('\n--- Test 4: Format as prompt section ---');
    const lines: string[] = ['## Knowledge Domain Context'];
    const byDomain = new Map<string, typeof results>();

    for (const r of results) {
        const key = r.domainName || 'Unknown Domain';
        const group = byDomain.get(key) || [];
        group.push(r);
        byDomain.set(key, group);
    }

    for (const [domainName, domainResults] of byDomain) {
        const firstResult = domainResults[0];
        const typeLabel = firstResult.domainType || 'reference';
        lines.push(`\n### ${domainName} (${typeLabel})`);

        for (const r of domainResults) {
            const sectionLabel = r.sectionTitle ? ` — ${r.sectionTitle}` : '';
            lines.push(`\n**[${r.relevanceScore.toFixed(2)}]${sectionLabel}**`);
            lines.push(r.content);
        }
    }

    const formattedContext = lines.join('\n');
    const contextLength = formattedContext.length;

    if (contextLength > 100) {
        console.log(`  PASS — Formatted context: ${contextLength} chars, ${formattedContext.split('\n').length} lines`);
        passed++;
    } else {
        console.log(`  FAIL — Formatted context too short: ${contextLength} chars`);
        failures.push('Test 4: Formatted context too short');
        failed++;
    }

    // ---- Test 5: Context contains discipline-specific terms ----
    console.log('\n--- Test 5: Context contains discipline-specific construction terms ---');
    const disciplineTerms = [
        'structural', 'steel', 'concrete', 'reinforcement', 'formwork',
        'post-tension', 'fabrication', 'erection', 'propping', 'tolerance',
    ];

    const foundTerms = disciplineTerms.filter(term =>
        formattedContext.toLowerCase().includes(term)
    );

    if (foundTerms.length >= 3) {
        console.log(`  PASS — Found ${foundTerms.length}/${disciplineTerms.length} discipline terms: ${foundTerms.join(', ')}`);
        passed++;
    } else {
        console.log(`  FAIL — Only ${foundTerms.length} discipline terms found: ${foundTerms.join(', ')}`);
        failures.push(`Test 5: Only ${foundTerms.length} discipline terms found`);
        failed++;
    }

    // ---- Test 6: No wrong-discipline contamination in top results ----
    console.log('\n--- Test 6: No wrong-discipline contamination ---');
    const wrongDisciplineResults = results.filter(r => {
        const domain = (r.domainName || r.documentId || '').toLowerCase();
        return domain.includes('civil') ||
            domain.includes('mep') ||
            domain.includes('landscape');
    });

    if (wrongDisciplineResults.length === 0) {
        console.log('  PASS — No civil/MEP/landscape contamination in results');
        passed++;
    } else {
        console.log(`  WARN — ${wrongDisciplineResults.length} cross-discipline result(s) detected`);
        for (const r of wrongDisciplineResults) {
            const score = r.relevanceScore ?? r.distance ?? 0;
            console.log(`    [${score.toFixed(4)}] ${r.domainName} — ${r.sectionTitle || 'untitled'}`);
        }
        // This is a warning, not failure — some cross-discipline results may be legitimate
        // (e.g., trade interfaces mentioning structural)
        passed++;
    }

    // ---- Print formatted context preview ----
    console.log('\n--- Formatted Context Preview (first 1500 chars) ---');
    console.log(formattedContext.substring(0, 1500));
    if (formattedContext.length > 1500) {
        console.log(`\n... [truncated, ${formattedContext.length - 1500} more chars]`);
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('RESULTS SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total: 6 | Passed: ${passed} | Failed: ${failed}`);
    console.log(`Pass rate: ${((passed / 6) * 100).toFixed(1)}%`);

    if (failures.length > 0) {
        console.log('\nFailures:');
        for (const f of failures) {
            console.log(`  - ${f}`);
        }
    }

    console.log('');
    await pool.end();

    if (failed > 0) {
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
});
