import { Pool } from 'pg';
import { createProjectBackup } from '../src/lib/backup/project-backup';
import { loadAppEnv } from '../src/lib/env/load-app-env';

loadAppEnv();

type CliArgs = {
    projectId?: string;
    out?: string;
};

function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = {};

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--project-id') {
            args.projectId = argv[++index];
        } else if (arg === '--out') {
            args.out = argv[++index];
        } else if (arg === '--help' || arg === '-h') {
            printUsage();
            process.exit(0);
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }

    return args;
}

function printUsage(): void {
    console.log(`Usage: npm run project:backup -- --project-id <project-id> [--out .sitewise-backups/project.zip]`);
}

async function main(): Promise<void> {
    const args = parseArgs(process.argv.slice(2));
    if (!args.projectId) {
        printUsage();
        process.exit(1);
    }

    const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL or SUPABASE_POSTGRES_URL is required.');
    }

    const pool = new Pool({ connectionString });
    try {
        const result = await createProjectBackup({
            pool,
            projectId: args.projectId,
            outputPath: args.out,
        });

        const fileCount = result.manifest.files.length;
        const rowCount = result.manifest.tables.reduce((sum, table) => sum + table.rowCount, 0);
        console.log(`Backup created: ${result.outputPath}`);
        console.log(`Project: ${result.manifest.source.projectName} (${result.manifest.source.projectId})`);
        console.log(`Captured ${rowCount} database rows and ${fileCount} local file payloads.`);
    } finally {
        await pool.end();
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
