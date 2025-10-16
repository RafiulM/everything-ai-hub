import { NextRequest, NextResponse } from 'next/server';
import { db, webScrapes, usageAnalytics } from '@/db';
import { eq } from 'drizzle-orm';
import { getApiKeyForProvider } from '@/lib/api-keys';
import { getSystemApiKey } from '@/lib/utils';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import FirecrawlApp from '@mendable/firecrawl-js';

// Validation schema for web scraping requests
const webScrapingSchema = z.object({
  url: z.string().url('Invalid URL format'),
  format: z.enum(['markdown', 'html', 'raw']).default('markdown'),
});

// Cost per scrape (approximate)
const COST_PER_SCRAPE = 0.001;

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
    const validatedData = webScrapingSchema.parse(body);

    // Get API key
    const apiKey = await getApiKeyForProvider('firecrawl') ||
                   getSystemApiKey('firecrawl');

    if (!apiKey) {
      return NextResponse.json({ 
        error: 'No Firecrawl API key configured' 
      }, { status: 400 });
    }

    // Create database record
    const [scrapeRecord] = await db.insert(webScrapes).values({
      userId: session.user.id,
      url: validatedData.url,
      provider: 'firecrawl',
      format: validatedData.format,
      status: 'pending',
      cost: COST_PER_SCRAPE.toString(),
    }).returning({
      id: webScrapes.id,
    });

    let content: string | null = null;
    let metadata: any = null;
    let errorMessage: string | null = null;

    try {
      // Initialize Firecrawl client
      const app = new FirecrawlApp({ apiKey });

      // Scrape the URL
      const scrapeResult = await app.scrapeUrl(validatedData.url, {
        formats: [validatedData.format],
      });

      if (scrapeResult.success) {
        content = scrapeResult[validatedData.format] || null;
        
        if (scrapeResult.metadata) {
          metadata = {
            title: scrapeResult.metadata.title || '',
            description: scrapeResult.metadata.description || '',
            language: scrapeResult.metadata.language || '',
            keywords: scrapeResult.metadata.keywords || '',
            ogTitle: scrapeResult.metadata.ogTitle || '',
            ogDescription: scrapeResult.metadata.ogDescription || '',
            ogImage: scrapeResult.metadata.ogImage || '',
            author: scrapeResult.metadata.author || '',
            publishDate: scrapeResult.metadata.publishDate || '',
            sourceURL: scrapeResult.metadata.sourceURL || validatedData.url,
            pageStatusCode: scrapeResult.metadata.pageStatusCode,
            pageError: scrapeResult.metadata.pageError,
          };
        }

        // Update record with success
        await db.update(webScrapes)
          .set({
            content,
            metadata,
            status: 'completed',
            completedAt: new Date(),
          })
          .where(eq(webScrapes.id, scrapeRecord.id));

        // Log usage analytics
        await db.insert(usageAnalytics).values({
          userId: session.user.id,
          serviceType: 'scraping',
          provider: 'firecrawl',
          model: 'firecrawl-scrape',
          tokensUsed: 0,
          cost: COST_PER_SCRAPE.toString(),
          metadata: {
            webScrapeId: scrapeRecord.id,
            url: validatedData.url,
            format: validatedData.format,
            contentLength: content?.length || 0,
          },
        });

        return NextResponse.json({
          success: true,
          data: {
            id: scrapeRecord.id,
            url: validatedData.url,
            format: validatedData.format,
            content,
            metadata,
          }
        });

      } else {
        throw new Error(scrapeResult.error || 'Failed to scrape URL');
      }

    } catch (error) {
      console.error('Web scraping error:', error);
      errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update record with error
      await db.update(webScrapes)
        .set({
          status: 'failed',
          errorMessage,
          completedAt: new Date(),
        })
        .where(eq(webScrapes.id, scrapeRecord.id));

      return NextResponse.json({
        success: false,
        error: errorMessage,
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Web scraping API error:', error);
    
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

// GET endpoint to retrieve web scraping history
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

    const scrapes = await db
      .select({
        id: webScrapes.id,
        url: webScrapes.url,
        format: webScrapes.format,
        content: webScrapes.content,
        metadata: webScrapes.metadata,
        status: webScrapes.status,
        cost: webScrapes.cost,
        createdAt: webScrapes.createdAt,
        completedAt: webScrapes.completedAt,
      })
      .from(webScrapes)
      .where(eq(webScrapes.userId, session.user.id))
      .orderBy(webScrapes.createdAt)
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: scrapes,
    });

  } catch (error) {
    console.error('Web scraping history API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
