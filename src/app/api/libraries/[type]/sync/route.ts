/**
 * POST /api/libraries/[type]/sync
 * Sync library documents to AI knowledge base.
 * This marks documents for RAG processing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { knowledgeLibraries, libraryDocuments } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-user';
import { KNOWLEDGE_LIBRARY_TYPES, type LibraryType } from '@/lib/constants/libraries';
import { eq, and } from 'drizzle-orm';

// Validate library type
function isValidLibraryType(type: string): type is LibraryType {
  return KNOWLEDGE_LIBRARY_TYPES.some((t) => t.id === type);
}

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

    // Get the library
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
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Library not found' } },
        { status: 404 }
      );
    }

    // Get pending documents
    const pendingDocs = await db
      .select()
      .from(libraryDocuments)
      .where(
        and(
          eq(libraryDocuments.libraryId, library.id),
          eq(libraryDocuments.syncStatus, 'pending')
        )
      );

    if (pendingDocs.length === 0) {
      return NextResponse.json({
        message: 'No documents to sync',
        queued: 0,
      });
    }

    // Mark documents as processing
    // In a real implementation, this would queue documents for RAG processing
    for (const doc of pendingDocs) {
      await db
        .update(libraryDocuments)
        .set({ syncStatus: 'processing' })
        .where(eq(libraryDocuments.id, doc.id));
    }

    // Update library timestamp
    const now = Math.floor(Date.now() / 1000);
    await db
      .update(knowledgeLibraries)
      .set({ updatedAt: now })
      .where(eq(knowledgeLibraries.id, library.id));

    // In a production system, this would trigger a background job
    // For now, we simulate successful sync by marking as 'synced' after a delay
    // This would normally be handled by a worker process
    setTimeout(async () => {
      try {
        for (const doc of pendingDocs) {
          await db
            .update(libraryDocuments)
            .set({ syncStatus: 'synced' })
            .where(eq(libraryDocuments.id, doc.id));
        }
      } catch (error) {
        console.error('Error completing sync:', error);
      }
    }, 2000);

    return NextResponse.json({
      message: 'Sync started',
      queued: pendingDocs.length,
      libraryType: type,
    });
  } catch (error) {
    console.error('Error syncing library:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to sync library' } },
      { status: 500 }
    );
  }
}
