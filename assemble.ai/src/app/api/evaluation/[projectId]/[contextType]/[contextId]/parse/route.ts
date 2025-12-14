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
    consultantDisciplines,
    contractorTrades,
    tenderSubmissions,
} from '@/lib/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@/lib/storage/local';
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

        // Validate context type
        if (contextType !== 'discipline' && contextType !== 'trade') {
            return NextResponse.json(
                { error: 'Invalid context type. Must be "discipline" or "trade".' },
                { status: 400 }
            );
        }

        const isDiscipline = contextType === 'discipline';

        // T045: Handle file upload
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const firmId = formData.get('firmId') as string | null;

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

        // Get evaluation and rows
        const evaluation = await db.query.evaluations.findFirst({
            where: isDiscipline
                ? and(
                    eq(evaluations.projectId, projectId),
                    eq(evaluations.disciplineId, contextId)
                )
                : and(
                    eq(evaluations.projectId, projectId),
                    eq(evaluations.tradeId, contextId)
                ),
        });

        if (!evaluation) {
            return NextResponse.json(
                { error: 'Evaluation not found' },
                { status: 404 }
            );
        }

        // Get evaluation rows for mapping
        const dbRows = await db.query.evaluationRows.findMany({
            where: eq(evaluationRows.evaluationId, evaluation.id),
            orderBy: [asc(evaluationRows.orderIndex)],
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

        // T046: Upload PDF to document repository (Consultant/Discipline or Contractor/Trade category)
        let uploadedFileAssetId: string | null = null;
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

            // Determine category and subcategory
            const categoryId = isDiscipline ? 'consultants' : 'contractors';
            const subcategoryId = contextId;

            // Get subcategory name for the document
            let subcategoryName: string | null = null;
            if (isDiscipline) {
                const discipline = await db.query.consultantDisciplines.findFirst({
                    where: eq(consultantDisciplines.id, contextId),
                });
                subcategoryName = discipline?.disciplineName || null;
            } else {
                const trade = await db.query.contractorTrades.findFirst({
                    where: eq(contractorTrades.id, contextId),
                });
                subcategoryName = trade?.tradeName || null;
            }

            // Ensure category exists
            try {
                await db.insert(categories).values({
                    id: categoryId,
                    name: isDiscipline ? 'Consultants' : 'Contractors',
                    isSystem: true,
                });
            } catch {
                // Category already exists, ignore
            }

            // Create document
            const documentId = uuidv4();
            await db.insert(documents).values({
                id: documentId,
                projectId,
                categoryId,
                subcategoryId,
            });

            // Create version
            const versionId = uuidv4();
            await db.insert(versions).values({
                id: versionId,
                documentId,
                fileAssetId,
                versionNumber: 1,
                uploadedBy: 'Tender Parse',
            });

            // Update document's latest version
            await db.update(documents)
                .set({ latestVersionId: versionId, updatedAt: new Date().toISOString() })
                .where(eq(documents.id, documentId));

            console.log(`[parse-route] Uploaded to document repository: ${documentId}`);
        } catch (uploadError) {
            console.error('[parse-route] Failed to upload to document repository:', uploadError);
            // Continue even if upload fails - the parsing result is more important
        }

        const firmType = isDiscipline ? 'consultant' : 'contractor';

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

        // Update evaluation cells with parsed amounts for MAPPED items
        for (const item of mappedItems) {
            if (!item.matchedRowId) continue;

            // Check if cell exists
            const existingCell = await db.query.evaluationCells.findFirst({
                where: and(
                    eq(evaluationCells.rowId, item.matchedRowId),
                    eq(evaluationCells.firmId, firmId)
                ),
            });

            if (existingCell) {
                // Update existing cell
                await db.update(evaluationCells)
                    .set({
                        amountCents: item.amountCents,
                        source: 'ai',
                        confidence: item.confidence,
                        updatedAt: new Date().toISOString(),
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
                    confidence: item.confidence,
                });
            }
        }

        // T081-T083: CREATE NEW ROWS for unmapped items (don't discard them!)
        const newRowsCreated: Array<{ rowId: string; description: string; amountCents: number }> = [];

        if (unmappedItems.length > 0) {
            console.log(`[parse-route] Creating ${unmappedItems.length} new rows for unmapped items`);

            // Get the highest order index for initial_price table
            const existingMaxOrder = await db.query.evaluationRows.findMany({
                where: and(
                    eq(evaluationRows.evaluationId, evaluation.id),
                    eq(evaluationRows.tableType, 'initial_price')
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
                    tableType: 'initial_price',
                    description: item.description,
                    orderIndex: nextOrderIndex,
                    source: 'ai_parsed',
                    sourceSubmissionId: submissionId,
                });

                // Create cell for this new row
                await db.insert(evaluationCells).values({
                    id: nanoid(),
                    rowId: newRowId,
                    firmId,
                    firmType,
                    amountCents: item.amountCents,
                    source: 'ai',
                    confidence: item.confidence,
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
        return NextResponse.json(
            { error: 'Failed to parse tender document' },
            { status: 500 }
        );
    }
}
