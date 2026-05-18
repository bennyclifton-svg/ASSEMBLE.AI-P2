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
    tenderSubmissionPackages,
    tenderSubmissions,
} from '@/lib/db';
import { eq, and, asc, desc, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@/lib/storage';
import { versioning } from '@/lib/versioning';
import { generateAiStableKey } from '@/lib/evaluation/tender-commercial';
import { applyRecommendationEvent } from '@/lib/evaluation/recommendation-state';
import { storeArtefact } from '@/lib/evaluation/artefact-store';
import { parseTenderForEvaluation } from '@/lib/services/tender-parser';
import type { EvaluationRow, EvaluationRowSource, EvaluationTableType, TenderParseResult } from '@/types/evaluation';

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
        const rows: EvaluationRow[] = dbRows.map(row => ({
            ...row,
            evaluationId: row.evaluationId || evaluation.id,
            tableType: row.tableType as EvaluationTableType,
            source: row.source as EvaluationRowSource | undefined,
            vmAdoptionStatus: row.vmAdoptionStatus as EvaluationRow['vmAdoptionStatus'],
            vmOrigin: row.vmOrigin as EvaluationRow['vmOrigin'],
            isSystemRow: row.isSystemRow ?? undefined,
            createdAt: row.createdAt?.toISOString(),
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
        let uploadedDocumentId: string | null = null;
        let uploadedVersionId: string | null = null;
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
            uploadedDocumentId = documentId;

            // Create version
            const versionId = uuidv4();
            uploadedVersionId = versionId;
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

        const existingPackage = await db.query.tenderSubmissionPackages.findFirst({
            where: evaluationPriceId
                ? and(
                    eq(tenderSubmissionPackages.evaluationId, evaluation.id),
                    eq(tenderSubmissionPackages.evaluationPriceId, evaluationPriceId),
                    eq(tenderSubmissionPackages.firmId, firmId),
                    eq(tenderSubmissionPackages.firmType, firmType)
                )
                : and(
                    eq(tenderSubmissionPackages.evaluationId, evaluation.id),
                    isNull(tenderSubmissionPackages.evaluationPriceId),
                    eq(tenderSubmissionPackages.firmId, firmId),
                    eq(tenderSubmissionPackages.firmType, firmType)
                ),
        });

        const packageId = existingPackage?.id || nanoid();
        if (existingPackage) {
            await db.update(tenderSubmissionPackages)
                .set({ updatedAt: new Date(), status: 'active' })
                .where(eq(tenderSubmissionPackages.id, packageId));
        } else {
            await db.insert(tenderSubmissionPackages).values({
                id: packageId,
                evaluationId: evaluation.id,
                evaluationPriceId: evaluationPriceId || undefined,
                firmId,
                firmType,
                status: 'active',
            });
        }

        // T080: Create tender_submission record for audit trail
        // Store both included items and filtered items for transparency
        const submissionId = nanoid();
        await db.insert(tenderSubmissions).values({
            id: submissionId,
            evaluationId: evaluation.id,
            packageId,
            evaluationPriceId: evaluationPriceId || undefined,
            firmId,
            firmType,
            filename: file.name,
            documentId: uploadedDocumentId,
            versionId: uploadedVersionId,
            fileAssetId: uploadedFileAssetId,
            parserUsed: 'claude',
            confidence: Math.round(parseResult.overallConfidence * 100),
            rawExtractedItems: JSON.stringify({
                includedCount: parseResult.items.length,
                filteredCount: parseResult.filteredItems?.length || 0,
            }),
        });

        try {
            const artefact = await storeArtefact({
                kind: 'full_extraction',
                content: {
                    included: parseResult.items,
                    filtered: parseResult.filteredItems || [],
                    filename: file.name,
                },
                relations: {
                    evaluationId: evaluation.id,
                    evaluationPriceId: evaluationPriceId || null,
                    packageId,
                    submissionId,
                },
                metadata: {
                    parserUsed: 'claude',
                    confidence: parseResult.overallConfidence,
                },
            });

            await db.update(tenderSubmissions)
                .set({
                    rawExtractedItems: JSON.stringify({
                        artefactId: artefact.id,
                        includedCount: parseResult.items.length,
                        filteredCount: parseResult.filteredItems?.length || 0,
                    }),
                })
                .where(eq(tenderSubmissions.id, submissionId));
        } catch (artefactError) {
            console.warn('[parse-route] Failed to store full extraction artefact:', artefactError);
            await db.update(tenderSubmissions)
                .set({
                    rawExtractedItems: JSON.stringify({
                        included: parseResult.items,
                        filtered: parseResult.filteredItems || [],
                    }),
                })
                .where(eq(tenderSubmissions.id, submissionId));
        }

        // Log filtered items for transparency
        if (parseResult.filteredItems && parseResult.filteredItems.length > 0) {
            console.log(`[parse-route] Filtered out ${parseResult.filteredItems.length} items (totals/unit rates):`);
            parseResult.filteredItems.forEach((item, i) => {
                console.log(`[parse-route]   ${i + 1}. "${item.description}" - ${item.filterReason}`);
            });
        }

        console.log(`[parse-route] Created tender submission record: ${submissionId}`);

        const nextRecommendationState = applyRecommendationEvent(
            (evaluation.recommendationState ?? 'draft') as 'draft' | 'conditional' | 'final',
            'new_tender_file_attached'
        );
        if (nextRecommendationState !== evaluation.recommendationState) {
            await db.update(evaluations)
                .set({ recommendationState: nextRecommendationState, updatedAt: new Date() })
                .where(eq(evaluations.id, evaluation.id));
        }

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
                        valueType: 'amount',
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
                    valueType: 'amount',
                    source: 'ai',
                    confidence: confidencePercent,
                });
            }
        }

        // T081-T083: CREATE NEW ROWS for unmapped items (don't discard them!)
        const newRowsCreated: Array<{
            rowId: string;
            description: string;
            amountCents: number;
            tableType: EvaluationTableType;
        }> = [];

        if (unmappedItems.length > 0) {
            console.log(`[parse-route] Creating ${unmappedItems.length} new rows for unmapped items`);

            const nextOrderByTable = new Map<EvaluationTableType, number>();
            const getNextOrderIndex = async (tableType: EvaluationTableType) => {
                const existingNextOrder = nextOrderByTable.get(tableType);
                if (existingNextOrder !== undefined) {
                    nextOrderByTable.set(tableType, existingNextOrder + 1);
                    return existingNextOrder;
                }

                const existingMaxOrder = await db.query.evaluationRows.findMany({
                    where: evaluationPriceId
                        ? and(
                            eq(evaluationRows.evaluationId, evaluation.id),
                            eq(evaluationRows.tableType, tableType),
                            eq(evaluationRows.evaluationPriceId, evaluationPriceId)
                        )
                        : and(
                            eq(evaluationRows.evaluationId, evaluation.id),
                            eq(evaluationRows.tableType, tableType),
                            isNull(evaluationRows.evaluationPriceId)
                        ),
                    orderBy: [desc(evaluationRows.orderIndex)],
                    limit: 1,
                });

                const nextOrderIndex = existingMaxOrder.length > 0 ? existingMaxOrder[0].orderIndex + 1 : 0;
                nextOrderByTable.set(tableType, nextOrderIndex + 1);
                return nextOrderIndex;
            };

            for (const item of unmappedItems) {
                // T082: Create new row with source='ai_parsed' and sourceSubmissionId
                const newRowId = nanoid();
                const tableType = item.tableType || 'initial_price';
                const isValueManagement = tableType === 'value_management';
                const orderIndex = await getNextOrderIndex(tableType);
                const aiStableKey = generateAiStableKey({
                    tableType,
                    category: item.category,
                    commercialIssue: item.description,
                    packageId,
                    firmId,
                    sourceFileAssetIds: uploadedFileAssetId ? [uploadedFileAssetId] : [],
                });

                await db.insert(evaluationRows).values({
                    id: newRowId,
                    evaluationId: evaluation.id,
                    evaluationPriceId: evaluationPriceId || undefined,
                    tableType,
                    description: item.description,
                    orderIndex,
                    source: 'ai_parsed',
                    sourceSubmissionId: submissionId,
                    aiStableKey,
                    category: item.category,
                    sourceDocumentId: uploadedDocumentId || undefined,
                    sourceFileAssetId: uploadedFileAssetId || undefined,
                    vmAdoptionStatus: isValueManagement ? item.vmAdoptionStatus || 'tbd' : undefined,
                    vmEmbeddedInBase: isValueManagement ? item.vmEmbeddedInBase || false : undefined,
                    vmOrigin: isValueManagement ? item.vmOrigin || 'tenderer_proposed' : undefined,
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
                    valueType: 'amount',
                    source: 'ai',
                    confidence: confidencePercent,
                });

                newRowsCreated.push({
                    rowId: newRowId,
                    description: item.description,
                    amountCents: item.amountCents,
                    tableType,
                });
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
