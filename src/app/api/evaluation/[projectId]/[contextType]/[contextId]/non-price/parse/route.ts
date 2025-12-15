/**
 * Feature 013: Non-Price Parse API Route
 * T029-T034: POST endpoint for parsing tender PDFs for non-price criteria
 *
 * Accepts a PDF file via multipart form data, extracts content for 7 criteria,
 * and stores results in evaluation_non_price_cells table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
    evaluations,
    evaluationNonPriceCriteria,
    evaluationNonPriceCells,
    documents,
    versions,
    fileAssets,
    categories,
    consultantDisciplines,
    contractorTrades,
    tenderSubmissions,
} from '@/lib/db';
import { eq, and, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@/lib/storage';
import { parseNonPriceTender } from '@/lib/services/non-price-parser';
import { NON_PRICE_CRITERIA } from '@/lib/constants/non-price-criteria';
import type { QualityRating } from '@/types/evaluation';

interface RouteParams {
    params: Promise<{
        projectId: string;
        contextType: string;
        contextId: string;
    }>;
}

// T029: POST - Parse tender PDF for non-price criteria
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

        // T030: Handle file upload
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const firmId = formData.get('firmId') as string | null;
        const firmType = formData.get('firmType') as 'consultant' | 'contractor' | null;

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

        if (!firmType || (firmType !== 'consultant' && firmType !== 'contractor')) {
            return NextResponse.json(
                { error: 'Invalid firm type. Must be "consultant" or "contractor".' },
                { status: 400 }
            );
        }

        // Validate file type (PDF only)
        const filename = file.name.toLowerCase();
        if (!filename.endsWith('.pdf')) {
            return NextResponse.json(
                { error: 'Invalid file type. Only PDF files are accepted.' },
                { status: 400 }
            );
        }

        console.log(`[non-price-parse] Parsing tender for firm ${firmId}: ${file.name}`);

        // Find or create evaluation
        let evaluation = await db.query.evaluations.findFirst({
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
            // Create evaluation
            const evalId = nanoid();
            await db.insert(evaluations).values({
                id: evalId,
                projectId,
                disciplineId: isDiscipline ? contextId : null,
                tradeId: isDiscipline ? null : contextId,
            });
            evaluation = await db.query.evaluations.findFirst({
                where: eq(evaluations.id, evalId),
            });
        }

        if (!evaluation) {
            return NextResponse.json(
                { error: 'Failed to create or find evaluation' },
                { status: 500 }
            );
        }

        // Ensure criteria exist
        const existingCriteria = await db.query.evaluationNonPriceCriteria.findMany({
            where: eq(evaluationNonPriceCriteria.evaluationId, evaluation.id),
            orderBy: [asc(evaluationNonPriceCriteria.orderIndex)],
        });

        if (existingCriteria.length === 0) {
            // Auto-create 7 criteria
            const criteriaToCreate = NON_PRICE_CRITERIA.map((c, index) => ({
                id: nanoid(),
                evaluationId: evaluation!.id,
                criteriaKey: c.key,
                criteriaLabel: c.label,
                orderIndex: index,
            }));
            await db.insert(evaluationNonPriceCriteria).values(criteriaToCreate);
        }

        // Get criteria (after potential creation)
        const criteria = await db.query.evaluationNonPriceCriteria.findMany({
            where: eq(evaluationNonPriceCriteria.evaluationId, evaluation.id),
            orderBy: [asc(evaluationNonPriceCriteria.orderIndex)],
        });

        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Parse tender with non-price parser
        const parseResult = await parseNonPriceTender(buffer, file.name);

        if (!parseResult.success) {
            console.error(`[non-price-parse] Parsing failed:`, parseResult.error);
            return NextResponse.json(
                {
                    error: parseResult.error || 'Failed to parse tender document',
                    success: false,
                },
                { status: 400 }
            );
        }

        console.log(`[non-price-parse] Parse result: ${parseResult.results.length} criteria extracted, confidence: ${parseResult.overallConfidence.toFixed(1)}`);

        // Upload PDF to document repository (FR-017)
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
                ocrStatus: 'COMPLETED',
            });

            // Determine category and subcategory
            const categoryId = isDiscipline ? 'consultants' : 'contractors';

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
                subcategoryId: contextId,
            });

            // Create version
            const versionId = uuidv4();
            await db.insert(versions).values({
                id: versionId,
                documentId,
                fileAssetId,
                versionNumber: 1,
                uploadedBy: 'Non-Price Parse',
            });

            // Update document's latest version
            await db.update(documents)
                .set({ latestVersionId: versionId, updatedAt: new Date().toISOString() })
                .where(eq(documents.id, documentId));

            console.log(`[non-price-parse] Uploaded to document repository: ${documentId}`);
        } catch (uploadError) {
            console.error('[non-price-parse] Failed to upload to document repository:', uploadError);
            // Continue even if upload fails - the parsing result is more important
        }

        // T033: Create tender_submission record for audit trail
        const submissionId = nanoid();
        await db.insert(tenderSubmissions).values({
            id: submissionId,
            evaluationId: evaluation.id,
            firmId,
            firmType,
            filename: file.name,
            fileAssetId: uploadedFileAssetId,
            parserUsed: 'claude',
            confidence: Math.round(parseResult.overallConfidence),
            rawExtractedItems: JSON.stringify(parseResult.results),
        });

        console.log(`[non-price-parse] Created tender submission record: ${submissionId}`);

        // T031: Store extraction results - Create/update cells for all 7 criteria
        // T032: Preserve user edits - only update AI fields, not userEdited fields
        for (const result of parseResult.results) {
            // Find the criteria record for this key
            const criteriaRecord = criteria.find(c => c.criteriaKey === result.criteriaKey);
            if (!criteriaRecord) {
                console.warn(`[non-price-parse] No criteria record for key: ${result.criteriaKey}`);
                continue;
            }

            // Check if cell exists
            const existingCell = await db.query.evaluationNonPriceCells.findFirst({
                where: and(
                    eq(evaluationNonPriceCells.criteriaId, criteriaRecord.id),
                    eq(evaluationNonPriceCells.firmId, firmId),
                    eq(evaluationNonPriceCells.firmType, firmType)
                ),
            });

            const now = new Date().toISOString();

            if (existingCell) {
                // Update existing cell - only update AI fields (T032)
                await db.update(evaluationNonPriceCells)
                    .set({
                        extractedContent: result.summary,
                        qualityRating: result.rating as QualityRating,
                        source: 'ai',
                        confidence: result.confidence,
                        sourceChunks: JSON.stringify(result.sourceChunks),
                        sourceSubmissionId: submissionId,
                        updatedAt: now,
                    })
                    .where(eq(evaluationNonPriceCells.id, existingCell.id));

                console.log(`[non-price-parse] Updated cell for ${result.criteriaKey}`);
            } else {
                // Create new cell
                await db.insert(evaluationNonPriceCells).values({
                    id: nanoid(),
                    criteriaId: criteriaRecord.id,
                    firmId,
                    firmType,
                    extractedContent: result.summary,
                    qualityRating: result.rating as QualityRating,
                    userEditedContent: null,
                    userEditedRating: null,
                    source: 'ai',
                    confidence: result.confidence,
                    sourceChunks: JSON.stringify(result.sourceChunks),
                    sourceSubmissionId: submissionId,
                    createdAt: now,
                    updatedAt: now,
                });

                console.log(`[non-price-parse] Created cell for ${result.criteriaKey}`);
            }
        }

        // Return success with results
        return NextResponse.json({
            success: true,
            data: {
                firmId,
                submissionId,
                results: parseResult.results,
                overallConfidence: parseResult.overallConfidence,
            },
        });
    } catch (error) {
        console.error('[non-price-parse] Error:', error);
        return NextResponse.json(
            { error: 'Failed to parse tender document' },
            { status: 500 }
        );
    }
}
