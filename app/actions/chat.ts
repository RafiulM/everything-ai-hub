"use server";

import { db } from "@/db";
import { chatSessions, chatMessages, usageAnalytics } from "@/db/schema/ai";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function createChatSession(model: string, systemPrompt?: string, title?: string) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  try {
    const result = await db
      .insert(chatSessions)
      .values({
        userId: session.user.id!,
        model,
        systemPrompt: systemPrompt || undefined,
        title: title || `Chat with ${model}`,
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Error creating chat session:", error);
    throw new Error("Failed to create chat session");
  }
}

export async function saveChatMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  tokensUsed?: number
) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  try {
    // Verify the session belongs to the user
    const chatSession = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (chatSession.length === 0 || chatSession[0].userId !== session.user.id) {
      throw new Error("Unauthorized");
    }

    const result = await db
      .insert(chatMessages)
      .values({
        sessionId,
        role,
        content,
        tokensUsed,
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Error saving chat message:", error);
    throw new Error("Failed to save message");
  }
}

export async function logUsageAnalytics(
  serviceType: "chat" | "image" | "web_scrape",
  provider: string,
  model: string | null,
  tokensUsed: number | null,
  costUsd: number | null
) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  try {
    await db.insert(usageAnalytics).values({
      userId: session.user.id!,
      serviceType,
      provider,
      model,
      tokensUsed,
      costUsd: costUsd ? costUsd.toString() : null,
    });
  } catch (error) {
    console.error("Error logging usage analytics:", error);
    // Don't throw - analytics logging shouldn't break the main flow
  }
}

export async function getChatSession(sessionId: string) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  try {
    const result = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (result.length === 0 || result[0].userId !== session.user.id) {
      throw new Error("Unauthorized");
    }

    return result[0];
  } catch (error) {
    console.error("Error getting chat session:", error);
    throw new Error("Failed to get chat session");
  }
}

export async function getChatMessages(sessionId: string) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  try {
    // Verify the session belongs to the user
    const chatSession = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (chatSession.length === 0 || chatSession[0].userId !== session.user.id) {
      throw new Error("Unauthorized");
    }

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId));

    return messages;
  } catch (error) {
    console.error("Error getting chat messages:", error);
    throw new Error("Failed to get messages");
  }
}
