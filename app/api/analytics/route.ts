import { NextRequest, NextResponse } from 'next/server';
import { db, usageAnalytics, chatSessions, imageGenerations, webScrapes } from '@/db';
import { eq, and, gte, lte, sql, count, sum, desc, inArray, like, or } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { z } from 'zod';

// Filter validation schema
const filterSchema = z.object({
  search: z.string().optional(),
  status: z.array(z.string()).optional(),
  category: z.array(z.string()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'cost', 'tokensUsed', 'serviceType', 'provider', 'model']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    // Parse and validate filter parameters
    const rawFilters = {
      search: searchParams.get('search'),
      status: searchParams.getAll('status'),
      category: searchParams.getAll('category'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      period: searchParams.get('period') || '7', // Keep backward compatibility
    };

    const { data: filters, error: validationError } = filterSchema.safeParse(rawFilters);

    if (validationError) {
      return NextResponse.json({
        error: 'Invalid filter parameters',
        details: validationError.issues
      }, { status: 400 });
    }

    // Calculate date range - use custom date range if provided, otherwise fall back to period
    const now = new Date();
    let dateFrom: Date;
    let dateTo: Date = now;

    if (filters.dateFrom) {
      dateFrom = new Date(filters.dateFrom);
    } else {
      // Fallback to period-based filtering
      const daysAgo = new Date(now.getTime() - parseInt(rawFilters.period!) * 24 * 60 * 60 * 1000);
      dateFrom = daysAgo;
    }

    if (filters.dateTo) {
      dateTo = new Date(filters.dateTo);
      // Set to end of day
      dateTo.setHours(23, 59, 59, 999);
    }

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    // Build dynamic query conditions
    const buildWhereConditions = () => {
      const conditions = [
        eq(usageAnalytics.userId, session.user.id),
        gte(usageAnalytics.createdAt, dateFrom),
        lte(usageAnalytics.createdAt, dateTo),
      ];

      // Search filter - search in multiple fields
      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        conditions.push(
          or(
            like(usageAnalytics.serviceType, searchTerm),
            like(usageAnalytics.provider, searchTerm),
            like(usageAnalytics.model, searchTerm)
          )
        );
      }

      // Category filter (serviceType)
      if (filters.category && filters.category.length > 0) {
        conditions.push(inArray(usageAnalytics.serviceType, filters.category));
      }

      // Status filter (for image generations and web scrapes, we'll need to join)
      // This is complex, so we'll handle it in a separate query

      return and(...conditions) as any;
    };

    // Build sorting
    const buildOrder = () => {
      const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';
      const sortBy = filters.sortBy || 'createdAt';

      switch (sortBy) {
        case 'createdAt':
          return sortOrder === 'asc' ? usageAnalytics.createdAt : desc(usageAnalytics.createdAt);
        case 'cost':
          return sortOrder === 'asc' ? usageAnalytics.cost : desc(usageAnalytics.cost);
        case 'tokensUsed':
          return sortOrder === 'asc' ? usageAnalytics.tokensUsed : desc(usageAnalytics.tokensUsed);
        case 'serviceType':
          return sortOrder === 'asc' ? usageAnalytics.serviceType : desc(usageAnalytics.serviceType);
        case 'provider':
          return sortOrder === 'asc' ? usageAnalytics.provider : desc(usageAnalytics.provider);
        case 'model':
          return sortOrder === 'asc' ? usageAnalytics.model : desc(usageAnalytics.model);
        default:
          return desc(usageAnalytics.createdAt);
      }
    };

    // Get filtered usage analytics with pagination
    const whereConditions = buildWhereConditions();
    const orderBy = buildOrder();

    const analyticsQuery = db
      .select({
        serviceType: usageAnalytics.serviceType,
        provider: usageAnalytics.provider,
        model: usageAnalytics.model,
        tokensUsed: usageAnalytics.tokensUsed,
        cost: usageAnalytics.cost,
        createdAt: usageAnalytics.createdAt,
      })
      .from(usageAnalytics)
      .where(whereConditions)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const analyticsData = await analyticsQuery;

    // Get total count for pagination
    const totalCountQuery = db
      .select({ count: count() })
      .from(usageAnalytics)
      .where(whereConditions);

    const totalCountResult = await totalCountQuery;
    const totalCount = totalCountResult[0]?.count || 0;

    // Handle status filters for image generations and web scrapes
    let filteredAnalyticsData = analyticsData;
    if (filters.status && filters.status.length > 0) {
      // Get IDs for image generations with specified statuses
      const imageGenerationIds = filters.status.includes('image')
        ? await db
            .select({ id: imageGenerations.id })
            .from(imageGenerations)
            .where(
              and(
                eq(imageGenerations.userId, session.user.id),
                gte(imageGenerations.createdAt, dateFrom),
                lte(imageGenerations.createdAt, dateTo),
                inArray(imageGenerations.status, filters.status.filter(s => s.includes('image')))
              )
            )
        : [];

      // Get IDs for web scrapes with specified statuses
      const webScrapeIds = filters.status.includes('scraping')
        ? await db
            .select({ id: webScrapes.id })
            .from(webScrapes)
            .where(
              and(
                eq(webScrapes.userId, session.user.id),
                gte(webScrapes.createdAt, dateFrom),
                lte(webScrapes.createdAt, dateTo),
                inArray(webScrapes.status, filters.status.filter(s => s.includes('scraping')))
              )
            )
        : [];

      // Filter analytics data based on status
      if (imageGenerationIds.length > 0 || webScrapeIds.length > 0) {
        filteredAnalyticsData = analyticsData.filter(item => {
          if (item.serviceType === 'image' && imageGenerationIds.length > 0) {
            return true; // Simplified - in real implementation, you'd join or use metadata
          }
          if (item.serviceType === 'scraping' && webScrapeIds.length > 0) {
            return true; // Simplified - in real implementation, you'd join or use metadata
          }
          if (!filters.status.includes('image') && !filters.status.includes('scraping')) {
            return true; // Keep chat data
          }
          return false;
        });
      }
    }

    // Get counts with date filtering
    const chatSessionsCount = await db
      .select({ count: count() })
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.userId, session.user.id),
          gte(chatSessions.createdAt, dateFrom),
          lte(chatSessions.createdAt, dateTo)
        )
      );

    // Get image generations count with status filtering
    const imageGenerationsWhereConditions = [
      eq(imageGenerations.userId, session.user.id),
      gte(imageGenerations.createdAt, dateFrom),
      lte(imageGenerations.createdAt, dateTo)
    ];

    // Add status filter if specified
    if (filters.status && filters.status.length > 0) {
      const imageStatuses = filters.status?.filter(s => s.includes('completed') || s.includes('failed') || s.includes('pending')) || [];
      if (imageStatuses.length > 0) {
        imageGenerationsWhereConditions.push(inArray(imageGenerations.status, imageStatuses));
      }
    }

    const imageGenerationsCount = await db
      .select({ count: count() })
      .from(imageGenerations)
      .where(and(...imageGenerationsWhereConditions));

    // Get web scrapes count with status filtering
    const webScrapesWhereConditions = [
      eq(webScrapes.userId, session.user.id),
      gte(webScrapes.createdAt, dateFrom),
      lte(webScrapes.createdAt, dateTo)
    ];

    // Add status filter if specified
    if (filters.status && filters.status.length > 0) {
      const scrapeStatuses = filters.status?.filter(s => s.includes('completed') || s.includes('failed') || s.includes('pending')) || [];
      if (scrapeStatuses.length > 0) {
        webScrapesWhereConditions.push(inArray(webScrapes.status, scrapeStatuses));
      }
    }

    const webScrapesCount = await db
      .select({ count: count() })
      .from(webScrapes)
      .where(and(...webScrapesWhereConditions));

    // Use filtered data for calculations
    const dataToProcess = filteredAnalyticsData;

    // Calculate totals
    const totalRequests = dataToProcess.length;
    const totalTokens = dataToProcess.reduce((sum, item) => sum + (item.tokensUsed || 0), 0);
    const totalCost = dataToProcess.reduce((sum, item) => sum + parseFloat(item.cost || '0'), 0);

    // Group by service type
    const serviceTypeBreakdown = dataToProcess.reduce((acc: any, item) => {
      const serviceType = item.serviceType;
      if (!acc[serviceType]) {
        acc[serviceType] = {
          count: 0,
          tokensUsed: 0,
          cost: 0,
        };
      }
      acc[serviceType].count += 1;
      acc[serviceType].tokensUsed += item.tokensUsed || 0;
      acc[serviceType].cost += parseFloat(item.cost || '0');
      return acc;
    }, {});

    // Group by provider
    const providerBreakdown = dataToProcess.reduce((acc: any, item) => {
      const provider = item.provider;
      if (!acc[provider]) {
        acc[provider] = {
          count: 0,
          tokensUsed: 0,
          cost: 0,
        };
      }
      acc[provider].count += 1;
      acc[provider].tokensUsed += item.tokensUsed || 0;
      acc[provider].cost += parseFloat(item.cost || '0');
      return acc;
    }, {});

    // Group by model
    const modelBreakdown = dataToProcess.reduce((acc: any, item) => {
      const model = item.model || 'unknown';
      if (!acc[model]) {
        acc[model] = {
          count: 0,
          tokensUsed: 0,
          cost: 0,
          provider: item.provider,
        };
      }
      acc[model].count += 1;
      acc[model].tokensUsed += item.tokensUsed || 0;
      acc[model].cost += parseFloat(item.cost || '0');
      return acc;
    }, {});

    // Daily usage for chart
    const dailyUsage = dataToProcess.reduce((acc: any, item) => {
      const date = new Date(item.createdAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          requests: 0,
          cost: 0,
          tokens: 0,
        };
      }
      acc[date].requests += 1;
      acc[date].cost += parseFloat(item.cost || '0');
      acc[date].tokens += item.tokensUsed || 0;
      return acc;
    }, {});

    // Convert daily usage to array and sort by date
    const chartData = Object.values(dailyUsage)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Get favorite models (by usage count)
    const favoriteModels = Object.entries(modelBreakdown)
      .map(([model, data]: [string, any]) => ({
        model,
        count: data.count,
        provider: data.provider,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get recent activity (limited by pagination)
    const recentActivity = dataToProcess.slice(0, 10).map(item => ({
      id: item.createdAt,
      serviceType: item.serviceType,
      provider: item.provider,
      model: item.model,
      cost: parseFloat(item.cost || '0'),
      timestamp: item.createdAt,
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        period: parseInt(rawFilters.period!),
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage,
          hasPreviousPage,
        },
        filters: {
          applied: {
            search: filters.search,
            status: filters.status,
            category: filters.category,
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder,
          },
          dateRange: {
            from: dateFrom.toISOString(),
            to: dateTo.toISOString(),
          },
        },
        summary: {
          totalRequests,
          totalTokens,
          totalCost,
          chatSessions: chatSessionsCount[0]?.count || 0,
          imageGenerations: imageGenerationsCount[0]?.count || 0,
          webScrapes: webScrapesCount[0]?.count || 0,
        },
        serviceTypeBreakdown,
        providerBreakdown,
        modelBreakdown,
        chartData,
        favoriteModels,
        recentActivity,
      },
    });

  } catch (error) {
    console.error('Analytics API error:', error);

    // Type-safe error handling
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }

    return NextResponse.json({
      error: 'Internal Server Error',
      message: 'Failed to fetch analytics data. Please try again later.',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
