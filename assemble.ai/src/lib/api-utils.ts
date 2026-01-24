import { NextResponse } from 'next/server';

type ApiHandler = () => Promise<NextResponse>;

export async function handleApiError(handler: ApiHandler): Promise<NextResponse> {
    try {
        return await handler();
    } catch (error: any) {
        // Log full error details for debugging
        console.error('=== API Error ===');
        console.error('Message:', error.message);
        console.error('Name:', error.name);
        console.error('Code:', error.code);
        console.error('Detail:', error.detail);
        console.error('Constraint:', error.constraint);
        console.error('Table:', error.table);
        console.error('Column:', error.column);
        console.error('Stack:', error.stack);
        console.error('=================');
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
