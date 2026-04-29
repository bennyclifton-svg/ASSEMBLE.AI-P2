/**
 * Seed orchestrator for the Lighthouse Residences demo project.
 *
 * Usage:
 *   tsx scripts/seed-demo-project.ts          # create (aborts if project exists)
 *   tsx scripts/seed-demo-project.ts --reset  # delete existing then re-create
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { rmSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

import * as pgSchema from '@/lib/db/pg-schema';
import { OWNER_EMAIL, DEMO_PROJECT_NAME } from './seed-demo/data';
import { seedProfile } from './seed-demo/profile';
import { seedStakeholders } from './seed-demo/stakeholders';
import { seedCostPlan } from './seed-demo/cost-plan';
import { seedProgramme } from './seed-demo/programme';
import { seedVariations } from './seed-demo/variations';
import { seedHistoricalInvoices } from './seed-demo/invoices-historical';
import { seedNotes } from './seed-demo/notes';
import { seedMeetings } from './seed-demo/meetings';
import { seedReports } from './seed-demo/reports';
import { seedProcurement } from './seed-demo/procurement';
import { generateInvoicePdfs } from './seed-demo/generate-invoice-pdfs';

const args = process.argv.slice(2);
const RESET = args.includes('--reset');

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL;
if (!connectionString) {
  console.error('DATABASE_URL or SUPABASE_POSTGRES_URL is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  max: 5,
  ssl: process.env.NODE_ENV === 'production' || connectionString.includes('supabase')
    ? { rejectUnauthorized: false }
    : false,
});

const db = drizzle(pool, { schema: pgSchema });

const PROJECT_ROOT = join(__dirname, '..');
const PDF_OUT_DIR = join(PROJECT_ROOT, 'demo-uploads', 'invoices');

async function lookupOwner(): Promise<{ userId: string; organizationId: string }> {
  const r = await pool.query(
    `SELECT id, organization_id FROM "user" WHERE email = $1 LIMIT 1`,
    [OWNER_EMAIL]
  );
  if (r.rows.length === 0) throw new Error(`User not found: ${OWNER_EMAIL}`);
  const row = r.rows[0];
  if (!row.organization_id) throw new Error(`User ${OWNER_EMAIL} has no organization`);
  return { userId: row.id, organizationId: row.organization_id };
}

async function resetIfRequested(organizationId: string): Promise<void> {
  if (!RESET) return;

  const existing = await pool.query(
    `SELECT id FROM projects WHERE name = $1 AND organization_id = $2`,
    [DEMO_PROJECT_NAME, organizationId]
  );

  for (const { id: pid } of existing.rows) {
    console.log(`  Deleting existing project ${pid}...`);
    // Order matters - children first

    // Procurement (evaluations + TRR + RFT + addenda + legacy consultants)
    await pool.query(`DELETE FROM evaluation_non_price_cells WHERE criteria_id IN (SELECT id FROM evaluation_non_price_criteria WHERE evaluation_id IN (SELECT id FROM evaluations WHERE project_id = $1))`, [pid]);
    await pool.query(`DELETE FROM evaluation_non_price_criteria WHERE evaluation_id IN (SELECT id FROM evaluations WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM evaluation_cells WHERE row_id IN (SELECT id FROM evaluation_rows WHERE evaluation_id IN (SELECT id FROM evaluations WHERE project_id = $1) OR evaluation_price_id IN (SELECT id FROM evaluation_price WHERE project_id = $1))`, [pid]);
    await pool.query(`DELETE FROM evaluation_rows WHERE evaluation_id IN (SELECT id FROM evaluations WHERE project_id = $1) OR evaluation_price_id IN (SELECT id FROM evaluation_price WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM tender_submissions WHERE evaluation_id IN (SELECT id FROM evaluations WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM evaluations WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM evaluation_price WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM trr_transmittals WHERE trr_id IN (SELECT id FROM trr WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM trr WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM rft_new_transmittals WHERE rft_new_id IN (SELECT id FROM rft_new WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM rft_new WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM addendum_transmittals WHERE addendum_id IN (SELECT id FROM addenda WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM addenda WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM consultants WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM contractors WHERE project_id = $1`, [pid]);

    // Building + Objectives v2
    await pool.query(`DELETE FROM objectives_transmittals WHERE objectives_id IN (SELECT id FROM profiler_objectives WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM profiler_objectives WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM project_profiles WHERE project_id = $1`, [pid]);

    // Notes / meetings / reports / etc.
    await pool.query(`DELETE FROM note_transmittals WHERE note_id IN (SELECT id FROM notes WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM meeting_attendees WHERE meeting_id IN (SELECT id FROM meetings WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM meeting_sections WHERE meeting_id IN (SELECT id FROM meetings WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM meeting_transmittals WHERE meeting_id IN (SELECT id FROM meetings WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM report_attendees WHERE report_id IN (SELECT id FROM reports WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM report_sections WHERE report_id IN (SELECT id FROM reports WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM report_transmittals WHERE report_id IN (SELECT id FROM reports WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM meetings WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM meeting_groups WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM reports WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM report_groups WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM notes WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM invoices WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM variations WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM cost_line_comments WHERE cost_line_id IN (SELECT id FROM cost_lines WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM cost_line_allocations WHERE cost_line_id IN (SELECT id FROM cost_lines WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM cost_lines WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM program_dependencies WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM program_milestones WHERE activity_id IN (SELECT id FROM program_activities WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM program_activities WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM stakeholder_tender_statuses WHERE stakeholder_id IN (SELECT id FROM project_stakeholders WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM stakeholder_submission_statuses WHERE stakeholder_id IN (SELECT id FROM project_stakeholders WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM project_stakeholders WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM consultant_statuses WHERE discipline_id IN (SELECT id FROM consultant_disciplines WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM discipline_fee_items WHERE discipline_id IN (SELECT id FROM consultant_disciplines WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM consultant_disciplines WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM contractor_statuses WHERE trade_id IN (SELECT id FROM contractor_trades WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM trade_price_items WHERE trade_id IN (SELECT id FROM contractor_trades WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM contractor_trades WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM project_stages WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM project_objectives WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM project_details WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM stakeholders WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM risks WHERE project_id = $1`, [pid]);

    // Documents / categories / snapshots / history (auto-created during use)
    await pool.query(`DELETE FROM transmittal_items WHERE transmittal_id IN (SELECT id FROM transmittals WHERE project_id = $1)`, [pid]);
    await pool.query(`DELETE FROM transmittals WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM documents WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM category_visibility WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM subcategories WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM project_snapshots WHERE project_id = $1`, [pid]);
    await pool.query(`DELETE FROM revision_history WHERE project_id = $1`, [pid]);

    await pool.query(`DELETE FROM projects WHERE id = $1`, [pid]);
  }

  // Wipe generated PDFs
  if (existsSync(PDF_OUT_DIR)) {
    rmSync(PDF_OUT_DIR, { recursive: true, force: true });
  }
}

async function main() {
  console.log(`Lighthouse Residences demo seed${RESET ? ' (RESET MODE)' : ''}`);
  console.log('-----------------------------------------');

  const owner = await lookupOwner();
  console.log(`Owner: ${OWNER_EMAIL}`);
  console.log(`  userId         = ${owner.userId}`);
  console.log(`  organizationId = ${owner.organizationId}`);

  await resetIfRequested(owner.organizationId);

  // Abort if project already exists and not resetting
  if (!RESET) {
    const existing = await pool.query(
      `SELECT id FROM projects WHERE name = $1 AND organization_id = $2`,
      [DEMO_PROJECT_NAME, owner.organizationId]
    );
    if (existing.rows.length > 0) {
      console.error(
        `\nA project named "${DEMO_PROJECT_NAME}" already exists for this org. ` +
        `Re-run with --reset to wipe and rebuild.`
      );
      process.exit(1);
    }
  }

  // Single transaction for atomic seed
  const result = await db.transaction(async (tx) => {
    console.log('\n[1/10] Profile + Building + Objectives + side-effects...');
    const profile = await seedProfile(tx, owner);

    console.log('[2/10] Stakeholders (26 — incl TfNSW + FRNSW)...');
    const stakeholderIds = await seedStakeholders(tx, profile);

    console.log('[3/10] Cost plan (consultants split per stage)...');
    const costLineIds = await seedCostPlan(tx, profile, stakeholderIds);

    console.log('[4/10] Programme (28 activities + milestones)...');
    await seedProgramme(tx, profile);

    console.log('[5/10] Variations (6)...');
    await seedVariations(tx, profile, costLineIds);

    console.log('[6/10] Historical invoices (12)...');
    await seedHistoricalInvoices(tx, profile, costLineIds);

    console.log('[7/10] Notes (30 colour-coded)...');
    await seedNotes(tx, profile);

    console.log('[8/10] Meetings (6 with versioned subtabs)...');
    await seedMeetings(tx, profile, stakeholderIds);

    console.log('[9/10] Reports (6 with versioned subtabs)...');
    await seedReports(tx, profile, stakeholderIds);

    console.log('[10/10] Procurement (Architect + Structural — RFT, addendum, evaluations, TRR)...');
    await seedProcurement(tx, profile, stakeholderIds);

    return { projectId: profile.projectId };
  });

  console.log(`\nDB seed complete. projectId = ${result.projectId}`);

  // Generate invoice PDFs (outside transaction)
  if (!existsSync(PDF_OUT_DIR)) mkdirSync(PDF_OUT_DIR, { recursive: true });
  console.log('\nGenerating fresh-batch invoice PDFs...');
  await generateInvoicePdfs(PDF_OUT_DIR);

  console.log(`\nAll done. Open the project in the app, and use PDFs from:`);
  console.log(`  ${PDF_OUT_DIR}`);
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error('SEED FAILED:', err);
    pool.end();
    process.exit(1);
  });
