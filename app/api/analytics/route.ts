import { NextRequest, NextResponse } from 'next/server';
import { db, usageAnalytics, chatSessions, imageGenerations, webScrapes } from '@/db';
import { eq, and, gte, lte, sql, count, sum, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

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
    const period = searchParams.get('period') || '7'; // Default to 7 days

    // Calculate date range
    const now = new Date();
    const daysAgo = new Date(now.getTime() - parseInt(period) * 24 * 60 * 60 * 1000);

    // Get usage analytics for the period
    const analyticsData = await db
      .select({
        serviceType: usageAnalytics.serviceType,
        provider: usageAnalytics.provider,
        model: usageAnalytics.model,
        tokensUsed: usageAnalytics.tokensUsed,
        cost: usageAnalytics.cost,
        createdAt: usageAnalytics.createdAt,
      })
      .from(usageAnalytics)
      .where(
        and(
          eq(usageAnalytics.userId, session.user.id),
          gte(usageAnalytics.createdAt, daysAgo)
        )
      )
      .orderBy(desc(usageAnalytics.createdAt));

    // Get chat sessions count
    const chatSessionsCount = await db
      .select({ count: count() })
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.userId, session.user.id),
          gte(chatSessions.createdAt, daysAgo)
        )
      );

    // Get image generations count
    const imageGenerationsCount = await db
      .select({ count: count() })
      .from(imageGenerations)
      .where(
        and(
          eq(imageGenerations.userId, session.user.id),
          gte(imageGenerations.createdAt, daysAgo),
          eq(imageGenerations.status, 'completed')
        )
      );

    // Get web scrapes count
    const webScrapesCount = await db
      .select({ count: count() })
      .from(webScrapes)
      .where(
        and(
          eq(webScrapes.userId, session.user.id),
          gte(webScrapes.createdAt, daysAgo),
          eq(webScrapes.status, 'completed')
        )
      );

    // Calculate totals
    const totalRequests = analyticsData.length;
    const totalTokens = analyticsData.reduce((sum, item) => sum + (item.tokensUsed || 0), 0);
    const totalCost = analyticsData.reduce((sum, item) => sum + parseFloat(item.cost || '0'), 0);

    // Group by service type
    const serviceTypeBreakdown = analyticsData.reduce((acc: any, item) => {
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
    const providerBreakdown = analyticsData.reduce((acc: any, item) => {
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
    const modelBreakdown = analyticsData.reduce((acc: any, item) => {
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
    const dailyUsage = analyticsData.reduce((acc: any, item) => {
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

    // Get recent activity
    const recentActivity = analyticsData.slice(0, 10).map(item => ({
      id: item.createdAt,
      serviceType: item.serviceType,
      provider: item.provider,
      model: item.model,
      cost: parseFloat(item.cost || '0'),
      timestamp: item.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        period: parseInt(period),
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
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
