import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contractors } from '@/lib/db';
import { eq, and, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// GET /api/contractors/firms?projectId=X&trade=Y
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const trade = searchParams.get('trade');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    let result;
    if (trade) {
      result = await db.select().from(contractors).where(
        and(
          eq(contractors.projectId, projectId),
          eq(contractors.trade, trade)
        )
      ).orderBy(asc(contractors.createdAt));
    } else {
      result = await db.select().from(contractors).where(eq(contractors.projectId, projectId)).orderBy(asc(contractors.createdAt));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching contractors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contractors' },
      { status: 500 }
    );
  }
}

// POST /api/contractors/firms
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      companyName,
      contactPerson,
      trade,
      email,
      phone,
      address,
      abn,
      notes,
      shortlisted = true,
      awarded = false,
      companyId = null,
    } = body;

    // Validate required fields
    if (!projectId || !companyName || !trade) {
      return NextResponse.json(
        { error: 'projectId, companyName, and trade are required' },
        { status: 400 }
      );
    }

    // Create new contractor
    const id = uuidv4();
    const now = new Date();

    await db.insert(contractors).values({
      id,
      projectId,
      companyName,
      contactPerson,
      trade,
      email,
      phone,
      address,
      abn,
      notes,
      shortlisted,
      awarded,
      companyId,
      createdAt: now,
      updatedAt: now,
    });

    const [newContractor] = await db
      .select()
      .from(contractors)
      .where(eq(contractors.id, id))
      .limit(1);

    return NextResponse.json(newContractor, { status: 201 });
  } catch (error) {
    console.error('Error creating contractor:', error);
    return NextResponse.json(
      { error: 'Failed to create contractor' },
      { status: 500 }
    );
  }
}
