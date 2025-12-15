import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contractors } from '@/lib/db';
import { eq, and, ne } from 'drizzle-orm';

// PUT /api/contractors/firms/[id]
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
      trade,
      email,
      phone,
      address,
      abn,
      notes,
      shortlisted,
      awarded,
      companyId,
    } = body;

    // Validate required fields
    if (!companyName || !trade || !email) {
      return NextResponse.json(
        { error: 'companyName, trade, and email are required' },
        { status: 400 }
      );
    }

    // Update contractor
    const now = new Date().toISOString();
    await db
      .update(contractors)
      .set({
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
        updatedAt: now,
      })
      .where(eq(contractors.id, id));

    const [updatedContractor] = await db
      .select()
      .from(contractors)
      .where(eq(contractors.id, id))
      .limit(1);

    if (!updatedContractor) {
      return NextResponse.json(
        { error: 'Contractor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedContractor);
  } catch (error) {
    console.error('Error updating contractor:', error);
    return NextResponse.json(
      { error: 'Failed to update contractor' },
      { status: 500 }
    );
  }
}

// DELETE /api/contractors/firms/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if contractor exists
    const [contractor] = await db
      .select()
      .from(contractors)
      .where(eq(contractors.id, id))
      .limit(1);

    if (!contractor) {
      return NextResponse.json(
        { error: 'Contractor not found' },
        { status: 404 }
      );
    }

    // Delete contractor
    await db.delete(contractors).where(eq(contractors.id, id));

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting contractor:', error);
    return NextResponse.json(
      { error: 'Failed to delete contractor' },
      { status: 500 }
    );
  }
}
