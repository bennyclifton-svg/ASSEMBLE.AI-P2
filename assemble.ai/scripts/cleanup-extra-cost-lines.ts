/**
 * Cleanup script to remove duplicate/extra cost lines
 * Run with: npx tsx scripts/cleanup-extra-cost-lines.ts
 */

import { db } from '../src/lib/db';
import { costLines } from '../src/lib/db/pg-schema';
import { eq, and, inArray } from 'drizzle-orm';

async function cleanup() {
    const projectId = '1769906526925-3fq62wsxy';
    const stakeholderId = 'dU-FnhEz1p4Xaqe1YVZTM'; // Architecture

    // Find cost lines to delete (duplicates and Phase A)
    const linesToDelete = await db.query.costLines.findMany({
        where: and(
            eq(costLines.projectId, projectId),
            eq(costLines.stakeholderId, stakeholderId),
            eq(costLines.section, 'CONSULTANTS'),
            inArray(costLines.activity, ['Architecture', 'Phase A'])
        ),
    });

    console.log('Found cost lines to delete:', linesToDelete.length);
    console.log(linesToDelete.map(l => ({ id: l.id, activity: l.activity })));

    if (linesToDelete.length > 0) {
        const ids = linesToDelete.map(l => l.id);
        await db.delete(costLines).where(inArray(costLines.id, ids));
        console.log('Deleted', ids.length, 'cost lines');
    }

    // Verify remaining
    const remaining = await db.query.costLines.findMany({
        where: and(
            eq(costLines.projectId, projectId),
            eq(costLines.stakeholderId, stakeholderId),
            eq(costLines.section, 'CONSULTANTS')
        ),
    });
    
    console.log('\nRemaining cost lines:', remaining.length);
    console.log(remaining.map(l => ({ activity: l.activity })));
}

cleanup().catch(console.error);
