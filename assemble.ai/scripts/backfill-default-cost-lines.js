/**
 * One-off Migration: Backfill Default Cost Lines to Existing Projects
 * Feature 009 - Default Financial Data
 *
 * Applies the default cost lines, sample variation, and sample invoice
 * to all existing projects that don't already have cost lines.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'sqlite.db');

// Default cost lines (matching src/lib/constants/default-cost-lines.ts)
const DEFAULT_COST_LINES = [
    // FEES Section (Cost Codes: 1.xx) - $100,000 total
    { section: 'FEES', costCode: '1.01', description: 'Council Fees', budgetCents: 2500000, sortOrder: 1 },
    { section: 'FEES', costCode: '1.02', description: 'Section 7.12 Levy', budgetCents: 5000000, sortOrder: 2 },
    { section: 'FEES', costCode: '1.03', description: 'Long Service Leave Levy', budgetCents: 1500000, sortOrder: 3 },
    { section: 'FEES', costCode: '1.04', description: 'Authority Fees', budgetCents: 1000000, sortOrder: 4 },

    // CONSULTANTS Section (Cost Codes: 2.xx) - $265,000 total
    { section: 'CONSULTANTS', costCode: '2.01', description: 'Project Manager', budgetCents: 5000000, sortOrder: 1 },
    { section: 'CONSULTANTS', costCode: '2.02', description: 'Architect', budgetCents: 8000000, sortOrder: 2 },
    { section: 'CONSULTANTS', costCode: '2.03', description: 'Town Planner', budgetCents: 1500000, sortOrder: 3 },
    { section: 'CONSULTANTS', costCode: '2.04', description: 'Structural Engineer', budgetCents: 2500000, sortOrder: 4 },
    { section: 'CONSULTANTS', costCode: '2.05', description: 'Civil Engineer', budgetCents: 1500000, sortOrder: 5 },
    { section: 'CONSULTANTS', costCode: '2.06', description: 'Surveyor', budgetCents: 800000, sortOrder: 6 },
    { section: 'CONSULTANTS', costCode: '2.07', description: 'BCA Consultant', budgetCents: 1200000, sortOrder: 7 },
    { section: 'CONSULTANTS', costCode: '2.08', description: 'Building Certifier', budgetCents: 2000000, sortOrder: 8 },
    { section: 'CONSULTANTS', costCode: '2.09', description: 'Quantity Surveyor', budgetCents: 2500000, sortOrder: 9 },
    { section: 'CONSULTANTS', costCode: '2.10', description: 'Fire Engineer', budgetCents: 1500000, sortOrder: 10 },

    // CONSTRUCTION Section (Cost Codes: 3.xx) - $455,000 total
    { section: 'CONSTRUCTION', costCode: '3.01', description: 'Prelims & Margin', budgetCents: 15000000, sortOrder: 1 },
    { section: 'CONSTRUCTION', costCode: '3.02', description: 'Fitout Works', budgetCents: 20000000, sortOrder: 2 },
    { section: 'CONSTRUCTION', costCode: '3.03', description: 'FF&E', budgetCents: 5000000, sortOrder: 3 },
    { section: 'CONSTRUCTION', costCode: '3.04', description: 'IT/AV Systems', budgetCents: 3000000, sortOrder: 4 },
    { section: 'CONSTRUCTION', costCode: '3.05', description: 'Landscaping', budgetCents: 2500000, sortOrder: 5 },

    // CONTINGENCY Section (Cost Codes: 4.xx) - $80,000 total
    { section: 'CONTINGENCY', costCode: '4.01', description: 'Construction Contingency', budgetCents: 8000000, sortOrder: 1 },
];

function runBackfill() {
    console.log('Running backfill: Default Cost Lines for Existing Projects...');
    console.log(`Database path: ${DB_PATH}`);

    if (!fs.existsSync(DB_PATH)) {
        console.log('Database does not exist. Nothing to backfill.');
        return;
    }

    const db = new Database(DB_PATH);

    try {
        // Get all projects
        const projects = db.prepare('SELECT id, name FROM projects').all();
        console.log(`Found ${projects.length} projects`);

        let backfilledCount = 0;
        let skippedCount = 0;

        for (const project of projects) {
            // Check if project already has cost lines
            const existingCostLines = db.prepare(
                'SELECT COUNT(*) as count FROM cost_lines WHERE project_id = ? AND deleted_at IS NULL'
            ).get(project.id);

            if (existingCostLines.count > 0) {
                console.log(`  Skipping "${project.name}" (${project.id}) - already has ${existingCostLines.count} cost lines`);
                skippedCount++;
                continue;
            }

            console.log(`  Backfilling "${project.name}" (${project.id})...`);

            // Start transaction for this project
            const backfillProject = db.transaction(() => {
                const now = new Date().toISOString();
                const costLineIds = {};

                // Insert default cost lines
                const insertCostLine = db.prepare(`
                    INSERT INTO cost_lines (id, project_id, company_id, section, cost_code, description, reference, budget_cents, approved_contract_cents, sort_order, created_at, updated_at)
                    VALUES (?, ?, NULL, ?, ?, ?, NULL, ?, 0, ?, ?, ?)
                `);

                for (const template of DEFAULT_COST_LINES) {
                    const id = crypto.randomUUID();
                    insertCostLine.run(
                        id,
                        project.id,
                        template.section,
                        template.costCode,
                        template.description,
                        template.budgetCents,
                        template.sortOrder,
                        now,
                        now
                    );
                    costLineIds[template.costCode] = id;
                }

                // Add sample variation linked to 2.02 Architect
                const architectCostLineId = costLineIds['2.02'];
                if (architectCostLineId) {
                    db.prepare(`
                        INSERT INTO variations (id, project_id, cost_line_id, variation_number, category, description, status, amount_forecast_cents, amount_approved_cents, created_at, updated_at)
                        VALUES (?, ?, ?, 'PV-001', 'Principal', 'Sample variation - delete if not needed', 'Forecast', 1000000, 0, ?, ?)
                    `).run(crypto.randomUUID(), project.id, architectCostLineId, now, now);
                }

                // Add sample invoice linked to 2.01 Project Manager
                const pmCostLineId = costLineIds['2.01'];
                if (pmCostLineId) {
                    const currentDate = new Date();
                    const invoiceDate = currentDate.toISOString().split('T')[0];
                    db.prepare(`
                        INSERT INTO invoices (id, project_id, cost_line_id, company_id, invoice_date, invoice_number, description, amount_cents, gst_cents, period_year, period_month, paid_status, created_at, updated_at)
                        VALUES (?, ?, ?, NULL, ?, 'INV-SAMPLE-001', 'Sample invoice - delete if not needed', 100000, 10000, ?, ?, 'unpaid', ?, ?)
                    `).run(
                        crypto.randomUUID(),
                        project.id,
                        pmCostLineId,
                        invoiceDate,
                        currentDate.getFullYear(),
                        currentDate.getMonth() + 1,
                        now,
                        now
                    );
                }

                return Object.keys(costLineIds).length;
            });

            const linesAdded = backfillProject();
            console.log(`    Added ${linesAdded} cost lines + sample variation + sample invoice`);
            backfilledCount++;
        }

        console.log('\n✅ Backfill complete:');
        console.log(`   ${backfilledCount} projects backfilled`);
        console.log(`   ${skippedCount} projects skipped (already had cost lines)`);

        db.close();
    } catch (error) {
        console.error('Backfill failed:', error.message);
        db.close();
        process.exit(1);
    }
}

runBackfill();
