import { Pool } from 'pg';
import { restoreProjectBackup } from '../src/lib/backup/project-backup';
import { loadAppEnv } from '../src/lib/env/load-app-env';

loadAppEnv();

type CliArgs = {
    backup?: string;
    projectId?: string;
    projectName?: string;
    organizationId?: string;
};

function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = {};

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--backup') {
            args.backup = argv[++index];
        } else if (arg === '--project-id') {
            args.projectId = argv[++index];
        } else if (arg === '--project-name') {
            args.projectName = argv[++index];
        } else if (arg === '--organization-id') {
            args.organizationId = argv[++index];
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
    console.log(
        `Usage: npm run project:restore -- --backup <backup.zip> ` +
        `[--project-id <new-project-id>] [--project-name "Restored Project"] [--organization-id <org-id>]`
    );
}

async function main(): Promise<void> {
    const args = parseArgs(process.argv.slice(2));
    if (!args.backup) {
        printUsage();
        process.exit(1);
    }

    const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL or SUPABASE_POSTGRES_URL is required.');
    }

    const pool = new Pool({ connectionString });
    try {
        const result = await restoreProjectBackup({
            pool,
            backupPath: args.backup,
            projectId: args.projectId,
            projectName: args.projectName,
            organizationId: args.organizationId,
        });

        const rowCount = Object.values(result.tableCounts).reduce((sum, count) => sum + count, 0);
        console.log(`Restore complete: ${result.projectName} (${result.projectId})`);
        console.log(`Restored ${rowCount} database rows from ${result.manifest.id}.`);
    } finally {
        await pool.end();
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
