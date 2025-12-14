import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { consultants } from '@/lib/db/schema';
import { eq, and, or, ne } from 'drizzle-orm';

// PUT /api/consultants/firms/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      shortlisted,
      awarded,
      companyId,
    } = body;

    // Validate required fields
    if (!companyName || !discipline || !email) {
      return NextResponse.json(
        { error: 'companyName, discipline, and email are required' },
        { status: 400 }
      );
    }

    // Update consultant
    const now = new Date().toISOString();
    await db
      .update(consultants)
      .set({
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
        updatedAt: now,
      })
      .where(eq(consultants.id, id));

    const [updatedConsultant] = await db
      .select()
      .from(consultants)
      .where(eq(consultants.id, id))
      .limit(1);

    if (!updatedConsultant) {
      return NextResponse.json(
        { error: 'Consultant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedConsultant);
  } catch (error) {
    console.error('Error updating consultant:', error);
    return NextResponse.json(
      { error: 'Failed to update consultant' },
      { status: 500 }
    );
  }
}

// DELETE /api/consultants/firms/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if consultant exists
    const [consultant] = await db
      .select()
      .from(consultants)
      .where(eq(consultants.id, id))
      .limit(1);

    if (!consultant) {
      return NextResponse.json(
        { error: 'Consultant not found' },
        { status: 404 }
      );
    }

    // Delete consultant
    await db.delete(consultants).where(eq(consultants.id, id));

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting consultant:', error);
    return NextResponse.json(
      { error: 'Failed to delete consultant' },
      { status: 500 }
    );
  }
}
