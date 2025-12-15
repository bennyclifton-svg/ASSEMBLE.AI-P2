import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { variations, fileAssets, documents, versions, categories } from '@/lib/db';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@/lib/storage';
import { extractVariationFromPdf } from '@/lib/variation/extract';
import { matchCostLine } from '@/lib/variation/cost-line-matcher';

/**
 * POST /api/projects/[projectId]/variations/upload
 * Upload a PDF variation document and auto-extract data using AI
 *
 * Feature 006 - Cost Planning Module
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type (PDF only)
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are supported for variation extraction' },
        { status: 400 }
      );
    }

    console.log(`[variation-upload] Processing: ${file.name} for project ${projectId}`);

    // Step 1: Extract variation data using AI
    const buffer = Buffer.from(await file.arrayBuffer());
    const extraction = await extractVariationFromPdf(buffer, file.name);

    if (!extraction.success || !extraction.variation) {
      return NextResponse.json(
        {
          error: 'Failed to extract variation data',
          details: extraction.error,
          parserUsed: extraction.parserUsed,
        },
        { status: 422 }
      );
    }

    const extractedData = extraction.variation;
    console.log(`[variation-upload] Extracted: ${extractedData.variationNumber || 'No number'} - ${extractedData.description.substring(0, 50)}`);

    // Step 2: Match to cost line if reference provided
    const costLineMatch = await matchCostLine(
      extractedData.costLineReference,
      projectId
    );

    console.log(`[variation-upload] Cost line match: ${costLineMatch.found ? costLineMatch.match?.activity : 'Not found'}`);

    // Step 3: Save file to storage
    const { path: storagePath, hash, size } = await storage.save(file, buffer);

    // Step 4: Create FileAsset record
    const fileAssetId = uuidv4();
    await db.insert(fileAssets).values({
      id: fileAssetId,
      storagePath,
      originalName: file.name,
      mimeType: file.type || 'application/pdf',
      sizeBytes: size,
      hash,
      ocrStatus: 'COMPLETED', // Already parsed by AI
      ocrText: extractedData.rawText,
    });

    // Step 5: Create Document entry in Uncategorized (user will allocate later)
    let documentId: string | null = null;
    let versionId: string | null = null;
    const categoryId = 'uncategorized';
    const categoryDisplayPath = 'Uncategorized';

    // Ensure uncategorized category exists
    try {
      await db.insert(categories).values({
        id: 'uncategorized',
        name: 'Uncategorized',
        isSystem: true,
      });
    } catch (err: any) {
      // Ignore if already exists
      if (!err?.message?.includes('UNIQUE') && !err?.message?.includes('PRIMARY')) {
        throw err;
      }
    }

    // Create document entry
    documentId = uuidv4();
    await db.insert(documents).values({
      id: documentId,
      projectId,
      categoryId,
      subcategoryId: null,
    });

    // Create version entry
    versionId = uuidv4();
    await db.insert(versions).values({
      id: versionId,
      documentId,
      fileAssetId,
      versionNumber: 1,
      uploadedBy: 'AI Variation Upload',
    });

    // Update document's latest version pointer
    await db.update(documents)
      .set({ latestVersionId: versionId, updatedAt: new Date().toISOString() })
      .where(eq(documents.id, documentId));

    console.log(`[variation-upload] Created document in ${categoryDisplayPath}`);

    // Step 6: Generate variation number if not extracted
    let variationNumber = extractedData.variationNumber;
    if (!variationNumber) {
      // Generate based on category prefix
      const prefixes: Record<string, string> = {
        'Principal': 'PV',
        'Contractor': 'CV',
        'Lessor Works': 'LV',
      };
      const prefix = prefixes[extractedData.category] || 'PV';

      // Find the highest existing number for this category in this project
      const existingVariations = await db.query.variations.findMany({
        where: and(
          eq(variations.projectId, projectId),
          isNull(variations.deletedAt)
        ),
        orderBy: desc(variations.variationNumber),
      });

      // Filter for same prefix and find max number
      const samePrefix = existingVariations.filter(v => v.variationNumber.startsWith(prefix));
      let maxNum = 0;
      for (const v of samePrefix) {
        const match = v.variationNumber.match(new RegExp(`^${prefix}-(\\d+)$`));
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }

      variationNumber = `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
      console.log(`[variation-upload] Generated variation number: ${variationNumber}`);
    }

    // Step 7: Create Variation record
    const variationId = uuidv4();
    const now = new Date().toISOString();

    await db.insert(variations).values({
      id: variationId,
      projectId,
      costLineId: costLineMatch.match?.costLineId || null,
      variationNumber,
      category: extractedData.category,
      description: extractedData.description,
      status: 'Forecast',
      amountForecastCents: extractedData.amountCents,
      amountApprovedCents: 0,
      dateSubmitted: extractedData.dateSubmitted || now.split('T')[0],
      requestedBy: extractedData.requestedBy,
      createdAt: now,
      updatedAt: now,
    });

    // Fetch the created variation with relations
    const [createdVariation] = await db
      .select()
      .from(variations)
      .where(eq(variations.id, variationId));

    // Build response
    const response = {
      success: true,
      variation: createdVariation,
      extraction: {
        confidence: extractedData.confidence,
        parserUsed: extraction.parserUsed,
        costLineMatched: costLineMatch.found,
        costLineMatchDetails: costLineMatch.found
          ? {
              costLineId: costLineMatch.match?.costLineId,
              costCode: costLineMatch.match?.costCode,
              activity: costLineMatch.match?.activity,
              matchScore: costLineMatch.match?.matchScore,
              matchType: costLineMatch.match?.matchType,
              disciplineName: costLineMatch.match?.disciplineName,
              tradeName: costLineMatch.match?.tradeName,
            }
          : null,
      },
      document: {
        documentId,
        versionId,
        fileAssetId,
        category: 'Uncategorized',
        subcategory: null,
      },
    };

    console.log(`[variation-upload] Created variation ${variationId}: ${variationNumber}`);

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[variation-upload] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[variation-upload] Error details:', errorMessage);
    if (errorStack) console.error('[variation-upload] Stack:', errorStack);
    return NextResponse.json(
      { error: 'Failed to process variation upload', details: errorMessage },
      { status: 500 }
    );
  }
}
