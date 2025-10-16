"use server";

import { db } from "@/db";
import { usageAnalytics, chatSessions, imageGenerations, webScrapes } from "@/db/schema/ai";
import { getSession } from "@/lib/auth";
import { eq, gte, lte, desc } from "drizzle-orm";

export async function getAnalyticsSummary(days: number = 30) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const analytics = await db
      .select()
      .from(usageAnalytics)
      .where(
        eq(usageAnalytics.userId, session.user.id!)
      );

    const filteredAnalytics = analytics.filter(
      (a) => new Date(a.createdAt) >= startDate
    );

    const totalRequests = filteredAnalytics.length;
    const totalCost = filteredAnalytics.reduce(
      (sum, a) => sum + (a.costUsd ? parseFloat(a.costUsd.toString()) : 0),
      0
    );

    const byProvider: Record<string, number> = {};
    const byService: Record<string, number> = {};

    filteredAnalytics.forEach((a) => {
      byProvider[a.provider] = (byProvider[a.provider] || 0) + 1;
      byService[a.serviceType] = (byService[a.serviceType] || 0) + 1;
    });

    return {
      totalRequests,
      totalCost: totalCost.toFixed(4),
      byProvider,
      byService,
    };
  } catch (error) {
    console.error("Error fetching analytics summary:", error);
    throw new Error("Failed to fetch analytics");
  }
}

export async function getAnalyticsOverTime(days: number = 30) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const analytics = await db
      .select()
      .from(usageAnalytics)
      .where(eq(usageAnalytics.userId, session.user.id!));

    const filteredAnalytics = analytics.filter(
      (a) => new Date(a.createdAt) >= startDate
    );

    // Group by day
    const byDay: Record<string, number> = {};
    filteredAnalytics.forEach((a) => {
      const date = new Date(a.createdAt).toISOString().split("T")[0];
      byDay[date] = (byDay[date] || 0) + 1;
    });

    return Object.entries(byDay).map(([date, count]) => ({
      date,
      count,
    }));
  } catch (error) {
    console.error("Error fetching analytics over time:", error);
    throw new Error("Failed to fetch analytics");
  }
}

export async function getRecentActivities(limit: number = 10) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  try {
    const chatData = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, session.user.id!))
      .orderBy(desc(chatSessions.createdAt))
      .limit(limit);

    const imageData = await db
      .select()
      .from(imageGenerations)
      .where(eq(imageGenerations.userId, session.user.id!))
      .orderBy(desc(imageGenerations.createdAt))
      .limit(limit);

    const scrapeData = await db
      .select()
      .from(webScrapes)
      .where(eq(webScrapes.userId, session.user.id!))
      .orderBy(desc(webScrapes.createdAt))
      .limit(limit);

    const activities = [
      ...chatData.map((c) => ({
        type: "chat",
        title: c.title || "Chat Session",
        description: `with ${c.model}`,
        timestamp: c.createdAt,
      })),
      ...imageData.map((i) => ({
        type: "image",
        title: "Image Generation",
        description: i.prompt.substring(0, 50) + (i.prompt.length > 50 ? "..." : ""),
        timestamp: i.createdAt,
      })),
      ...scrapeData.map((s) => ({
        type: "web_scrape",
        title: "Web Scrape",
        description: new URL(s.url).hostname,
        timestamp: s.createdAt,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return activities.slice(0, limit);
  } catch (error) {
    console.error("Error fetching recent activities:", error);
    throw new Error("Failed to fetch activities");
  }
}
