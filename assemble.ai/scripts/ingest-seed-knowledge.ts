/**
 * Seed Knowledge Ingestion Script
 *
 * Reads markdown files from src/lib/constants/knowledge-seed/,
 * chunks them, generates Voyage AI embeddings, and upserts into the RAG database.
 *
 * Idempotent: only re-ingests when source version changes.
 *
 * Run with: npx tsx scripts/ingest-seed-knowledge.ts
 */

import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { loadAppEnv } from '../src/lib/env/load-app-env';

// Load env vars BEFORE any module that reads process.env at import time.
// Use the same loader as the Next app/worker so the seed importer writes to
// the database the app actually reads from in local development.
loadAppEnv();

function generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================
// Main
// ============================================

async function main() {
    // Dynamic imports so rag-client sees the env vars loaded above
    const { eq } = await import('drizzle-orm');
    const { ragDb, pool } = await import('../src/lib/db/rag-client');
    const { documentSets } = await import('../src/lib/db/rag-schema');
    const { knowledgeDomainSources } = await import('../src/lib/db/knowledge-domain-sources-schema');
    const {
        hasSeedKnowledgeBodyContent,
        ingestSeedKnowledgeDocument,
        parseSeedKnowledgeMarkdown,
    } = await import('../src/lib/rag/ingestion');

    const seedDir = resolve(process.cwd(), 'src/lib/constants/knowledge-seed');
    const databaseEnv = process.env.DATABASE_URL
        ? 'DATABASE_URL'
        : process.env.SUPABASE_POSTGRES_URL
            ? 'SUPABASE_POSTGRES_URL'
            : 'missing';

    console.log(`Using RAG database from ${databaseEnv}`);

    let files: string[];
    try {
        files = readdirSync(seedDir).filter((f) => f.endsWith('.md'));
    } catch {
        console.error(`Seed directory not found: ${seedDir}`);
        process.exit(1);
    }

    if (files.length === 0) {
        console.log('No seed files found. Nothing to ingest.');
        return;
    }

    console.log(`Found ${files.length} seed file(s) in ${seedDir}\n`);

    let ingested = 0;
    let skipped = 0;

    for (const file of files) {
        const filePath = join(seedDir, file);
        const raw = readFileSync(filePath, 'utf-8');
        const { frontmatter: fm, body } = parseSeedKnowledgeMarkdown(raw);
        const documentId = `seed:${file.replace(/\.md$/, '')}`;

        console.log(`[${fm.domainSlug}] ${fm.name} v${fm.version}`);

        // 1. Check if already ingested at this version
        const existingSource = await ragDb
            .select({ sourceVersion: knowledgeDomainSources.sourceVersion })
            .from(knowledgeDomainSources)
            .innerJoin(documentSets, eq(documentSets.id, knowledgeDomainSources.documentSetId))
            .where(eq(documentSets.id, fm.domainSlug))
            .limit(1);

        if (existingSource.length > 0 && existingSource[0].sourceVersion === fm.version) {
            console.log(`  Skip — already ingested at v${fm.version}`);
            skipped++;
            continue;
        }

        // 2. Check for real content (not just placeholder comments)
        if (!hasSeedKnowledgeBodyContent(body)) {
            console.log(`  Skip — placeholder file (no content body)`);
            skipped++;
            continue;
        }

        // 3. Upsert document_set
        const existingSet = await ragDb
            .select({ id: documentSets.id })
            .from(documentSets)
            .where(eq(documentSets.id, fm.domainSlug))
            .limit(1);

        if (existingSet.length > 0) {
            await ragDb
                .update(documentSets)
                .set({
                    name: fm.name,
                    description: `${fm.name} — seed knowledge domain`,
                    repoType: fm.repoType as 'knowledge_practices' | 'knowledge_regulatory' | 'knowledge_templates',
                    domainType: fm.domainType as 'best_practices' | 'reference' | 'regulatory' | 'templates' | 'project_history' | 'custom',
                    domainTags: fm.tags,
                    isGlobal: true,
                    updatedAt: new Date(),
                })
                .where(eq(documentSets.id, fm.domainSlug));
        } else {
            await ragDb.insert(documentSets).values({
                id: fm.domainSlug,
                name: fm.name,
                description: `${fm.name} — seed knowledge domain`,
                repoType: fm.repoType as 'knowledge_practices' | 'knowledge_regulatory' | 'knowledge_templates',
                domainType: fm.domainType as 'best_practices' | 'reference' | 'regulatory' | 'templates' | 'project_history' | 'custom',
                domainTags: fm.tags,
                isGlobal: true,
            });
        }

        // 4. Upsert knowledge_domain_sources
        const existingKds = await ragDb
            .select({ id: knowledgeDomainSources.id })
            .from(knowledgeDomainSources)
            .where(eq(knowledgeDomainSources.documentSetId, fm.domainSlug))
            .limit(1);

        if (existingKds.length > 0) {
            await ragDb
                .update(knowledgeDomainSources)
                .set({
                    sourceType: 'prebuilt_seed',
                    sourceVersion: fm.version,
                    lastVerifiedAt: new Date(),
                    applicableProjectTypes: fm.applicableProjectTypes,
                    applicableStates: fm.applicableStates,
                    isActive: true,
                    updatedAt: new Date(),
                })
                .where(eq(knowledgeDomainSources.id, existingKds[0].id));
        } else {
            await ragDb.insert(knowledgeDomainSources).values({
                id: `kds_${generateId()}`,
                documentSetId: fm.domainSlug,
                sourceType: 'prebuilt_seed',
                sourceVersion: fm.version,
                lastVerifiedAt: new Date(),
                applicableProjectTypes: fm.applicableProjectTypes,
                applicableStates: fm.applicableStates,
                isActive: true,
            });
        }

        // 5. Load, chunk, embed, persist, and mark sync state through one ingestion state machine.
        const result = await ingestSeedKnowledgeDocument({
            client: ragDb,
            documentSetId: fm.domainSlug,
            documentId,
            createMemberId: () => `dsm_${generateId()}`,
            loadContent: () => raw,
        });

        console.log(`  Ingested ${result.chunks.length} chunks (${result.totalTokens} tokens)`);
        ingested++;
    }

    console.log(`\nDone: ${ingested} ingested, ${skipped} skipped`);
    await pool.end();
}

main().catch((err) => {
    console.error('Ingestion failed:', err);
    process.exit(1);
});
