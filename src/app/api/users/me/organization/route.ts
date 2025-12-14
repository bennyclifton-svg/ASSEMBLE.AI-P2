/**
 * PATCH /api/users/me/organization
 * Update the current user's organization default settings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { organizations } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/get-user';
import { eq } from 'drizzle-orm';

interface UpdateSettingsRequest {
  defaultSettings?: {
    enabledDisciplines?: string[];
    enabledTrades?: string[];
  };
}

export async function PATCH(request: NextRequest) {
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

    const body: UpdateSettingsRequest = await request.json();
    const { defaultSettings } = body;

    if (!defaultSettings) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'No settings provided' } },
        { status: 400 }
      );
    }

    // Get current organization settings
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, authResult.user.organizationId))
      .limit(1);

    if (!org) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Organization not found' } },
        { status: 404 }
      );
    }

    // Merge with existing settings
    const currentSettings = JSON.parse(org.defaultSettings || '{}');
    const newSettings = {
      ...currentSettings,
      ...defaultSettings,
    };

    // Update organization
    const now = Math.floor(Date.now() / 1000);
    await db
      .update(organizations)
      .set({
        defaultSettings: JSON.stringify(newSettings),
        updatedAt: now,
      })
      .where(eq(organizations.id, authResult.user.organizationId));

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        defaultSettings: newSettings,
      },
    });
  } catch (error) {
    console.error('Update organization settings error:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to update settings' } },
      { status: 500 }
    );
  }
}

// GET: Get current organization settings
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

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, authResult.user.organizationId))
      .limit(1);

    if (!org) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Organization not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        defaultSettings: JSON.parse(org.defaultSettings || '{}'),
      },
    });
  } catch (error) {
    console.error('Get organization settings error:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to fetch settings' } },
      { status: 500 }
    );
  }
}
