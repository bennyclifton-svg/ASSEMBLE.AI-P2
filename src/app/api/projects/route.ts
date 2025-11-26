import { NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { projects } from '@/lib/db/schema';

export async function GET() {
    try {
        const projectsList = await db.select().from(projects);
        return NextResponse.json(projectsList);
    } catch (error) {
        console.error('Error fetching projects:', error);
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { name, code, status = 'active' } = await request.json();

        if (!name || name.trim() === '') {
            return NextResponse.json(
                { error: 'Project name is required' },
                { status: 400 }
            );
        }

        const newProject = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: name.trim(),
            code: code?.trim(),
            status: status || 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await db.insert(projects).values(newProject);

        return NextResponse.json(newProject, { status: 201 });
    } catch (error) {
        console.error('Error creating project:', error);
        return NextResponse.json(
            { error: 'Failed to create project' },
            { status: 500 }
        );
    }
}
