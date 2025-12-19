import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { validateExcelFile } from '@/lib/excel-validation';
import { storage } from '@/lib/storage';
import { versioning } from '@/lib/versioning';
import { db, documents, versions, fileAssets, categories, subcategories, projects, consultantDisciplines, contractorTrades } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { eq, sql } from 'drizzle-orm';
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
            // Use onConflictDoNothing for upsert behavior (works with both SQLite and PostgreSQL)
            await db.insert(categories).values({
              id: categoryId,
              name: info.name,
              isSystem: true
            }).onConflictDoNothing();
          }
        }

        // 2.6. Ensure subcategory exists
        if (subcategoryId && categoryId) {
          const subcategoryName = formData.get('subcategoryName') as string | null;
          if (subcategoryName) {
            // Use onConflictDoNothing for upsert behavior (works with both SQLite and PostgreSQL)
            await db.insert(subcategories).values({
              id: subcategoryId,
              categoryId: categoryId,
              name: subcategoryName,
              isSystem: false
            }).onConflictDoNothing();
          }
        }

        // 3. Determine Versioning (T017)
        let documentId = await versioning.findMatchingDocument(file.name, projectId);
        let versionNumber = 1;
        let isNewDocument = false;

        if (documentId) {
            // Existing document found, increment version
            versionNumber = await versioning.getNextVersionNumber(documentId);
        } else {
            // New document - generate ID but don't insert yet
            documentId = uuidv4();
            isNewDocument = true;

            console.log('Creating new document with:', {
                id: documentId,
                projectId: projectId,
                categoryId: categoryId || null,
                subcategoryId: subcategoryId || null,
                filename: file.name
            });
        }

        // 4. Create Version record (T018)
        const versionId = uuidv4();

        // For new documents, insert document AND version together, then update latestVersionId
        // This ensures we never have orphaned documents without versions
        if (isNewDocument) {
            // Insert document first
            await db.insert(documents).values({
                id: documentId,
                projectId: projectId,
                categoryId: categoryId || null,
                subcategoryId: subcategoryId || null,
                latestVersionId: versionId, // Set latestVersionId immediately
            });
        }

        // Insert version
        await db.insert(versions).values({
            id: versionId,
            documentId: documentId!,
            fileAssetId: fileAssetId,
            versionNumber,
            uploadedBy: 'User', // Placeholder
        });

        // For existing documents, update latestVersionId
        if (!isNewDocument) {
            await db.update(documents)
                .set({ latestVersionId: versionId, updatedAt: new Date() })
                .where(eq(documents.id, documentId!));
        }

        // Verify the document has a valid latestVersionId
        const verifyDoc = await db.select({ latestVersionId: documents.latestVersionId })
            .from(documents)
            .where(eq(documents.id, documentId!))
            .limit(1);

        if (!verifyDoc[0]?.latestVersionId) {
            console.error(`[documents POST] CRITICAL: Document ${documentId} has no latestVersionId after creation!`);
            // Try to fix it
            await db.update(documents)
                .set({ latestVersionId: versionId, updatedAt: new Date() })
                .where(eq(documents.id, documentId!));
        }

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
        const categoryId = searchParams.get('categoryId');
        const subcategoryId = searchParams.get('subcategoryId');

        if (!projectId) {
            return NextResponse.json({ error: 'No project ID provided' }, { status: 400 });
        }

        // Build query with filters
        // Note: subcategoryId can reference either the legacy subcategories table,
        // or consultantDisciplines/contractorTrades tables. We join all and use COALESCE.
        let query = db.select({
            id: documents.id,
            categoryId: documents.categoryId,
            categoryName: categories.name,
            subcategoryId: documents.subcategoryId,
            subcategoryName: sql<string>`COALESCE(${subcategories.name}, ${consultantDisciplines.disciplineName}, ${contractorTrades.tradeName})`,
            updatedAt: documents.updatedAt,
            latestVersionId: documents.latestVersionId,
            originalName: fileAssets.originalName,
            mimeType: fileAssets.mimeType,
            sizeBytes: fileAssets.sizeBytes,
            versionNumber: versions.versionNumber,
            ocrStatus: fileAssets.ocrStatus,
        })
            .from(documents)
            .leftJoin(versions, eq(documents.latestVersionId, versions.id))
            .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .leftJoin(categories, eq(documents.categoryId, categories.id))
            .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
            .leftJoin(consultantDisciplines, eq(documents.subcategoryId, consultantDisciplines.id))
            .leftJoin(contractorTrades, eq(documents.subcategoryId, contractorTrades.id));

        // Apply filters using and() for multiple conditions
        const conditions = [eq(documents.projectId, projectId)];
        if (categoryId) {
            conditions.push(eq(documents.categoryId, categoryId));
        }
        if (subcategoryId) {
            conditions.push(eq(documents.subcategoryId, subcategoryId));
        }

        // Execute with all conditions
        const { and } = await import('drizzle-orm');
        const docs = await query.where(and(...conditions));

        // Post-process documents to handle missing originalName
        // (can happen if latestVersionId is NULL - orphaned documents)
        const docsWithFallback = await Promise.all(docs.map(async (doc) => {
            let result = { ...doc };

            // Fall back to category constants if categoryName is null but categoryId exists
            if (doc.categoryId && !doc.categoryName) {
                const categoryInfo = getCategoryById(doc.categoryId);
                if (categoryInfo) {
                    result.categoryName = categoryInfo.name;
                }
            }

            // If originalName is missing, try to recover from the latest version
            if (!doc.originalName) {
                try {
                    // Find the most recent version for this document
                    const latestVersion = await db.select({
                        originalName: fileAssets.originalName,
                        versionNumber: versions.versionNumber,
                        versionId: versions.id,
                        fileAssetId: versions.fileAssetId,
                    })
                        .from(versions)
                        .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
                        .where(eq(versions.documentId, doc.id))
                        .orderBy(sql`${versions.versionNumber} DESC`)
                        .limit(1);

                    if (latestVersion.length > 0 && latestVersion[0].originalName) {
                        result.originalName = latestVersion[0].originalName;
                        result.versionNumber = latestVersion[0].versionNumber;

                        // Also fix the document's latestVersionId while we're at it
                        if (!doc.latestVersionId && latestVersion[0].versionId) {
                            await db.update(documents)
                                .set({ latestVersionId: latestVersion[0].versionId, updatedAt: new Date() })
                                .where(eq(documents.id, doc.id));
                            console.log(`[documents GET] Auto-repaired latestVersionId for document ${doc.id}`);
                        }
                    }
                } catch (error) {
                    console.warn(`[documents GET] Failed to recover originalName for document ${doc.id}:`, error);
                }
            }

            return result;
        }));

        return NextResponse.json(docsWithFallback);
    });
}
