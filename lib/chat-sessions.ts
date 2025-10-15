import { db } from "@/db";
import { chatSessions, chatMessages } from "@/db/schema/ai-services";
import { auth } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function getChatSessions() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const sessions = await db
        .select()
        .from(chatSessions)
        .where(eq(chatSessions.userId, session.user.id))
        .orderBy(desc(chatSessions.updatedAt));

    return sessions;
}

export async function getChatSession(sessionId: string) {
    const userSession = await auth.api.getSession({
        headers: await headers(),
    });

    if (!userSession?.user?.id) {
        throw new Error("Unauthorized");
    }

    const session = await db
        .select()
        .from(chatSessions)
        .where(
            eq(chatSessions.id, sessionId)
        )
        .limit(1);

    if (session.length === 0) {
        throw new Error("Session not found");
    }

    return session[0];
}

export async function getChatMessages(sessionId: string) {
    const userSession = await auth.api.getSession({
        headers: await headers(),
    });

    if (!userSession?.user?.id) {
        throw new Error("Unauthorized");
    }

    const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, sessionId))
        .orderBy(chatMessages.createdAt);

    return messages;
}

export async function createChatSession(data: {
    title: string;
    model: string;
    provider: string;
    systemPrompt?: string;
}) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const result = await db.insert(chatSessions).values({
        userId: session.user.id,
        title: data.title,
        model: data.model,
        provider: data.provider as any,
        systemPrompt: data.systemPrompt || null,
    }).returning();

    return result[0];
}

export async function updateChatSession(sessionId: string, data: {
    title?: string;
    systemPrompt?: string;
    isActive?: boolean;
}) {
    const userSession = await auth.api.getSession({
        headers: await headers(),
    });

    if (!userSession?.user?.id) {
        throw new Error("Unauthorized");
    }

    const result = await db
        .update(chatSessions)
        .set({
            ...data,
            updatedAt: new Date(),
        })
        .where(
            eq(chatSessions.id, sessionId)
        )
        .returning();

    if (result.length === 0) {
        throw new Error("Session not found");
    }

    return result[0];
}

export async function deleteChatSession(sessionId: string) {
    const userSession = await auth.api.getSession({
        headers: await headers(),
    });

    if (!userSession?.user?.id) {
        throw new Error("Unauthorized");
    }

    await db
        .delete(chatSessions)
        .where(
            eq(chatSessions.id, sessionId)
        );

    return { success: true };
}