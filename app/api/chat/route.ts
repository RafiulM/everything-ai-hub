import { StreamingTextResponse, streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { auth } from '@/lib/auth';
import { getUserApiKeyForProvider, getSystemApiKey } from '@/lib/api-keys';
import { db } from '@/db';
import { chatSessions, chatMessages, usageAnalytics } from '@/db/schema/ai-services';
import { eq, and } from 'drizzle-orm';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const modelMap = {
    'openai': {
        'gpt-4o': 'gpt-4o',
        'gpt-4o-mini': 'gpt-4o-mini',
        'gpt-3.5-turbo': 'gpt-3.5-turbo',
    },
    'anthropic': {
        'claude-3-5-sonnet-20241022': 'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022': 'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229': 'claude-3-opus-20240229',
    },
    'google': {
        'gemini-1.5-pro': 'gemini-1.5-pro-latest',
        'gemini-1.5-flash': 'gemini-1.5-flash-latest',
        'gemini-1.0-pro': 'gemini-1.0-pro-latest',
    },
};

interface ChatRequest {
    messages: Array<{ role: string; content: string }>;
    model: string;
    provider: string;
    systemPrompt?: string;
    sessionId?: string;
}

function estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
}

async function calculateCost(provider: string, model: string, inputTokens: number, outputTokens: number): Promise<number> {
    const costPer1kTokens = {
        'openai': {
            'gpt-4o': { input: 0.0025, output: 0.01 },
            'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
            'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
        },
        'anthropic': {
            'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
            'claude-3-5-haiku-20241022': { input: 0.0008, output: 0.004 },
            'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
        },
        'google': {
            'gemini-1.5-pro': { input: 0.00125, output: 0.00375 },
            'gemini-1.5-flash': { input: 0.000075, output: 0.00015 },
            'gemini-1.0-pro': { input: 0.0005, output: 0.0015 },
        },
    };

    const rates = costPer1kTokens[provider as keyof typeof costPer1kTokens]?.[model as keyof typeof costPer1kTokens[string]];
    if (!rates) return 0;

    return ((inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output);
}

export async function POST(req: Request) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return new Response('Unauthorized', { status: 401 });
        }

        const body: ChatRequest = await req.json();
        const { messages, model, provider, systemPrompt, sessionId } = body;

        if (!messages || !model || !provider) {
            return new Response('Missing required fields', { status: 400 });
        }

        // Get API key (user key first, then system key)
        const userApiKey = await getUserApiKeyForProvider(provider);
        const apiKey = userApiKey?.decryptedApiKey || await getSystemApiKey(provider);

        if (!apiKey) {
            return new Response(`No API key configured for ${provider}`, { status: 400 });
        }

        let aiProvider;
        let selectedModel = modelMap[provider as keyof typeof modelMap]?.[model as string];

        if (!selectedModel) {
            return new Response('Invalid model for provider', { status: 400 });
        }

        switch (provider) {
            case 'openai':
                aiProvider = createOpenAI({ apiKey });
                break;
            case 'anthropic':
                aiProvider = createAnthropic({ apiKey });
                break;
            case 'google':
                aiProvider = createGoogleGenerativeAI({ apiKey });
                break;
            default:
                return new Response('Unsupported provider', { status: 400 });
        }

        // Calculate input tokens
        const inputText = messages.map(m => m.content).join(' ') + (systemPrompt || '');
        const inputTokens = estimateTokenCount(inputText);
        let outputTokens = 0;

        // Create or get chat session
        let currentSessionId = sessionId;
        if (!currentSessionId) {
            const newSession = await db.insert(chatSessions).values({
                userId: session.user.id,
                title: messages[0]?.content.slice(0, 50) + '...' || 'New Chat',
                model: model,
                provider: provider as any,
                systemPrompt: systemPrompt || null,
            }).returning();
            currentSessionId = newSession[0].id;
        }

        // Log user message
        const lastUserMessage = messages[messages.length - 1];
        if (lastUserMessage?.role === 'user') {
            await db.insert(chatMessages).values({
                sessionId: currentSessionId,
                userId: session.user.id,
                type: 'user',
                content: lastUserMessage.content,
                tokenCount: estimateTokenCount(lastUserMessage.content),
            });
        }

        const result = await streamText({
            model: aiProvider(selectedModel),
            messages: [
                ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
                ...messages,
            ],
            onFinish: async (result) => {
                outputTokens = estimateTokenCount(result.text);
                
                // Log assistant message
                await db.insert(chatMessages).values({
                    sessionId: currentSessionId,
                    userId: session.user.id,
                    type: 'assistant',
                    content: result.text,
                    tokenCount: outputTokens,
                });

                // Log usage analytics
                const cost = await calculateCost(provider, model, inputTokens, outputTokens);
                await db.insert(usageAnalytics).values({
                    userId: session.user.id,
                    serviceType: 'chat',
                    provider: provider as any,
                    model: model,
                    tokenCount: inputTokens + outputTokens,
                    cost: cost.toString(),
                    sessionId: currentSessionId,
                });
            },
        });

        return new StreamingTextResponse(result.toDataStreamResponse());

    } catch (error) {
        console.error('Chat API error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}