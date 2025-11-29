import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { validateExcelFile } from '@/lib/excel-validation';
import { storage } from '@/lib/storage/local';
import { versioning } from '@/lib/versioning';
import { db } from '@/lib/db';
import { documents, versions, fileAssets, categories, subcategories, projects } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { getCategoryById } from '@/lib/constants/categories';

export async function POST(request: NextRequest) {
    return handleApiError(async () => {
        try {
            const formData = await request.formData();
            const file = formData.get('file') as File | null;
            const projectId = formData.get('projectId') as string | null;
            const categoryId = formData.get('categoryId') as string | null;
            const subcategoryId = formData.get('subcategoryId') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!projectId) {
            return NextResponse.json({ error: 'No project ID provided' }, { status: 400 });
        }

        // Ensure project exists
        const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
        if (project.length === 0) {
            // Project doesn't exist, create it
            await db.insert(projects).values({
                id: projectId,
                name: projectId, // Use ID as name for now
                status: 'active'
            });
        }

        // 1. Save file to storage (T016)
        const buffer = Buffer.from(await file.arrayBuffer());

        // T042: Validate Excel files
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            const { isValid, error } = await validateExcelFile(buffer);
            if (!isValid) {
                return NextResponse.json({ error: error || 'Invalid Excel file' }, { status: 400 });
            }
        }

        const { path: storagePath, hash, size } = await storage.save(file, buffer);

        // 2. Create FileAsset record
        const fileAssetId = uuidv4();
        await db.insert(fileAssets).values({
            id: fileAssetId,
            storagePath,
            originalName: file.name,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: size,
            hash,
            ocrStatus: 'PENDING',
        });

        // 2.5. Ensure category exists
        if (categoryId) {
          const info = getCategoryById(categoryId);
          if (info) {
            try {
              // Try to insert the category (will fail silently if it already exists)
              await db.insert(categories).values({
                id: categoryId,
                name: info.name,
                isSystem: true
              });
            } catch (err: any) {
              console.log('Category insert error (may be normal if already exists):', {
                code: err?.code,
                message: err?.message,
                categoryId
              });
              // Ignore UNIQUE constraint errors (category already exists)
              // SQLite error codes can vary - check message too
              const isConstraintError =
                err?.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
                err?.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' ||
                err?.code === 'SQLITE_CONSTRAINT' ||
                err?.message?.includes('UNIQUE') ||
                err?.message?.includes('PRIMARY');

              if (!isConstraintError) {
                console.error('Unexpected error inserting category:', err);
                throw err;
              }
            }
          }
        }

        // 3. Determine Versioning (T017)
        let documentId = await versioning.findMatchingDocument(file.name, projectId);
        let versionNumber = 1;

        if (documentId) {
            // Existing document found, increment version
            versionNumber = await versioning.getNextVersionNumber(documentId);
        } else {
            // New document
            documentId = uuidv4();

            // Note: We only use categoryId for now. subcategoryId has FK constraint to old subcategories table
            // which we're not populating. We'll just store categoryId for categorization.
            console.log('Creating new document with:', {
                id: documentId,
                projectId: projectId,
                categoryId: categoryId || null,
                filename: file.name
            });

            await db.insert(documents).values({
                id: documentId,
                projectId: projectId,
                categoryId: categoryId || null,
                // Not setting subcategoryId to avoid FK constraint issues
            });
        }

        // 4. Create Version record (T018)
        const versionId = uuidv4();
        await db.insert(versions).values({
            id: versionId,
            documentId: documentId!,
            fileAssetId: fileAssetId,
            versionNumber,
            uploadedBy: 'User', // Placeholder
        });

        // Update document's latest version pointer
        await db.update(documents)
            .set({ latestVersionId: versionId, updatedAt: new Date().toISOString() })
            .where(eq(documents.id, documentId!));

        return NextResponse.json({
            success: true,
            documentId,
            versionId,
            versionNumber,
            fileAssetId,
        });
        } catch (error) {
            console.error("API /documents ERROR:", error);
            throw error; // Re-throw to let handleApiError deal with it
        }
    });
}

export async function GET(request: NextRequest) {
    return handleApiError(async () => {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json({ error: 'No project ID provided' }, { status: 400 });
        }

        // Fetch all documents for the specified project with their latest version and file asset
        const docs = await db.select({
            id: documents.id,
            categoryId: documents.categoryId,
            categoryName: categories.name,
            subcategoryId: documents.subcategoryId,
            subcategoryName: subcategories.name,
            updatedAt: documents.updatedAt,
            latestVersionId: documents.latestVersionId,
            originalName: fileAssets.originalName,
            mimeType: fileAssets.mimeType,
            sizeBytes: fileAssets.sizeBytes,
            versionNumber: versions.versionNumber,
            ocrStatus: fileAssets.ocrStatus,
        })
            .from(documents)
            .where(eq(documents.projectId, projectId))
            .leftJoin(versions, eq(documents.latestVersionId, versions.id))
            .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .leftJoin(categories, eq(documents.categoryId, categories.id))
            .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id));

        return NextResponse.json(docs);
    });
}
