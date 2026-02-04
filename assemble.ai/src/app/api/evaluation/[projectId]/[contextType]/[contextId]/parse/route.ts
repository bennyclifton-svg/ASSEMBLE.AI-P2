/**
 * T044-T047: Tender Parse API Route
 * T080-T083: US7 - Full Price Schedule with auto-create unmapped rows
 * POST: Upload PDF, parse tender, map to evaluation rows
 * Feature 011 - Evaluation Report
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
    evaluations,
    evaluationRows,
    evaluationCells,
    documents,
    versions,
    fileAssets,
    categories,
    projectStakeholders,
    tenderSubmissions,
} from '@/lib/db';
import { eq, and, asc, desc, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@/lib/storage';
import { versioning } from '@/lib/versioning';
import { parseTenderForEvaluation } from '@/lib/services/tender-parser';
import type { TenderParseResult } from '@/types/evaluation';

interface RouteParams {
    params: Promise<{
        projectId: string;
        contextType: string;
        contextId: string;
    }>;
}

// T044-T047: POST - Parse tender PDF and populate evaluation cells
export async function POST(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { projectId, contextType, contextId } = await params;

        // Validate context type - now supports 'stakeholder' for unified model
        if (contextType !== 'stakeholder' && contextType !== 'discipline' && contextType !== 'trade') {
            return NextResponse.json(
                { error: 'Invalid context type. Must be "stakeholder".' },
                { status: 400 }
            );
        }

        // For backwards compatibility, treat all context types as stakeholder
        const _contextType = contextType; // Keep for reference

        // T045: Handle file upload
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const firmId = formData.get('firmId') as string | null;
        const evaluationPriceId = formData.get('evaluationPriceId') as string | null;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        if (!firmId) {
            return NextResponse.json(
                { error: 'No firm ID provided' },
                { status: 400 }
            );
        }

        // T039: Validate file type (PDF only)
        const filename = file.name.toLowerCase();
        if (!filename.endsWith('.pdf')) {
            return NextResponse.json(
                { error: 'Invalid file type. Only PDF files are accepted.' },
                { status: 400 }
            );
        }

        console.log(`[parse-route] Parsing tender for firm ${firmId}: ${file.name}`);

        // Get evaluation using stakeholderId
        const evaluation = await db.query.evaluations.findFirst({
            where: and(
                eq(evaluations.projectId, projectId),
                eq(evaluations.stakeholderId, contextId)
            ),
        });

        if (!evaluation) {
            return NextResponse.json(
                { error: 'Evaluation not found' },
                { status: 404 }
            );
        }

        // Get evaluation rows for mapping (filtered by evaluationPriceId if provided)
        const dbRows = await db.query.evaluationRows.findMany({
            where: evaluationPriceId
                ? and(
                    eq(evaluationRows.evaluationId, evaluation.id),
                    eq(evaluationRows.evaluationPriceId, evaluationPriceId)
                )
                : and(
                    eq(evaluationRows.evaluationId, evaluation.id),
                    isNull(evaluationRows.evaluationPriceId)
                ),
            orderBy: [asc(evaluationRows.orderIndex)],
        });

        console.log(`[parse-route] Found ${dbRows.length} evaluation rows for evaluation ${evaluation.id}`);
        dbRows.forEach((row, i) => {
            console.log(`[parse-route]   Row ${i + 1}: id=${row.id}, desc="${row.description}"`);
        });

        // Convert DB rows to EvaluationRow type (handle null -> undefined conversion)
        const rows = dbRows.map(row => ({
            ...row,
            isSystemRow: row.isSystemRow ?? undefined,
            createdAt: row.createdAt ?? undefined,
        }));

        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Parse tender and map to rows
        const parseResult: TenderParseResult = await parseTenderForEvaluation(
            buffer,
            file.name,
            rows,
            firmId
        );

        console.log(`[parse-route] Parse result: ${parseResult.items.length} items, confidence: ${parseResult.overallConfidence}`);

        // Check if parsing failed (no items and has errors)
        if (parseResult.items.length === 0 && parseResult.errors && parseResult.errors.length > 0) {
            console.error(`[parse-route] Parsing failed:`, parseResult.errors);
            return NextResponse.json(
                {
                    error: parseResult.errors[0] || 'Failed to extract pricing from document',
                    success: false,
                },
                { status: 400 }
            );
        }

        // T046: Upload PDF to document repository (Stakeholder category)
        let uploadedFileAssetId: string | null = null;
        let stakeholder: { id: string; name: string; stakeholderGroup: string | null } | undefined;
        try {
            const { path: storagePath, hash, size } = await storage.save(file, buffer);

            // Create FileAsset
            const fileAssetId = uuidv4();
            uploadedFileAssetId = fileAssetId;
            await db.insert(fileAssets).values({
                id: fileAssetId,
                storagePath,
                originalName: file.name,
                mimeType: file.type || 'application/pdf',
                sizeBytes: size,
                hash,
                ocrStatus: 'COMPLETED', // Already parsed
            });

            // Get stakeholder to determine category
            stakeholder = await db.query.projectStakeholders.findFirst({
                where: eq(projectStakeholders.id, contextId),
            });
            const isConsultant = stakeholder?.stakeholderGroup === 'consultant';
            const categoryId = isConsultant ? 'consultants' : 'contractors';
            const subcategoryId = contextId;

            // Ensure category exists (upsert)
            await db.insert(categories).values({
                id: categoryId,
                name: isConsultant ? 'Consultants' : 'Contractors',
                isSystem: true,
            }).onConflictDoNothing();

            // Check if a matching document exists (for versioning)
            let documentId = await versioning.findMatchingDocument(file.name, projectId);
            let versionNumber = 1;

            if (documentId) {
                // Existing document found - increment version
                versionNumber = await versioning.getNextVersionNumber(documentId);
                console.log(`[parse-route] Found existing document ${documentId}, creating version ${versionNumber}`);
            } else {
                // Create new document
                documentId = uuidv4();
                await db.insert(documents).values({
                    id: documentId,
                    projectId,
                    categoryId,
                    subcategoryId,
                });
                console.log(`[parse-route] Created new document ${documentId}`);
            }

            // Create version
            const versionId = uuidv4();
            await db.insert(versions).values({
                id: versionId,
                documentId,
                fileAssetId,
                versionNumber,
                uploadedBy: 'Tender Parse',
            });

            // Update document's latest version
            await db.update(documents)
                .set({ latestVersionId: versionId, updatedAt: new Date() })
                .where(eq(documents.id, documentId));

            console.log(`[parse-route] Uploaded to document repository: ${documentId}`);
        } catch (uploadError) {
            console.error('[parse-route] Failed to upload to document repository:', uploadError);
            // Continue even if upload fails - the parsing result is more important
        }

        // Determine firm type based on stakeholder group (fetch if not already fetched)
        if (!stakeholder) {
            stakeholder = await db.query.projectStakeholders.findFirst({
                where: eq(projectStakeholders.id, contextId),
            });
        }
        const firmType = stakeholder?.stakeholderGroup === 'consultant' ? 'consultant' : 'contractor';

        // T080: Create tender_submission record for audit trail
        // Store both included items and filtered items for transparency
        const submissionId = nanoid();
        await db.insert(tenderSubmissions).values({
            id: submissionId,
            evaluationId: evaluation.id,
            firmId,
            firmType,
            filename: file.name,
            fileAssetId: uploadedFileAssetId,
            parserUsed: 'claude',
            confidence: Math.round(parseResult.overallConfidence * 100),
            rawExtractedItems: JSON.stringify({
                included: parseResult.items,
                filtered: parseResult.filteredItems || [],
            }),
        });

        // Log filtered items for transparency
        if (parseResult.filteredItems && parseResult.filteredItems.length > 0) {
            console.log(`[parse-route] Filtered out ${parseResult.filteredItems.length} items (totals/unit rates):`);
            parseResult.filteredItems.forEach((item, i) => {
                console.log(`[parse-route]   ${i + 1}. "${item.description}" - ${item.filterReason}`);
            });
        }

        console.log(`[parse-route] Created tender submission record: ${submissionId}`);

        // Separate mapped and unmapped items
        const mappedItems = parseResult.items.filter(i => i.matchedRowId);
        const unmappedItems = parseResult.items.filter(i => !i.matchedRowId);

        console.log(`[parse-route] Mapped items: ${mappedItems.length}, Unmapped items: ${unmappedItems.length}`);
        mappedItems.forEach((item, i) => {
            console.log(`[parse-route]   Mapped ${i + 1}: rowId=${item.matchedRowId}, desc="${item.description}"`);
        });

        // Update evaluation cells with parsed amounts for MAPPED items
        for (const item of mappedItems) {
            if (!item.matchedRowId) continue;

            // Verify the row still exists before inserting cell
            const rowExists = await db.query.evaluationRows.findFirst({
                where: eq(evaluationRows.id, item.matchedRowId),
            });

            if (!rowExists) {
                console.warn(`[parse-route] Row ${item.matchedRowId} no longer exists, skipping cell insert`);
                continue;
            }

            // Check if cell exists
            const existingCell = await db.query.evaluationCells.findFirst({
                where: and(
                    eq(evaluationCells.rowId, item.matchedRowId),
                    eq(evaluationCells.firmId, firmId)
                ),
            });

            // Convert confidence from decimal (0.0-1.0) to integer percentage (0-100)
            const confidencePercent = Math.round((item.confidence || 0) * 100);

            if (existingCell) {
                // Update existing cell
                await db.update(evaluationCells)
                    .set({
                        amountCents: item.amountCents,
                        source: 'ai',
                        confidence: confidencePercent,
                        updatedAt: new Date(),
                    })
                    .where(eq(evaluationCells.id, existingCell.id));
            } else {
                // Create new cell
                await db.insert(evaluationCells).values({
                    id: nanoid(),
                    rowId: item.matchedRowId,
                    firmId,
                    firmType,
                    amountCents: item.amountCents,
                    source: 'ai',
                    confidence: confidencePercent,
                });
            }
        }

        // T081-T083: CREATE NEW ROWS for unmapped items (don't discard them!)
        const newRowsCreated: Array<{ rowId: string; description: string; amountCents: number }> = [];

        if (unmappedItems.length > 0) {
            console.log(`[parse-route] Creating ${unmappedItems.length} new rows for unmapped items`);

            // Get the highest order index for initial_price table (filtered by evaluationPriceId)
            const existingMaxOrder = await db.query.evaluationRows.findMany({
                where: evaluationPriceId
                    ? and(
                        eq(evaluationRows.evaluationId, evaluation.id),
                        eq(evaluationRows.tableType, 'initial_price'),
                        eq(evaluationRows.evaluationPriceId, evaluationPriceId)
                    )
                    : and(
                        eq(evaluationRows.evaluationId, evaluation.id),
                        eq(evaluationRows.tableType, 'initial_price'),
                        isNull(evaluationRows.evaluationPriceId)
                    ),
                orderBy: [desc(evaluationRows.orderIndex)],
                limit: 1,
            });

            let nextOrderIndex = existingMaxOrder.length > 0 ? existingMaxOrder[0].orderIndex + 1 : 0;

            for (const item of unmappedItems) {
                // T082: Create new row with source='ai_parsed' and sourceSubmissionId
                const newRowId = nanoid();
                await db.insert(evaluationRows).values({
                    id: newRowId,
                    evaluationId: evaluation.id,
                    evaluationPriceId: evaluationPriceId || undefined,
                    tableType: 'initial_price',
                    description: item.description,
                    orderIndex: nextOrderIndex,
                    source: 'ai_parsed',
                    sourceSubmissionId: submissionId,
                });

                // Create cell for this new row
                // Convert confidence from decimal (0.0-1.0) to integer percentage (0-100)
                const confidencePercent = Math.round((item.confidence || 0) * 100);
                await db.insert(evaluationCells).values({
                    id: nanoid(),
                    rowId: newRowId,
                    firmId,
                    firmType,
                    amountCents: item.amountCents,
                    source: 'ai',
                    confidence: confidencePercent,
                });

                newRowsCreated.push({
                    rowId: newRowId,
                    description: item.description,
                    amountCents: item.amountCents,
                });

                nextOrderIndex++;
            }

            console.log(`[parse-route] Created ${newRowsCreated.length} new rows for unmapped items`);
        }

        // T047: Return mapped amounts with confidence scores
        return NextResponse.json({
            success: true,
            data: {
                firmId,
                firmName: parseResult.firmName,
                submissionId, // Include submission ID for reference
                mappedItems: mappedItems.map(item => ({
                    rowId: item.matchedRowId,
                    description: item.description,
                    amountCents: item.amountCents,
                    confidence: item.confidence,
                })),
                // T081: Unmapped items are now created as new rows
                newRowsCreated,
                unmappedCount: 0, // All items are now accounted for
                overallConfidence: parseResult.overallConfidence,
                errors: parseResult.errors,
            },
        });
    } catch (error) {
        console.error('Error parsing tender:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: `Failed to parse tender document: ${errorMessage}` },
            { status: 500 }
        );
    }
}
