"use server";

import { db } from "@/db";
import { imageGenerations, webScrapes, usageAnalytics } from "@/db/schema/ai";
import { getSession } from "@/lib/auth";

export async function logImageGeneration(
  prompt: string,
  provider: string,
  model: string,
  imageUrl: string,
  size: string,
  style: string | null,
  costUsd: number | null
) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  try {
    await db.insert(imageGenerations).values({
      userId: session.user.id!,
      prompt,
      provider,
      model,
      imageUrl,
      size,
      style,
      costUsd: costUsd ? costUsd.toString() : null,
    });

    await db.insert(usageAnalytics).values({
      userId: session.user.id!,
      serviceType: "image",
      provider,
      model,
      costUsd: costUsd ? costUsd.toString() : null,
    });

    return { success: true };
  } catch (error) {
    console.error("Error logging image generation:", error);
    throw new Error("Failed to log image generation");
  }
}

export async function logWebScrape(
  url: string,
  provider: string,
  format: string,
  content: string,
  metadata: any,
  costUsd: number | null
) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  try {
    await db.insert(webScrapes).values({
      userId: session.user.id!,
      url,
      provider,
      format,
      content,
      metadata,
      costUsd: costUsd ? costUsd.toString() : null,
    });

    await db.insert(usageAnalytics).values({
      userId: session.user.id!,
      serviceType: "web_scrape",
      provider,
      costUsd: costUsd ? costUsd.toString() : null,
    });

    return { success: true };
  } catch (error) {
    console.error("Error logging web scrape:", error);
    throw new Error("Failed to log web scrape");
  }
}
