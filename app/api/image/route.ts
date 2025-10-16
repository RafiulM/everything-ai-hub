import { NextRequest, NextResponse } from 'next/server';
import { db, imageGenerations, usageAnalytics } from '@/db';
import { eq } from 'drizzle-orm';
import { getApiKeyForProvider } from '@/lib/api-keys';
import { getSystemApiKey } from '@/lib/utils';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import OpenAI from 'openai';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Validation schema for image generation requests
const imageGenerationSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(1000, 'Prompt too long'),
  provider: z.enum(['openai', 'stability']).default('openai'),
  model: z.string().default('dall-e-3'),
  size: z.enum(['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792']).default('1024x1024'),
  quality: z.enum(['standard', 'hd']).default('standard'),
  style: z.enum(['vivid', 'natural']).default('vivid'),
  n: z.number().min(1).max(4).default(1),
});

// Model configurations
const MODEL_CONFIGS = {
  openai: {
    'dall-e-3': {
      supportedSizes: ['1024x1024', '1792x1024', '1024x1792'],
      supportedQualities: ['standard', 'hd'],
      supportedStyles: ['vivid', 'natural'],
      maxPromptLength: 4000,
      costPerGeneration: 0.04, // DALL-E 3 pricing
    },
    'dall-e-2': {
      supportedSizes: ['256x256', '512x512', '1024x1024'],
      supportedQualities: ['standard'],
      supportedStyles: [],
      maxPromptLength: 1000,
      costPerGeneration: 0.018, // DALL-E 2 pricing
    },
  },
  stability: {
    'stable-diffusion-xl': {
      supportedSizes: ['512x512', '768x768', '1024x1024', '1152x896', '896x1152'],
      supportedQualities: ['standard'],
      supportedStyles: [],
      maxPromptLength: 2000,
      costPerGeneration: 0.02,
    },
  },
} as const;

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = imageGenerationSchema.parse(body);

    // Get provider configuration
    const providerConfig = MODEL_CONFIGS[validatedData.provider];
    const modelConfig = providerConfig[validatedData.model as keyof typeof providerConfig];

    if (!modelConfig) {
      return NextResponse.json({ 
        error: `Model ${validatedData.model} not supported for provider ${validatedData.provider}` 
      }, { status: 400 });
    }

    // Validate model-specific options
    if (!modelConfig.supportedSizes.includes(validatedData.size)) {
      return NextResponse.json({ 
        error: `Size ${validatedData.size} not supported for ${validatedData.model}` 
      }, { status: 400 });
    }

    if (validatedData.quality && !modelConfig.supportedQualities.includes(validatedData.quality)) {
      return NextResponse.json({ 
        error: `Quality ${validatedData.quality} not supported for ${validatedData.model}` 
      }, { status: 400 });
    }

    // Get API key
    const apiKey = await getApiKeyForProvider(validatedData.provider) ||
                   getSystemApiKey(validatedData.provider);

    if (!apiKey) {
      return NextResponse.json({ 
        error: `No API key configured for ${validatedData.provider}` 
      }, { status: 400 });
    }

    // Create database record
    const [imageRecord] = await db.insert(imageGenerations).values({
      userId: session.user.id,
      prompt: validatedData.prompt,
      provider: validatedData.provider,
      model: validatedData.model,
      size: validatedData.size,
      quality: validatedData.quality,
      style: validatedData.style,
      status: 'pending',
      cost: (modelConfig.costPerGeneration * validatedData.n).toString(),
    }).returning({
      id: imageGenerations.id,
    });

    let imageUrl: string | null = null;
    let errorMessage: string | null = null;

    try {
      if (validatedData.provider === 'openai') {
        imageUrl = await generateOpenAIImage(apiKey, validatedData);
      } else if (validatedData.provider === 'stability') {
        imageUrl = await generateStabilityImage(apiKey, validatedData);
      }

      if (imageUrl) {
        // Update record with success
        await db.update(imageGenerations)
          .set({
            imageUrl,
            status: 'completed',
            completedAt: new Date(),
          })
          .where(eq(imageGenerations.id, imageRecord.id));

        // Log usage analytics
        await db.insert(usageAnalytics).values({
          userId: session.user.id,
          serviceType: 'image',
          provider: validatedData.provider,
          model: validatedData.model,
          tokensUsed: 0, // Image generation doesn't use tokens in the same way
          cost: (modelConfig.costPerGeneration * validatedData.n).toString(),
          metadata: {
            imageGenerationId: imageRecord.id,
            prompt: validatedData.prompt,
            size: validatedData.size,
            quality: validatedData.quality,
            style: validatedData.style,
          },
        });

        return NextResponse.json({
          success: true,
          data: {
            id: imageRecord.id,
            imageUrl,
            prompt: validatedData.prompt,
            model: validatedData.model,
            size: validatedData.size,
          }
        });

      } else {
        throw new Error('Failed to generate image');
      }

    } catch (error) {
      console.error('Image generation error:', error);
      errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update record with error
      await db.update(imageGenerations)
        .set({
          status: 'failed',
          errorMessage,
          completedAt: new Date(),
        })
        .where(eq(imageGenerations.id, imageRecord.id));

      return NextResponse.json({
        success: false,
        error: errorMessage,
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Image generation API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Internal Server Error',
    }, { status: 500 });
  }
}

async function generateOpenAIImage(apiKey: string, data: z.infer<typeof imageGenerationSchema>): Promise<string> {
  const openai = new OpenAI({ apiKey });

  const response = await openai.images.generate({
    model: data.model,
    prompt: data.prompt,
    n: data.n,
    size: data.size as any,
    quality: data.quality as any,
    style: data.style as any,
  });

  if (!response.data || response.data.length === 0) {
    throw new Error('No images generated');
  }

  return response.data[0].url!;
}

async function generateStabilityImage(apiKey: string, data: z.infer<typeof imageGenerationSchema>): Promise<string> {
  // This is a simplified implementation
  // In production, you'd use the actual Stability AI client
  const url = 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image';
  
  const [width, height] = data.size.split('x').map(Number);
  
  const body = {
    cfg_scale: 7,
    height,
    width,
    samples: data.n,
    steps: 30,
    text_prompts: [
      {
        text: data.prompt,
        weight: 1
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stability AI error: ${error}`);
  }

  const result = await response.json();
  
  if (!result.artifacts || result.artifacts.length === 0) {
    throw new Error('No images generated');
  }

  // Convert base64 to URL (in production, you'd upload to storage)
  const base64Image = result.artifacts[0].base64;
  const mimeType = 'image/png';
  const dataUrl = `data:${mimeType};base64,${base64Image}`;
  
  return dataUrl;
}

// GET endpoint to retrieve image generation history
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const images = await db
      .select({
        id: imageGenerations.id,
        prompt: imageGenerations.prompt,
        provider: imageGenerations.provider,
        model: imageGenerations.model,
        size: imageGenerations.size,
        quality: imageGenerations.quality,
        style: imageGenerations.style,
        imageUrl: imageGenerations.imageUrl,
        status: imageGenerations.status,
        cost: imageGenerations.cost,
        createdAt: imageGenerations.createdAt,
        completedAt: imageGenerations.completedAt,
      })
      .from(imageGenerations)
      .where(eq(imageGenerations.userId, session.user.id))
      .orderBy(imageGenerations.createdAt)
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: images,
    });

  } catch (error) {
    console.error('Image history API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
