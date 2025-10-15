import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserApiKeyForProvider, getSystemApiKey } from '@/lib/api-keys';
import { db } from '@/db';
import { imageGenerations, usageAnalytics } from '@/db/schema/ai-services';
import { eq } from 'drizzle-orm';

interface ImageRequest {
    prompt: string;
    negativePrompt?: string;
    provider: string;
    model: string;
    width?: number;
    height?: number;
    steps?: number;
    style?: string;
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: ImageRequest = await req.json();
        const { prompt, negativePrompt, provider, model, width = 1024, height = 1024, steps = 20, style } = body;

        if (!prompt || !provider || !model) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get API key (user key first, then system key)
        const userApiKey = await getUserApiKeyForProvider(provider);
        const apiKey = userApiKey?.decryptedApiKey || await getSystemApiKey(provider);

        if (!apiKey) {
            return NextResponse.json({ error: `No API key configured for ${provider}` }, { status: 400 });
        }

        // Create image generation record
        const generation = await db.insert(imageGenerations).values({
            userId: session.user.id,
            prompt,
            negativePrompt: negativePrompt || null,
            provider: provider as any,
            model,
            parameters: {
                width,
                height,
                steps,
                style,
            },
            status: 'pending',
        }).returning();

        let imageUrl = '';
        let cost = 0;

        try {
            if (provider === 'openai') {
                const result = await generateWithOpenAI(apiKey, prompt, negativePrompt, model, width, height, style);
                imageUrl = result.imageUrl;
                cost = result.cost;
            } else if (provider === 'anthropic') {
                // Anthropic doesn't currently support image generation
                throw new Error('Anthropic does not support image generation');
            } else if (provider === 'stability') {
                const result = await generateWithStability(apiKey, prompt, negativePrompt, model, width, height, steps);
                imageUrl = result.imageUrl;
                cost = result.cost;
            } else {
                throw new Error(`Unsupported provider: ${provider}`);
            }

            // Update generation record with success
            await db.update(imageGenerations)
                .set({
                    imageUrl,
                    cost: cost.toString(),
                    status: 'completed',
                    updatedAt: new Date(),
                })
                .where(eq(imageGenerations.id, generation[0].id));

            // Log usage analytics
            await db.insert(usageAnalytics).values({
                userId: session.user.id,
                serviceType: 'image_generation',
                provider: provider as any,
                model,
                tokenCount: 0,
                cost: cost.toString(),
                metadata: {
                    prompt,
                    negativePrompt,
                    width,
                    height,
                    steps,
                    style,
                },
            });

            return NextResponse.json({
                id: generation[0].id,
                imageUrl,
                cost,
            });

        } catch (error) {
            // Update generation record with error
            await db.update(imageGenerations)
                .set({
                    status: 'failed',
                    updatedAt: new Date(),
                })
                .where(eq(imageGenerations.id, generation[0].id));

            throw error;
        }

    } catch (error: any) {
        console.error('Image generation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate image' },
            { status: 500 }
        );
    }
}

async function generateWithOpenAI(
    apiKey: string,
    prompt: string,
    negativePrompt: string | undefined,
    model: string,
    width: number,
    height: number,
    style: string | undefined
) {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: model === 'dall-e-3' ? 'dall-e-3' : 'dall-e-2',
            prompt: negativePrompt ? `${prompt}. Avoid: ${negativePrompt}` : prompt,
            n: 1,
            size: `${width}x${height}`,
            quality: 'standard',
            style: style === 'vivid' ? 'vivid' : 'natural',
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to generate image with OpenAI');
    }

    const data = await response.json();
    const imageUrl = data.data[0].url;
    
    // Calculate cost (approximate)
    const cost = model === 'dall-e-3' ? 0.04 : 0.02;

    return { imageUrl, cost };
}

async function generateWithStability(
    apiKey: string,
    prompt: string,
    negativePrompt: string | undefined,
    model: string,
    width: number,
    height: number,
    steps: number
) {
    const response = await fetch(`https://api.stability.ai/v1/generation/${model}/text-to-image`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            text_prompts: [
                { text: prompt, weight: 1 },
                ...(negativePrompt ? [{ text: negativePrompt, weight: -1 }] : []),
            ],
            cfg_scale: 7,
            height,
            width,
            samples: 1,
            steps,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate image with Stability AI');
    }

    const data = await response.json();
    const imageBase64 = data.artifacts[0].base64;
    const imageUrl = `data:image/png;base64,${imageBase64}`;
    
    // Calculate cost (approximate)
    const cost = 0.02;

    return { imageUrl, cost };
}

export async function GET(req: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        const generations = await db
            .select()
            .from(imageGenerations)
            .where(eq(imageGenerations.userId, session.user.id))
            .orderBy(imageGenerations.createdAt)
            .limit(limit)
            .offset((page - 1) * limit);

        return NextResponse.json(generations);

    } catch (error) {
        console.error('Failed to fetch image generations:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}