import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects } from '@/lib/db';

export async function POST() {
    try {
        // Insert default project (ignores conflicts if already exists)
        await db.insert(projects).values({
            id: 'default-project',
            name: 'Default Project',
            code: 'DEFAULT',
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }).onConflictDoNothing();

        return NextResponse.json({ success: true, message: 'Default project seeded successfully' });
    } catch (error) {
        console.error('Error seeding default project:', error);
        return NextResponse.json(
            { error: 'Failed to seed default project', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
