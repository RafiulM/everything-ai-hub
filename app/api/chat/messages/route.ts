import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getChatMessages } from '@/lib/chat-sessions';

export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }

        const messages = await getChatMessages(sessionId);
        
        return NextResponse.json(messages);

    } catch (error) {
        console.error('Failed to fetch chat messages:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}