/**
 * GET /api/libraries
 * Returns all knowledge library types with their document counts for the user's organization.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { knowledgeLibraries } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/get-user';
import { KNOWLEDGE_LIBRARY_TYPES } from '@/lib/constants/libraries';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
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

    // Get libraries for organization
    const libraries = await db
      .select()
      .from(knowledgeLibraries)
      .where(eq(knowledgeLibraries.organizationId, authResult.user.organizationId));

    // Map to include static library type info
    const librariesWithInfo = KNOWLEDGE_LIBRARY_TYPES.map((type) => {
      const library = libraries.find((lib) => lib.type === type.id);
      return {
        id: library?.id || null,
        type: type.id,
        name: type.name,
        color: type.color,
        documentCount: library?.documentCount || 0,
        exists: !!library,
      };
    });

    return NextResponse.json(librariesWithInfo);
  } catch (error) {
    console.error('Error fetching libraries:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to fetch libraries' } },
      { status: 500 }
    );
  }
}
