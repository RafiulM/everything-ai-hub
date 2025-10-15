import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserApiKeyForProvider, getSystemApiKey } from '@/lib/api-keys';
import { db } from '@/db';
import { webScrapes, usageAnalytics } from '@/db/schema/ai-services';
import { eq } from 'drizzle-orm';

interface ScrapeRequest {
    url: string;
    provider?: string;
    options?: {
        includeRawHtml?: boolean;
        onlyMainContent?: boolean;
        formats?: string[];
    };
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: ScrapeRequest = await req.json();
        const { url, provider = 'firecrawl', options = {} } = body;

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Validate URL
        try {
            new URL(url);
        } catch {
            return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
        }

        // Get API key (user key first, then system key)
        const userApiKey = await getUserApiKeyForProvider(provider);
        const apiKey = userApiKey?.decryptedApiKey || await getSystemApiKey(provider);

        if (!apiKey) {
            return NextResponse.json({ error: `No API key configured for ${provider}` }, { status: 400 });
        }

        // Create web scrape record
        const scrape = await db.insert(webScrapes).values({
            userId: session.user.id,
            url,
            provider: provider as any,
            status: 'pending',
        }).returning();

        let scrapedData: any = {};
        let markdown = '';
        let cost = 0;

        try {
            if (provider === 'firecrawl') {
                const result = await scrapeWithFirecrawl(apiKey, url, options);
                scrapedData = result.data;
                markdown = result.markdown;
                cost = result.cost;
            } else {
                throw new Error(`Unsupported provider: ${provider}`);
            }

            // Update scrape record with success
            await db.update(webScrapes)
                .set({
                    scrapedData,
                    markdown,
                    cost: cost.toString(),
                    status: 'completed',
                    updatedAt: new Date(),
                })
                .where(eq(webScrapes.id, scrape[0].id));

            // Log usage analytics
            await db.insert(usageAnalytics).values({
                userId: session.user.id,
                serviceType: 'web_scraping',
                provider: provider as any,
                model: 'default',
                tokenCount: 0,
                cost: cost.toString(),
                metadata: {
                    url,
                    options,
                },
            });

            return NextResponse.json({
                id: scrape[0].id,
                url,
                data: scrapedData,
                markdown,
                cost,
            });

        } catch (error) {
            // Update scrape record with error
            await db.update(webScrapes)
                .set({
                    status: 'failed',
                    updatedAt: new Date(),
                })
                .where(eq(webScrapes.id, scrape[0].id));

            throw error;
        }

    } catch (error: any) {
        console.error('Web scraping error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to scrape website' },
            { status: 500 }
        );
    }
}

async function scrapeWithFirecrawl(
    apiKey: string,
    url: string,
    options: any
) {
    const params = new URLSearchParams({
        url: url,
    });

    if (options.includeRawHtml) {
        params.append('includeRawHtml', 'true');
    }
    if (options.onlyMainContent) {
        params.append('onlyMainContent', 'true');
    }
    if (options.formats && options.formats.length > 0) {
        params.append('formats', options.formats.join(','));
    }

    const response = await fetch(`https://api.firecrawl.dev/v0/scrape?${params}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to scrape with Firecrawl');
    }

    const data = await response.json();
    
    // Calculate cost (Firecrawl credits)
    const cost = 0.001; // ~1 credit per scrape

    return {
        data: data.data,
        markdown: data.data?.markdown || '',
        cost,
    };
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

        const scrapes = await db
            .select()
            .from(webScrapes)
            .where(eq(webScrapes.userId, session.user.id))
            .orderBy(webScrapes.createdAt)
            .limit(limit)
            .offset((page - 1) * limit);

        return NextResponse.json(scrapes);

    } catch (error) {
        console.error('Failed to fetch web scrapes:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}