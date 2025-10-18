import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { db, chatSessions, chatMessages, usageAnalytics } from '@/db';
import { eq, and } from 'drizzle-orm';
import { getApiKeyForProvider } from '@/lib/api-keys';
import { getSystemApiKey } from '@/lib/utils';
import { auth } from '@/lib/auth';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Configure available models
const MODEL_CONFIGS = {
  'openai-gpt-4': { provider: 'openai', modelName: 'gpt-4-turbo-preview' },
  'openai-gpt-3.5': { provider: 'openai', modelName: 'gpt-3.5-turbo' },
  'anthropic-claude-3': { provider: 'anthropic', modelName: 'claude-3-opus-20240229' },
  'anthropic-claude-3.5': { provider: 'anthropic', modelName: 'claude-3-5-sonnet-20241022' },
  'google-gemini-pro': { provider: 'google', modelName: 'gemini-1.5-pro-latest' },
} as const;

type ModelKey = keyof typeof MODEL_CONFIGS;

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
    const { messages, modelId = 'openai-gpt-4', systemPrompt, sessionId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response('Invalid messages', { status: 400 });
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

    // Calculate input tokens
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${messages.map(m => m.content).join('\n')}` : messages.map(m => m.content).join('\n');
    const inputTokens = countTokens(fullPrompt);
    let outputTokens = 0;

    // Create or get chat session
    let chatSessionId = sessionId;
    
    if (!chatSessionId) {
      // Create new session
      const [newSession] = await db.insert(chatSessions).values({
        userId: session.user.id,
        title: messages[0].content.substring(0, 100),
        model: modelId,
        systemPrompt: systemPrompt || null,
      }).returning({ id: chatSessions.id });
      
      chatSessionId = newSession.id;
    }

    // Save user message
    if (messages[messages.length - 1].role === 'user') {
      await db.insert(chatMessages).values({
        sessionId: chatSessionId,
        role: 'user',
        content: messages[messages.length - 1].content,
        tokenCount: countTokens(messages[messages.length - 1].content),
      });
    }

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
      messages: systemPrompt ? [
        { role: 'system', content: systemPrompt },
        ...messages
      ] : messages,
      onFinish: async (result) => {
        console.log('Chat finished, processing result:', result.text?.substring(0, 50) + '...');
        
        // Calculate usage metrics
        const outputTokens = countTokens(result.text);
        const totalTokens = inputTokens + outputTokens;
        const cost = calculateCost(modelConfig.provider, modelId, inputTokens, outputTokens);

        console.log('Finishing chat, saving to database...');
        
        // Save assistant response
        try {
          await db.insert(chatMessages).values({
            sessionId: chatSessionId!,
            role: 'assistant',
            content: result.text,
            tokenCount: outputTokens,
          });
          console.log('Saved chat message successfully');
        } catch (dbError) {
          console.error('Error saving chat message:', dbError);
        }

        // Update session timestamp
        try {
          await db.update(chatSessions)
            .set({ updatedAt: new Date() })
            .where(eq(chatSessions.id, chatSessionId!));
          console.log('Updated session timestamp');
        } catch (dbError) {
          console.error('Error updating session:', dbError);
        }

        // Log usage analytics
        try {
          await db.insert(usageAnalytics).values({
            userId: session.user.id,
            serviceType: 'chat',
            provider: modelConfig.provider,
            model: modelId,
            tokensUsed: totalTokens,
            cost: cost.toString(),
            metadata: {
              sessionId: chatSessionId,
              inputTokens,
              outputTokens,
              modelConfig: modelConfig.provider,
            },
          });
          console.log('Logged analytics successfully');
        } catch (dbError) {
          console.error('Error logging analytics:', dbError);
        }
      },
    });

    // Convert the result to a response
    // Create a manual streaming response
    const encoder = new TextEncoder();
    
    const customStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            // Format as AI SDK format (0:content for text chunks)
            const formattedChunk = `0:${chunk}\n`;
            controller.enqueue(encoder.encode(formattedChunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Get chat sessions for user
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      // Get messages for a specific session
      const messages = await db
        .select({
          id: chatMessages.id,
          role: chatMessages.role,
          content: chatMessages.content,
          tokenCount: chatMessages.tokenCount,
          createdAt: chatMessages.createdAt,
        })
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, sessionId))
        .orderBy(chatMessages.createdAt);

      return Response.json({ success: true, data: messages });
    } else {
      // Get all sessions for the user
      const sessions = await db
        .select({
          id: chatSessions.id,
          title: chatSessions.title,
          model: chatSessions.model,
          createdAt: chatSessions.createdAt,
          updatedAt: chatSessions.updatedAt,
        })
        .from(chatSessions)
        .where(eq(chatSessions.userId, session.user.id))
        .orderBy(chatSessions.updatedAt);

      return Response.json({ success: true, data: sessions });
    }
  } catch (error) {
    console.error('Chat sessions API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
