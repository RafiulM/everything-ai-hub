import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { db, usageAnalytics } from '@/db';
import { getApiKeyForProvider } from '@/lib/api-keys';
import { getSystemApiKey } from '@/lib/utils';
import { auth } from '@/lib/auth';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Configure available models - same as chat API
const MODEL_CONFIGS = {
  'openai-gpt-4': { provider: 'openai', modelName: 'gpt-4-turbo-preview' },
  'openai-gpt-3.5': { provider: 'openai', modelName: 'gpt-3.5-turbo' },
  'anthropic-claude-3': { provider: 'anthropic', modelName: 'claude-3-opus-20240229' },
  'anthropic-claude-3.5': { provider: 'anthropic', modelName: 'claude-3-5-sonnet-20241022' },
  'google-gemini-pro': { provider: 'google', modelName: 'gemini-1.5-pro-latest' },
} as const;

type ModelKey = keyof typeof MODEL_CONFIGS;

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Mock token counter - in production you'd want to use tokenizer libraries
function countTokens(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

// Calculate cost based on model and tokens
function calculateCost(provider: string, model: string, inputTokens: number, outputTokens: number): number {
  const rates: Record<string, { input: number; output: number }> = {
    'openai': { input: 0.00001, output: 0.00003 }, // GPT-4 rates (per token)
    'anthropic': { input: 0.000015, output: 0.000075 }, // Claude rates
    'google': { input: 0.00000125, output: 0.00000375 }, // Gemini rates
  };

  const rate = rates[provider];
  if (!rate) return 0;

  return (inputTokens * rate.input) + (outputTokens * rate.output);
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { 
      prompt, 
      modelId = 'openai-gpt-4', 
      systemPrompt = 'You are an AI assistant helping with markdown document creation. Provide helpful, concise responses for creating and editing markdown content. When generating content that should be added to the document, make it clear and well-formatted markdown.',
      messages = []
    } = body;

    if (!prompt?.trim()) {
      return new Response('Invalid prompt', { status: 400 });
    }

    // Validate model
    const modelConfig = MODEL_CONFIGS[modelId as ModelKey];
    if (!modelConfig) {
      return new Response(`Invalid model: ${modelId}. Available models: ${Object.keys(MODEL_CONFIGS).join(', ')}`, { status: 400 });
    }

    // Get API key
    const apiKey = await getApiKeyForProvider(modelConfig.provider) ||
                   getSystemApiKey(modelConfig.provider);

    if (!apiKey) {
      return new Response(`No API key configured for ${modelConfig.provider}`, { status: 400 });
    }

    // Build conversation history with current prompt
    const conversationHistory: Message[] = [
      { role: 'system', content: systemPrompt },
      ...messages.filter((msg: any) => msg.role === 'user' || msg.role === 'assistant'),
      { role: 'user', content: prompt }
    ];

    // Calculate input tokens
    const fullPrompt = conversationHistory.map(m => m.content).join('\n');
    const inputTokens = countTokens(fullPrompt);

    // Configure API keys for the provider
    const providerConfig = { apiKey };
    let model;

    const modelName = modelConfig.modelName || 'gpt-4-turbo-preview';

    switch (modelConfig.provider) {
      case 'openai':
        model = openai(modelName, providerConfig);
        break;
      case 'anthropic':
        model = anthropic(modelName, providerConfig);
        break;
      case 'google':
        model = google(modelName, providerConfig);
        break;
      default:
        return new Response('Unsupported provider', { status: 400 });
    }

    const result = streamText({
      model,
      messages: conversationHistory,
      onFinish: async (result) => {
        try {
          // Calculate usage metrics
          const outputTokens = countTokens(result.text);
          const totalTokens = inputTokens + outputTokens;
          const cost = calculateCost(modelConfig.provider, modelId, inputTokens, outputTokens);

          // Log usage analytics for AI Canvas
          await db.insert(usageAnalytics).values({
            userId: session.user.id,
            serviceType: 'ai-canvas',
            provider: modelConfig.provider,
            model: modelId,
            tokensUsed: totalTokens,
            cost: cost.toString(),
            metadata: {
              inputTokens,
              outputTokens,
              modelConfig: modelConfig.provider,
              promptLength: prompt.length,
            },
          });
        } catch (dbError) {
          console.error('Error logging AI Canvas analytics:', dbError);
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('AI Canvas API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}