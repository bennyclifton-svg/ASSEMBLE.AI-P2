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

// Load env vars BEFORE any module that reads process.env at import time
import { config } from 'dotenv';
import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

config({ path: '.env.local' });
config({ path: '.env' });

// ============================================
// Types
// ============================================

interface SeedFrontmatter {
    domainSlug: string;
    name: string;
    domainType: string;
    tags: string[];
    version: string;
    repoType: string;
    applicableProjectTypes: string[];
    applicableStates: string[];
}

// ============================================
// Helpers
// ============================================

function parseFrontmatter(raw: string): { frontmatter: SeedFrontmatter; body: string } {
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) {
        throw new Error('Missing or malformed YAML frontmatter');
    }

    const lines = match[1].split('\n').map((l) => l.replace(/\r$/, ''));
    const body = match[2];
    const fm: Record<string, string | string[]> = {};

    for (const line of lines) {
        const kv = line.match(/^(\w+):\s*(.*)$/);
        if (!kv) continue;
        const [, key, value] = kv;
        const trimmed = value.trim();

        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            fm[key] = trimmed
                .slice(1, -1)
                .split(',')
                .map((s) => s.trim().replace(/^["']|["']$/g, ''));
        } else {
            fm[key] = trimmed.replace(/^["']|["']$/g, '');
        }
    }

    return { frontmatter: fm as unknown as SeedFrontmatter, body };
}

function hasRealContent(body: string): boolean {
    const stripped = body.replace(/<!--[\s\S]*?-->/g, '').trim();
    return stripped.length > 20;
}

function generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================
// Main
// ============================================

async function main() {
    // Dynamic imports so rag-client sees the env vars loaded above
    const { eq, and } = await import('drizzle-orm');
    const { ragDb, pool } = await import('../src/lib/db/rag-client');
    const { documentSets, documentChunks, documentSetMembers } = await import('../src/lib/db/rag-schema');
    const { knowledgeDomainSources } = await import('../src/lib/db/knowledge-domain-sources-schema');
    const { chunkSeedContent } = await import('../src/lib/rag/chunking');
    const { generateEmbeddings } = await import('../src/lib/rag/embeddings');
    const { chunksToDocumentChunkRows, RAG_SYNC_STATUS } = await import('../src/lib/rag/ingestion');

    const seedDir = resolve(process.cwd(), 'src/lib/constants/knowledge-seed');

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
        const { frontmatter: fm, body } = parseFrontmatter(raw);
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
        if (!hasRealContent(body)) {
            console.log(`  Skip — placeholder file (no content body)`);
            skipped++;
            continue;
        }

        // 3. Chunk the content
        const chunks = chunkSeedContent(raw);
        console.log(`  Chunked into ${chunks.length} chunk(s)`);

        if (chunks.length === 0) {
            console.log(`  Skip — no chunks produced`);
            skipped++;
            continue;
        }

        // 4. Generate embeddings via Voyage AI (batched at 128)
        console.log(`  Generating embeddings...`);
        const { embeddings, totalTokens } = await generateEmbeddings(
            chunks.map((c) => c.content)
        );
        console.log(`  ${embeddings.length} embeddings (${totalTokens} tokens)`);

        // 5. Upsert document_set
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

        // 6. Upsert knowledge_domain_sources
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

        // 7. Delete old chunks for this seed document
        await ragDb
            .delete(documentChunks)
            .where(eq(documentChunks.documentId, documentId));

        // 8. Insert new chunks with embeddings
        const chunkRows = chunksToDocumentChunkRows(documentId, chunks, embeddings);

        // Batch insert (drizzle handles array of values)
        await ragDb.insert(documentChunks).values(chunkRows);

        // 9. Upsert document_set_members
        const existingMember = await ragDb
            .select({ id: documentSetMembers.id })
            .from(documentSetMembers)
            .where(
                and(
                    eq(documentSetMembers.documentSetId, fm.domainSlug),
                    eq(documentSetMembers.documentId, documentId)
                )
            )
            .limit(1);

        if (existingMember.length > 0) {
            await ragDb
                .update(documentSetMembers)
                .set({
                    syncStatus: RAG_SYNC_STATUS.synced,
                    syncedAt: new Date(),
                    chunksCreated: chunks.length,
                    errorMessage: null,
                })
                .where(eq(documentSetMembers.id, existingMember[0].id));
        } else {
            await ragDb.insert(documentSetMembers).values({
                id: `dsm_${generateId()}`,
                documentSetId: fm.domainSlug,
                documentId,
                syncStatus: RAG_SYNC_STATUS.synced,
                syncedAt: new Date(),
                chunksCreated: chunks.length,
            });
        }

        console.log(`  Ingested ${chunks.length} chunks`);
        ingested++;
    }

    console.log(`\nDone: ${ingested} ingested, ${skipped} skipped`);
    await pool.end();
}

main().catch((err) => {
    console.error('Ingestion failed:', err);
    process.exit(1);
});
