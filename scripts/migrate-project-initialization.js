/**
 * Migration Script: Project Initialization Backfill
 *
 * This script initializes planning data for existing projects that are missing:
 * - 36 consultant disciplines with 4 statuses each (144 status records)
 * - 21 contractor trades with 4 statuses each (84 status records)
 * - 5 project stages
 * - Project details (if missing)
 * - Project objectives (if missing)
 *
 * Related Spec: 008-project-initialization
 * Task: T100 in 003-planning-card/tasks.md
 *
 * Run with: node scripts/migrate-project-initialization.js
 */

const Database = require('better-sqlite3');
const crypto = require('crypto');

const db = new Database('sqlite.db');

// Consultant Disciplines (36 total) - must match disciplines.ts
const CONSULTANT_DISCIPLINES = [
    { name: 'Access', order: 1 },
    { name: 'Acoustic', order: 2 },
    { name: 'Arborist', order: 3 },
    { name: 'Architect', order: 4 },
    { name: 'ASP3', order: 5 },
    { name: 'BASIX', order: 6 },
    { name: 'Building Code Advice', order: 7 },
    { name: 'Bushfire', order: 8 },
    { name: 'Building Certifier', order: 9 },
    { name: 'Civil', order: 10 },
    { name: 'Cost Planning', order: 11 },
    { name: 'Ecology', order: 12 },
    { name: 'Electrical', order: 13 },
    { name: 'ESD', order: 14 },
    { name: 'Facade', order: 15 },
    { name: 'Fire Engineering', order: 16 },
    { name: 'Fire Services', order: 17 },
    { name: 'Flood', order: 18 },
    { name: 'Geotech', order: 19 },
    { name: 'Hazmat', order: 20 },
    { name: 'Hydraulic', order: 21 },
    { name: 'Interior Designer', order: 22 },
    { name: 'Landscape', order: 23 },
    { name: 'Mechanical', order: 24 },
    { name: 'NBN', order: 25 },
    { name: 'Passive Fire', order: 26 },
    { name: 'Roof Access', order: 27 },
    { name: 'Site Investigation', order: 28 },
    { name: 'Stormwater', order: 29 },
    { name: 'Structural', order: 30 },
    { name: 'Survey', order: 31 },
    { name: 'Traffic', order: 32 },
    { name: 'Vertical Transport', order: 33 },
    { name: 'Waste Management', order: 34 },
    { name: 'Wastewater', order: 35 },
    { name: 'Waterproofing', order: 36 },
];

// Contractor Trades (21 total) - must match disciplines.ts
const CONTRACTOR_TRADES = [
    { name: 'Concrete Finisher', order: 1 },
    { name: 'Steel Fixer', order: 2 },
    { name: 'Scaffolder', order: 3 },
    { name: 'Carpenter', order: 4 },
    { name: 'Bricklayer', order: 5 },
    { name: 'Roofer', order: 6 },
    { name: 'Glazier', order: 7 },
    { name: 'Waterproofer', order: 8 },
    { name: 'Plumber', order: 9 },
    { name: 'Electrician', order: 10 },
    { name: 'HVAC Technician', order: 11 },
    { name: 'Insulation Installer', order: 12 },
    { name: 'Drywaller', order: 13 },
    { name: 'Plasterer', order: 14 },
    { name: 'Tiler', order: 15 },
    { name: 'Flooring Installer', order: 16 },
    { name: 'Painter', order: 17 },
    { name: 'Cabinetmaker', order: 18 },
    { name: 'Mason', order: 19 },
    { name: 'Welder', order: 20 },
    { name: 'Landscaper', order: 21 },
];

const STATUS_TYPES = ['brief', 'tender', 'rec', 'award'];

const DEFAULT_STAGES = [
    { name: 'Initiation', number: 1 },
    { name: 'Scheme Design', number: 2 },
    { name: 'Detail Design', number: 3 },
    { name: 'Procurement', number: 4 },
    { name: 'Delivery', number: 5 },
];

function generateUUID() {
    return crypto.randomUUID();
}

function initializeProject(projectId, projectName) {
    const transaction = db.transaction(() => {
        // Check if disciplines already exist
        const existingDisciplines = db.prepare(
            'SELECT COUNT(*) as count FROM consultant_disciplines WHERE project_id = ?'
        ).get(projectId);

        if (existingDisciplines.count > 0) {
            console.log(`  Skipping disciplines - already initialized (${existingDisciplines.count} found)`);
        } else {
            // Create consultant disciplines
            const insertDiscipline = db.prepare(`
                INSERT INTO consultant_disciplines (id, project_id, discipline_name, is_enabled, "order")
                VALUES (?, ?, ?, 0, ?)
            `);
            const insertDisciplineStatus = db.prepare(`
                INSERT INTO consultant_statuses (id, discipline_id, status_type, is_active)
                VALUES (?, ?, ?, 0)
            `);

            for (const d of CONSULTANT_DISCIPLINES) {
                const disciplineId = generateUUID();
                insertDiscipline.run(disciplineId, projectId, d.name, d.order);

                for (const statusType of STATUS_TYPES) {
                    insertDisciplineStatus.run(generateUUID(), disciplineId, statusType);
                }
            }
            console.log(`  Created 36 consultant disciplines with 144 status records`);
        }

        // Check if trades already exist
        const existingTrades = db.prepare(
            'SELECT COUNT(*) as count FROM contractor_trades WHERE project_id = ?'
        ).get(projectId);

        if (existingTrades.count > 0) {
            console.log(`  Skipping trades - already initialized (${existingTrades.count} found)`);
        } else {
            // Create contractor trades
            const insertTrade = db.prepare(`
                INSERT INTO contractor_trades (id, project_id, trade_name, is_enabled, "order")
                VALUES (?, ?, ?, 0, ?)
            `);
            const insertTradeStatus = db.prepare(`
                INSERT INTO contractor_statuses (id, trade_id, status_type, is_active)
                VALUES (?, ?, ?, 0)
            `);

            for (const t of CONTRACTOR_TRADES) {
                const tradeId = generateUUID();
                insertTrade.run(tradeId, projectId, t.name, t.order);

                for (const statusType of STATUS_TYPES) {
                    insertTradeStatus.run(generateUUID(), tradeId, statusType);
                }
            }
            console.log(`  Created 21 contractor trades with 84 status records`);
        }

        // Check if stages already exist
        const existingStages = db.prepare(
            'SELECT COUNT(*) as count FROM project_stages WHERE project_id = ?'
        ).get(projectId);

        if (existingStages.count > 0) {
            console.log(`  Skipping stages - already initialized (${existingStages.count} found)`);
        } else {
            // Create project stages
            const insertStage = db.prepare(`
                INSERT INTO project_stages (id, project_id, stage_number, stage_name, status)
                VALUES (?, ?, ?, ?, 'not_started')
            `);

            for (const s of DEFAULT_STAGES) {
                insertStage.run(generateUUID(), projectId, s.number, s.name);
            }
            console.log(`  Created 5 project stages`);
        }

        // Check if project details already exist
        const existingDetails = db.prepare(
            'SELECT COUNT(*) as count FROM project_details WHERE project_id = ?'
        ).get(projectId);

        if (existingDetails.count > 0) {
            console.log(`  Skipping details - already initialized`);
        } else {
            // Create empty project details
            db.prepare(`
                INSERT INTO project_details (id, project_id, project_name, address)
                VALUES (?, ?, ?, '')
            `).run(generateUUID(), projectId, projectName);
            console.log(`  Created project details record`);
        }

        // Check if project objectives already exist
        const existingObjectives = db.prepare(
            'SELECT COUNT(*) as count FROM project_objectives WHERE project_id = ?'
        ).get(projectId);

        if (existingObjectives.count > 0) {
            console.log(`  Skipping objectives - already initialized`);
        } else {
            // Create empty project objectives
            db.prepare(`
                INSERT INTO project_objectives (id, project_id)
                VALUES (?, ?)
            `).run(generateUUID(), projectId);
            console.log(`  Created project objectives record`);
        }
    });

    transaction();
}

function main() {
    console.log('='.repeat(60));
    console.log('Project Initialization Migration');
    console.log('='.repeat(60));
    console.log('');

    // Get all projects
    const allProjects = db.prepare('SELECT id, name FROM projects').all();
    console.log(`Found ${allProjects.length} project(s) to check\n`);

    let initialized = 0;
    let skipped = 0;

    for (const project of allProjects) {
        console.log(`Processing: ${project.name} (${project.id})`);

        // Check if project needs initialization
        const disciplines = db.prepare(
            'SELECT COUNT(*) as count FROM consultant_disciplines WHERE project_id = ?'
        ).get(project.id);

        if (disciplines.count >= 36) {
            console.log(`  Already fully initialized - skipping\n`);
            skipped++;
            continue;
        }

        initializeProject(project.id, project.name);
        initialized++;
        console.log(`  ✓ Initialization complete\n`);
    }

    console.log('='.repeat(60));
    console.log(`Migration Summary:`);
    console.log(`  - Projects initialized: ${initialized}`);
    console.log(`  - Projects skipped (already complete): ${skipped}`);
    console.log(`  - Total projects: ${allProjects.length}`);
    console.log('='.repeat(60));
}

try {
    main();
    console.log('\nMigration completed successfully!');
} catch (error) {
    console.error('\nMigration failed:', error);
    process.exit(1);
}
