import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { usageAnalytics, chatSessions, imageGenerations, webScrapes } from '@/db/schema/ai-services';
import { eq, gte, lte, and, count, sum, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const period = searchParams.get('period') || '30'; // default to last 30 days
        const days = parseInt(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Overall usage stats
        const [
            totalUsage,
            totalCost,
            chatUsage,
            imageUsage,
            scrapingUsage,
            providerStats,
            modelStats,
            dailyUsage,
            recentActivity
        ] = await Promise.all([
            // Total usage count
            db
                .select({ count: count() })
                .from(usageAnalytics)
                .where(
                    and(
                        eq(usageAnalytics.userId, session.user.id),
                        gte(usageAnalytics.createdAt, startDate)
                    )
                ),
            
            // Total cost
            db
                .select({ total: sum(usageAnalytics.cost) })
                .from(usageAnalytics)
                .where(
                    and(
                        eq(usageAnalytics.userId, session.user.id),
                        gte(usageAnalytics.createdAt, startDate)
                    )
                ),
            
            // Chat usage
            db
                .select({ count: count() })
                .from(usageAnalytics)
                .where(
                    and(
                        eq(usageAnalytics.userId, session.user.id),
                        eq(usageAnalytics.serviceType, 'chat'),
                        gte(usageAnalytics.createdAt, startDate)
                    )
                ),
            
            // Image usage
            db
                .select({ count: count() })
                .from(usageAnalytics)
                .where(
                    and(
                        eq(usageAnalytics.userId, session.user.id),
                        eq(usageAnalytics.serviceType, 'image_generation'),
                        gte(usageAnalytics.createdAt, startDate)
                    )
                ),
            
            // Scraping usage
            db
                .select({ count: count() })
                .from(usageAnalytics)
                .where(
                    and(
                        eq(usageAnalytics.userId, session.user.id),
                        eq(usageAnalytics.serviceType, 'web_scraping'),
                        gte(usageAnalytics.createdAt, startDate)
                    )
                ),
            
            // Provider breakdown
            db
                .select({
                    provider: usageAnalytics.provider,
                    count: count(),
                    cost: sum(usageAnalytics.cost),
                    tokens: sum(usageAnalytics.tokenCount),
                })
                .from(usageAnalytics)
                .where(
                    and(
                        eq(usageAnalytics.userId, session.user.id),
                        gte(usageAnalytics.createdAt, startDate)
                    )
                )
                .groupBy(usageAnalytics.provider),
            
            // Model breakdown
            db
                .select({
                    model: usageAnalytics.model,
                    provider: usageAnalytics.provider,
                    count: count(),
                    cost: sum(usageAnalytics.cost),
                    tokens: sum(usageAnalytics.tokenCount),
                })
                .from(usageAnalytics)
                .where(
                    and(
                        eq(usageAnalytics.userId, session.user.id),
                        gte(usageAnalytics.createdAt, startDate)
                    )
                )
                .groupBy(usageAnalytics.model, usageAnalytics.provider)
                .orderBy(desc(count())),
            
            // Daily usage for chart
            db
                .select({
                    date: usageAnalytics.createdAt,
                    serviceType: usageAnalytics.serviceType,
                    cost: usageAnalytics.cost,
                    tokens: usageAnalytics.tokenCount,
                })
                .from(usageAnalytics)
                .where(
                    and(
                        eq(usageAnalytics.userId, session.user.id),
                        gte(usageAnalytics.createdAt, startDate)
                    )
                )
                .orderBy(usageAnalytics.createdAt),
            
            // Recent activity
            db
                .select({
                    id: usageAnalytics.id,
                    serviceType: usageAnalytics.serviceType,
                    provider: usageAnalytics.provider,
                    model: usageAnalytics.model,
                    cost: usageAnalytics.cost,
                    createdAt: usageAnalytics.createdAt,
                    metadata: usageAnalytics.metadata,
                })
                .from(usageAnalytics)
                .where(
                    eq(usageAnalytics.userId, session.user.id)
                )
                .orderBy(desc(usageAnalytics.createdAt))
                .limit(10),
        ]);

        // Chat sessions stats
        const chatSessionStats = await db
            .select({
                totalSessions: count(),
                activeSessions: count(),
            })
            .from(chatSessions)
            .where(
                and(
                    eq(chatSessions.userId, session.user.id),
                    gte(chatSessions.createdAt, startDate)
                )
            );

        // Process daily usage for charts
        const dailyUsageMap = new Map();
        dailyUsage.forEach(item => {
            const date = new Date(item.date).toISOString().split('T')[0];
            if (!dailyUsageMap.has(date)) {
                dailyUsageMap.set(date, {
                    date,
                    chat: 0,
                    image_generation: 0,
                    web_scraping: 0,
                    totalCost: 0,
                    totalTokens: 0,
                });
            }
            const dayData = dailyUsageMap.get(date);
            dayData[item.serviceType] += 1;
            dayData.totalCost += parseFloat(item.cost || '0');
            dayData.totalTokens += item.tokens || 0;
        });

        // Fill missing dates
        const filledDailyUsage = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            if (dailyUsageMap.has(dateStr)) {
                filledDailyUsage.push(dailyUsageMap.get(dateStr));
            } else {
                filledDailyUsage.push({
                    date: dateStr,
                    chat: 0,
                    image_generation: 0,
                    web_scraping: 0,
                    totalCost: 0,
                    totalTokens: 0,
                });
            }
        }

        const analytics = {
            summary: {
                totalRequests: totalUsage[0]?.count || 0,
                totalCost: parseFloat(totalCost[0]?.total || '0'),
                chatRequests: chatUsage[0]?.count || 0,
                imageRequests: imageUsage[0]?.count || 0,
                scrapingRequests: scrapingUsage[0]?.count || 0,
                chatSessions: chatSessionStats[0]?.totalSessions || 0,
                activeSessions: chatSessionStats[0]?.activeSessions || 0,
            },
            providerBreakdown: providerStats.map(stat => ({
                provider: stat.provider,
                requests: stat.count,
                cost: parseFloat(stat.cost || '0'),
                tokens: stat.tokens || 0,
            })),
            modelBreakdown: modelStats.map(stat => ({
                model: stat.model,
                provider: stat.provider,
                requests: stat.count,
                cost: parseFloat(stat.cost || '0'),
                tokens: stat.tokens || 0,
            })),
            dailyUsage: filledDailyUsage,
            recentActivity: recentActivity.map(activity => ({
                ...activity,
                cost: parseFloat(activity.cost || '0'),
            })),
        };

        return NextResponse.json(analytics);

    } catch (error) {
        console.error('Failed to fetch analytics:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}