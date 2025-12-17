import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices, fileAssets, documents, versions, categories, subcategories, consultantDisciplines, contractorTrades, costLines } from '@/lib/db';
import { eq, and, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@/lib/storage';
import { extractInvoiceFromPdf } from '@/lib/invoice/extract';
import { matchCompany } from '@/lib/invoice/company-matcher';
import { getCategoryById } from '@/lib/constants/categories';

/**
 * POST /api/projects/[projectId]/invoices/upload
 * Upload a PDF invoice and auto-extract data using AI
 *
 * Feature 006 - Cost Planning Module (Task T142)
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
        { error: 'Only PDF files are supported for invoice extraction' },
        { status: 400 }
      );
    }

    console.log(`[invoice-upload] Processing: ${file.name} for project ${projectId}`);

    // Step 1: Extract invoice data using AI
    const buffer = Buffer.from(await file.arrayBuffer());
    const extraction = await extractInvoiceFromPdf(buffer, file.name);

    if (!extraction.success || !extraction.invoice) {
      return NextResponse.json(
        {
          error: 'Failed to extract invoice data',
          details: extraction.error,
          parserUsed: extraction.parserUsed,
        },
        { status: 422 }
      );
    }

    const extractedData = extraction.invoice;
    console.log(`[invoice-upload] Extracted: Invoice #${extractedData.invoiceNumber}`);

    // Step 2: Match company to consultant/contractor
    const companyMatch = await matchCompany(
      extractedData.companyName || '',
      projectId
    );

    console.log(`[invoice-upload] Company match: ${companyMatch.found ? companyMatch.company?.companyName : 'Not found'}`);

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

    // Step 5: Create Document entry (for Document Repository)
    let documentId: string | null = null;
    let versionId: string | null = null;

    // Determine category based on company match
    let categoryId: string;
    let subcategoryId: string | null = null;
    let categoryDisplayPath: string;

    if (companyMatch.categoryPath) {
      // Company matched - use consultant/contractor category
      categoryId = companyMatch.type === 'consultant' ? 'consultants' : 'contractors';
      subcategoryId = companyMatch.discipline?.disciplineId || companyMatch.trade?.tradeId || null;
      const subcategoryName = companyMatch.categoryPath.subcategory;
      categoryDisplayPath = `${companyMatch.categoryPath.category}/${companyMatch.categoryPath.subcategory}`;

      // Ensure category exists (upsert)
      const categoryInfo = getCategoryById(categoryId);
      if (categoryInfo) {
        await db.insert(categories).values({
          id: categoryId,
          name: categoryInfo.name,
          isSystem: true,
        }).onConflictDoNothing();
      }

      // Ensure subcategory exists if we have discipline/trade (upsert)
      if (subcategoryId && subcategoryName) {
        await db.insert(subcategories).values({
          id: subcategoryId,
          categoryId,
          name: subcategoryName,
          isSystem: false,
        }).onConflictDoNothing();
      }
    } else {
      // No company match - use uncategorized
      categoryId = 'uncategorized';
      subcategoryId = null;
      categoryDisplayPath = 'Uncategorized';

      // Ensure uncategorized category exists (upsert)
      await db.insert(categories).values({
        id: 'uncategorized',
        name: 'Uncategorized',
        isSystem: true,
      }).onConflictDoNothing();
    }

    // Create document entry
    documentId = uuidv4();
    await db.insert(documents).values({
      id: documentId,
      projectId,
      categoryId,
      subcategoryId,
    });

    // Create version entry
    versionId = uuidv4();
    await db.insert(versions).values({
      id: versionId,
      documentId,
      fileAssetId,
      versionNumber: 1,
      uploadedBy: 'AI Invoice Upload',
    });

    // Update document's latest version pointer
    await db.update(documents)
      .set({ latestVersionId: versionId, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    console.log(`[invoice-upload] Created document in ${categoryDisplayPath}`);

    // Step 6: Parse invoice date to get period
    const invoiceDate = new Date(extractedData.invoiceDate);
    const periodYear = invoiceDate.getFullYear();
    const periodMonth = invoiceDate.getMonth() + 1; // 1-12

    // Step 6.5: Match to cost line based on discipline/trade
    let matchedCostLineId: string | null = null;

    if (companyMatch.discipline?.disciplineId) {
      // Find cost line with matching disciplineId
      const matchedCostLine = await db.query.costLines.findFirst({
        where: and(
          eq(costLines.projectId, projectId),
          eq(costLines.disciplineId, companyMatch.discipline.disciplineId),
          isNull(costLines.deletedAt)
        ),
      });
      if (matchedCostLine) {
        matchedCostLineId = matchedCostLine.id;
        console.log(`[invoice-upload] Matched to cost line by discipline: ${matchedCostLine.id}`);
      }
    } else if (companyMatch.trade?.tradeId) {
      // Find cost line with matching tradeId
      const matchedCostLine = await db.query.costLines.findFirst({
        where: and(
          eq(costLines.projectId, projectId),
          eq(costLines.tradeId, companyMatch.trade.tradeId),
          isNull(costLines.deletedAt)
        ),
      });
      if (matchedCostLine) {
        matchedCostLineId = matchedCostLine.id;
        console.log(`[invoice-upload] Matched to cost line by trade: ${matchedCostLine.id}`);
      }
    }

    // Step 7: Create Invoice record
    const invoiceId = uuidv4();
    const now = new Date();

    await db.insert(invoices).values({
      id: invoiceId,
      projectId,
      costLineId: matchedCostLineId,
      companyId: companyMatch.company?.companyId || null,
      fileAssetId, // Link to source PDF
      invoiceDate: extractedData.invoiceDate,
      poNumber: extractedData.poNumber,
      invoiceNumber: extractedData.invoiceNumber,
      description: extractedData.description,
      amountCents: extractedData.amountCents,
      gstCents: extractedData.gstCents,
      periodYear,
      periodMonth,
      paidStatus: 'unpaid',
      createdAt: now,
      updatedAt: now,
    });

    // Fetch the created invoice with relations
    const [createdInvoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId));

    // Build response
    const response = {
      success: true,
      invoice: createdInvoice,
      extraction: {
        confidence: extractedData.confidence,
        parserUsed: extraction.parserUsed,
        companyMatched: companyMatch.found,
        companyMatchDetails: companyMatch.found
          ? {
              matchedName: companyMatch.company?.companyName,
              matchScore: companyMatch.company?.matchScore,
              matchType: companyMatch.company?.matchType,
              type: companyMatch.type,
              discipline: companyMatch.discipline?.disciplineName,
              trade: companyMatch.trade?.tradeName,
            }
          : null,
        costLineMatched: !!matchedCostLineId,
        costLineId: matchedCostLineId,
      },
      document: {
        documentId,
        versionId,
        fileAssetId,
        category: companyMatch.categoryPath?.category || 'Uncategorized',
        subcategory: companyMatch.categoryPath?.subcategory || null,
      },
    };

    console.log(`[invoice-upload] Created invoice ${invoiceId} for ${extractedData.invoiceNumber}`);

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[invoice-upload] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[invoice-upload] Error details:', errorMessage);
    if (errorStack) console.error('[invoice-upload] Stack:', errorStack);
    return NextResponse.json(
      { error: 'Failed to process invoice upload', details: errorMessage },
      { status: 500 }
    );
  }
}
