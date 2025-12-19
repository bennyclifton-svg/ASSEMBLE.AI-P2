/**
 * GET/POST/DELETE /api/libraries/[type]/documents
 * Manage documents in a specific knowledge library.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { knowledgeLibraries, libraryDocuments, fileAssets } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { KNOWLEDGE_LIBRARY_TYPES, type LibraryType } from '@/lib/constants/libraries';
import { eq, and, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'libraries');

// Validate library type
function isValidLibraryType(type: string): type is LibraryType {
  return KNOWLEDGE_LIBRARY_TYPES.some((t) => t.id === type);
}

// GET: List documents in a library
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;

    // Validate library type
    if (!isValidLibraryType(type)) {
      return NextResponse.json(
        { error: { code: 'INVALID_TYPE', message: `Invalid library type: ${type}` } },
        { status: 400 }
      );
    }

    // Get authenticated user
    const authResult = await getCurrentUser();
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (!authResult.user.organizationId) {
      return NextResponse.json(
        { error: { code: 'NO_ORGANIZATION', message: 'User has no organization' } },
        { status: 400 }
      );
    }

    // Get the library for this type and organization
    const [library] = await db
      .select()
      .from(knowledgeLibraries)
      .where(
        and(
          eq(knowledgeLibraries.organizationId, authResult.user.organizationId),
          eq(knowledgeLibraries.type, type)
        )
      )
      .limit(1);

    if (!library) {
      return NextResponse.json([]);
    }

    // Get documents with file info
    const documents = await db
      .select({
        id: libraryDocuments.id,
        libraryId: libraryDocuments.libraryId,
        fileAssetId: libraryDocuments.fileAssetId,
        addedAt: libraryDocuments.addedAt,
        syncStatus: libraryDocuments.syncStatus,
        fileName: fileAssets.originalName,
        mimeType: fileAssets.mimeType,
        sizeBytes: fileAssets.sizeBytes,
      })
      .from(libraryDocuments)
      .leftJoin(fileAssets, eq(libraryDocuments.fileAssetId, fileAssets.id))
      .where(eq(libraryDocuments.libraryId, library.id));

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching library documents:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to fetch documents' } },
      { status: 500 }
    );
  }
}

// POST: Upload document to library
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;

    // Validate library type
    if (!isValidLibraryType(type)) {
      return NextResponse.json(
        { error: { code: 'INVALID_TYPE', message: `Invalid library type: ${type}` } },
        { status: 400 }
      );
    }

    // Get authenticated user
    const authResult = await getCurrentUser();
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (!authResult.user.organizationId) {
      return NextResponse.json(
        { error: { code: 'NO_ORGANIZATION', message: 'User has no organization' } },
        { status: 400 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: { code: 'NO_FILE', message: 'No file provided' } },
        { status: 400 }
      );
    }

    // Get or create library
    let [library] = await db
      .select()
      .from(knowledgeLibraries)
      .where(
        and(
          eq(knowledgeLibraries.organizationId, authResult.user.organizationId),
          eq(knowledgeLibraries.type, type)
        )
      )
      .limit(1);

    const now = Math.floor(Date.now() / 1000);

    if (!library) {
      // Create library if it doesn't exist
      const libraryId = randomUUID();
      await db.insert(knowledgeLibraries).values({
        id: libraryId,
        organizationId: authResult.user.organizationId,
        type,
        documentCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      library = {
        id: libraryId,
        organizationId: authResult.user.organizationId,
        type,
        documentCount: 0,
        createdAt: now,
        updatedAt: now,
      };
    }

    // Create upload directory
    const libraryDir = path.join(UPLOAD_DIR, type);
    await mkdir(libraryDir, { recursive: true });

    // Read file and compute hash
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Generate unique filename
    const ext = path.extname(file.name);
    const storageName = `${randomUUID()}${ext}`;
    const storagePath = path.join(libraryDir, storageName);

    // Save file
    await writeFile(storagePath, buffer);

    // Create file asset
    const fileAssetId = randomUUID();
    await db.insert(fileAssets).values({
      id: fileAssetId,
      storagePath: storagePath,
      originalName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: buffer.length,
      hash,
      ocrStatus: 'PENDING',
    });

    // Create library document
    const documentId = randomUUID();
    await db.insert(libraryDocuments).values({
      id: documentId,
      libraryId: library.id,
      fileAssetId,
      addedAt: now,
      addedBy: authResult.user.id,
      syncStatus: 'pending',
    });

    // Update document count
    await db
      .update(knowledgeLibraries)
      .set({
        documentCount: library.documentCount + 1,
        updatedAt: now,
      })
      .where(eq(knowledgeLibraries.id, library.id));

    return NextResponse.json(
      {
        id: documentId,
        fileAssetId,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: buffer.length,
        addedAt: now,
        syncStatus: 'pending',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to upload document' } },
      { status: 500 }
    );
  }
}

// DELETE: Remove documents from library
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;

    // Validate library type
    if (!isValidLibraryType(type)) {
      return NextResponse.json(
        { error: { code: 'INVALID_TYPE', message: `Invalid library type: ${type}` } },
        { status: 400 }
      );
    }

    // Get authenticated user
    const authResult = await getCurrentUser();
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (!authResult.user.organizationId) {
      return NextResponse.json(
        { error: { code: 'NO_ORGANIZATION', message: 'User has no organization' } },
        { status: 400 }
      );
    }

    // Get document IDs from request body
    const body = await request.json();
    const { documentIds } = body as { documentIds: string[] };

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: { code: 'NO_IDS', message: 'No document IDs provided' } },
        { status: 400 }
      );
    }

    // Get the library
    const [library2] = await db
      .select()
      .from(knowledgeLibraries)
      .where(
        and(
          eq(knowledgeLibraries.organizationId, authResult.user.organizationId),
          eq(knowledgeLibraries.type, type)
        )
      )
      .limit(1);

    if (!library2) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Library not found' } },
        { status: 404 }
      );
    }

    // Delete documents that belong to this library
    const result = await db
      .delete(libraryDocuments)
      .where(
        and(
          eq(libraryDocuments.libraryId, library2.id),
          inArray(libraryDocuments.id, documentIds)
        )
      );

    // Update document count
    const now = Math.floor(Date.now() / 1000);
    const remainingDocs = await db
      .select()
      .from(libraryDocuments)
      .where(eq(libraryDocuments.libraryId, library2.id));

    await db
      .update(knowledgeLibraries)
      .set({
        documentCount: remainingDocs.length,
        updatedAt: now,
      })
      .where(eq(knowledgeLibraries.id, library2.id));

    return NextResponse.json({
      deleted: documentIds.length,
      remaining: remainingDocs.length,
    });
  } catch (error) {
    console.error('Error deleting documents:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to delete documents' } },
      { status: 500 }
    );
  }
}
