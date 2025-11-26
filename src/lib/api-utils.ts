import { NextResponse } from 'next/server';

type ApiHandler = () => Promise<NextResponse>;

export async function handleApiError(handler: ApiHandler): Promise<NextResponse> {
    try {
        return await handler();
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
