/**
 * One-time migration: convert legacy profilerObjectives 2-blob model to
 * per-row entries in projectObjectives.
 *
 * Usage:
 *   npx tsx scripts/migrate-objectives-to-rows.ts
 *   npm run migrate:objectives
 *
 * Safe to re-run — skips any project that already has non-deleted
 * rows in project_objectives.
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, isNull, or } from 'drizzle-orm';

import { profilerObjectives } from '@/lib/db/pg-schema';
import { projectObjectives } from '@/lib/db/objectives-schema';

// ─── DB Connection ─────────────────────────────────────────────────────────

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL;
if (!connectionString) {
  console.error('ERROR: DATABASE_URL or SUPABASE_POSTGRES_URL is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  max: 5,
  ssl:
    process.env.NODE_ENV === 'production' || connectionString.includes('supabase')
      ? { rejectUnauthorized: false }
      : false,
});

const db = drizzle(pool, {
  schema: {
    profilerObjectives,
    projectObjectives,
  },
});

// ─── HTML Parsing ───────────────────────────────────────────────────────────

/**
 * Strip all HTML tags from a string, returning plain text.
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Extract text items from an HTML blob.
 *
 * Strategy:
 *  1. If <li> elements exist, extract their inner content (stripped of tags).
 *  2. Otherwise, split on newlines and strip tags from each fragment.
 *
 * Empty / whitespace-only items are discarded.
 */
function extractItems(html: string): string[] {
  if (!html || !html.trim()) return [];

  // Try <li> extraction first
  const liMatches = html.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
  if (liMatches && liMatches.length > 0) {
    return liMatches
      .map((li) => stripHtml(li))
      .filter((s) => s.length > 0);
  }

  // Fall back to newline split
  return html
    .split('\n')
    .map((line) => stripHtml(line))
    .filter((s) => s.length > 0);
}

// ─── Blob shape ─────────────────────────────────────────────────────────────

interface ObjectiveBlob {
  content?: string;
  source?: string;
  [key: string]: unknown;
}

/**
 * Safely parse a column value that may already be an object or a JSON string.
 * Returns null when the blob is unusable / has no content.
 */
function parseBlob(raw: unknown): ObjectiveBlob | null {
  if (!raw) return null;

  let parsed: unknown;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Not JSON — treat the raw string itself as the content
      return { content: raw };
    }
  } else {
    parsed = raw;
  }

  if (typeof parsed === 'object' && parsed !== null) {
    return parsed as ObjectiveBlob;
  }

  return null;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== migrate-objectives-to-rows ===');
  console.log('Fetching all profiler_objectives rows...\n');

  // Fetch all legacy rows
  const legacyRows = await db.select().from(profilerObjectives);

  if (legacyRows.length === 0) {
    console.log('No rows found in profiler_objectives. Nothing to migrate.');
    return;
  }

  console.log(`Found ${legacyRows.length} legacy row(s) to inspect.\n`);

  let skipped = 0;
  let migrated = 0;
  let empty = 0;

  for (const row of legacyRows) {
    const projectId = row.projectId;

    // ── Idempotency check ─────────────────────────────────────────────────
    const existing = await db
      .select({ id: projectObjectives.id })
      .from(projectObjectives)
      .where(
        and(
          eq(projectObjectives.projectId, projectId),
          or(eq(projectObjectives.isDeleted, false), isNull(projectObjectives.isDeleted))
        )
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(`[SKIP]    project ${projectId} — already has rows in project_objectives`);
      skipped++;
      continue;
    }

    // ── Parse blobs ────────────────────────────────────────────────────────
    const functionalBlob = parseBlob(row.functionalQuality);
    const planningBlob = parseBlob(row.planningCompliance);

    const functionalItems = functionalBlob?.content
      ? extractItems(functionalBlob.content)
      : [];
    const planningItems = planningBlob?.content
      ? extractItems(planningBlob.content)
      : [];

    const totalItems = functionalItems.length + planningItems.length;

    if (totalItems === 0) {
      console.log(`[EMPTY]   project ${projectId} — no items to insert (blobs have no content)`);
      empty++;
      continue;
    }

    // ── Insert inside a transaction ────────────────────────────────────────
    await db.transaction(async (tx) => {
      const insertRows: (typeof projectObjectives.$inferInsert)[] = [];

      for (let i = 0; i < functionalItems.length; i++) {
        insertRows.push({
          id: crypto.randomUUID(),
          projectId,
          objectiveType: 'functional',
          source: 'explicit',
          status: 'draft',
          text: functionalItems[i],
          sortOrder: i,
          isDeleted: false,
        });
      }

      for (let i = 0; i < planningItems.length; i++) {
        insertRows.push({
          id: crypto.randomUUID(),
          projectId,
          objectiveType: 'planning',
          source: 'explicit',
          status: 'draft',
          text: planningItems[i],
          sortOrder: i,
          isDeleted: false,
        });
      }

      await tx.insert(projectObjectives).values(insertRows);
    });

    console.log(
      `[MIGRATED] project ${projectId} — functional: ${functionalItems.length}, planning: ${planningItems.length}`
    );
    migrated++;
  }

  console.log('\n=== Migration complete ===');
  console.log(`  Migrated : ${migrated}`);
  console.log(`  Skipped  : ${skipped}`);
  console.log(`  Empty    : ${empty}`);
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
