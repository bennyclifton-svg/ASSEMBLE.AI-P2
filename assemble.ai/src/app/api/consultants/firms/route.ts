import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { consultants } from '@/lib/db';
import { eq, and, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// GET /api/consultants/firms?projectId=X&discipline=Y
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const discipline = searchParams.get('discipline');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    let result;
    if (discipline) {
      result = await db.select().from(consultants).where(
        and(
          eq(consultants.projectId, projectId),
          eq(consultants.discipline, discipline)
        )
      ).orderBy(asc(consultants.createdAt));
    } else {
      result = await db.select().from(consultants).where(eq(consultants.projectId, projectId)).orderBy(asc(consultants.createdAt));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching consultants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consultants' },
      { status: 500 }
    );
  }
}

// POST /api/consultants/firms
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      companyName,
      contactPerson,
      discipline,
      email,
      phone,
      mobile,
      address,
      abn,
      notes,
      shortlisted = false,
      awarded = false,
      companyId = null,
    } = body;

    // Validate required fields
    if (!projectId || !companyName || !discipline) {
      return NextResponse.json(
        { error: 'projectId, companyName, and discipline are required' },
        { status: 400 }
      );
    }

    // Create new consultant
    const id = uuidv4();
    const now = new Date();

    await db.insert(consultants).values({
      id,
      projectId,
      companyName,
      contactPerson,
      discipline,
      email,
      phone,
      mobile,
      address,
      abn,
      notes,
      shortlisted,
      awarded,
      companyId,
      createdAt: now,
      updatedAt: now,
    });

    const [newConsultant] = await db
      .select()
      .from(consultants)
      .where(eq(consultants.id, id))
      .limit(1);

    return NextResponse.json(newConsultant, { status: 201 });
  } catch (error) {
    console.error('Error creating consultant:', error);
    return NextResponse.json(
      { error: 'Failed to create consultant' },
      { status: 500 }
    );
  }
}
