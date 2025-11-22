import { db } from './db';
import { documents, versions, fileAssets } from './db/schema';
import { eq, desc } from 'drizzle-orm';

export class VersioningService {
    // Regex to detect version patterns like v1, V2, revA, -1, etc.
    // Matches: (v|V|rev|Rev)?[-_.]?(\d+|[a-zA-Z])
    // This is a heuristic; we'll refine it.
    // For now, we primarily rely on the "Base Name" concept.
    // If "Plan.pdf" exists, and we upload "Plan_v2.pdf", we need to detect "Plan" as the base.

    /**
     * Attempts to find an existing document that matches the uploaded filename within the specified project.
     * Returns the Document ID if found, or null.
     */
    async findMatchingDocument(filename: string, projectId: string): Promise<string | null> {
        // 1. Clean the filename to find a "base name"
        // Remove extension
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");

        // Simple heuristic: Remove trailing version indicators
        // e.g., "Project_Plan_v2" -> "Project_Plan"
        // e.g., "Project_Plan_FINAL" -> "Project_Plan"
        const baseName = nameWithoutExt.replace(/[-_.]?(v\d+|rev\w+|final|draft)\s*$/i, "");

        // 2. Search DB for documents where the original name of the FIRST version matches this base name
        // This is complex in SQL. For MVP, we might just look for exact matches on the "originalName" of existing file assets
        // and see if they are linked to a document.

        // Let's try a simpler approach for MVP:
        // Look for any FileAsset whose originalName starts with the baseName
        // AND belongs to a document.

        // Actually, the requirement is: "System MUST automatically detect version patterns... and stack them."
        // If I upload "Foo.pdf" (docId: A), then "Foo_v2.pdf", it should detect "Foo" matches "Foo.pdf".

        // Strategy:
        // Find all documents.
        // For each document, get its "latest version" file name.
        // Check if the new filename is a "version" of that existing name.

        // Optimization: This is slow if we scan all.
        // Better: We only support stacking if the user explicitly says so OR if the names are very similar.
        // Let's implement a strict match for now:
        // If "Foo.pdf" exists, "Foo.pdf" (exact match) triggers versioning prompt (or auto-stack if we want).
        // If "Foo_v2.pdf" comes in, we strip "_v2" -> "Foo". Search for "Foo.pdf".

        const candidates = await db.select({
            docId: versions.documentId,
            originalName: fileAssets.originalName
        })
            .from(versions)
            .innerJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .innerJoin(documents, eq(versions.documentId, documents.id))
            .where(eq(documents.projectId, projectId));

        for (const cand of candidates) {
            const candName = cand.originalName.replace(/\.[^/.]+$/, "");
            // If the new file's base name matches an existing file's name (exactly or close enough)
            if (baseName === candName || baseName.startsWith(candName)) {
                return cand.docId;
            }
        }

        return null;
    }

    /**
     * Determines the next version number for a document.
     */
    async getNextVersionNumber(documentId: string): Promise<number> {
        const existingVersions = await db.select()
            .from(versions)
            .where(eq(versions.documentId, documentId))
            .orderBy(desc(versions.versionNumber))
            .limit(1);

        if (existingVersions.length === 0) return 1;
        return existingVersions[0].versionNumber + 1;
    }
}

export const versioning = new VersioningService();
