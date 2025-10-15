import { z } from "zod";
import { db } from "@/db";
import { userApiKeys } from "@/db/schema/ai-services";
import { auth } from "@/lib/auth";
import { encryptApiKey, decryptApiKey, validateApiKeyFormat } from "@/lib/encryption";
import { eq, and } from "drizzle-orm";

const AddApiKeySchema = z.object({
    provider: z.enum(["openai", "anthropic", "google", "cohere", "mistral", "firecrawl"]),
    apiKey: z.string().min(1, "API key is required"),
    keyName: z.string().min(1, "Key name is required"),
});

const UpdateApiKeySchema = z.object({
    id: z.string(),
    provider: z.enum(["openai", "anthropic", "google", "cohere", "mistral", "firecrawl"]),
    apiKey: z.string().min(1, "API key is required"),
    keyName: z.string().min(1, "Key name is required"),
    isActive: z.boolean().default(true),
});

export async function getUserApiKeys() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const keys = await db
        .select()
        .from(userApiKeys)
        .where(eq(userApiKeys.userId, session.user.id));

    return keys.map(key => ({
        ...key,
        encryptedApiKey: "***" // Never send encrypted keys to client
    }));
}

export async function addApiKey(data: {
    provider: string;
    apiKey: string;
    keyName: string;
}) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const validatedData = AddApiKeySchema.parse(data);

    if (!validateApiKeyFormat(validatedData.apiKey, validatedData.provider)) {
        throw new Error("Invalid API key format for " + validatedData.provider);
    }

    const encryptedKey = encryptApiKey(validatedData.apiKey);

    const result = await db.insert(userApiKeys).values({
        userId: session.user.id,
        provider: validatedData.provider,
        encryptedApiKey: encryptedKey,
        keyName: validatedData.keyName,
        isActive: true,
    }).returning();

    return { success: true, keyId: result[0].id };
}

export async function updateApiKey(data: {
    id: string;
    provider: string;
    apiKey: string;
    keyName: string;
    isActive?: boolean;
}) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const validatedData = UpdateApiKeySchema.parse(data);

    if (!validateApiKeyFormat(validatedData.apiKey, validatedData.provider)) {
        throw new Error("Invalid API key format for " + validatedData.provider);
    }

    const encryptedKey = encryptApiKey(validatedData.apiKey);

    const result = await db
        .update(userApiKeys)
        .set({
            provider: validatedData.provider,
            encryptedApiKey: encryptedKey,
            keyName: validatedData.keyName,
            isActive: validatedData.isActive ?? true,
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(userApiKeys.id, validatedData.id),
                eq(userApiKeys.userId, session.user.id)
            )
        )
        .returning();

    if (result.length === 0) {
        throw new Error("API key not found or access denied");
    }

    return { success: true };
}

export async function deleteApiKey(keyId: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const result = await db
        .delete(userApiKeys)
        .where(
            and(
                eq(userApiKeys.id, keyId),
                eq(userApiKeys.userId, session.user.id)
            )
        );

    if (result.rowCount === 0) {
        throw new Error("API key not found or access denied");
    }

    return { success: true };
}

export async function getUserApiKeyForProvider(provider: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return null;
    }

    const key = await db
        .select()
        .from(userApiKeys)
        .where(
            and(
                eq(userApiKeys.userId, session.user.id),
                eq(userApiKeys.provider, provider),
                eq(userApiKeys.isActive, true)
            )
        )
        .limit(1);

    if (key.length === 0) {
        return null;
    }

    return {
        ...key[0],
        decryptedApiKey: decryptApiKey(key[0].encryptedApiKey)
    };
}

export async function getSystemApiKey(provider: string) {
    const systemKeys = process.env;
    
    const keyMap: Record<string, string> = {
        openai: systemKeys.OPENAI_API_KEY || "",
        anthropic: systemKeys.ANTHROPIC_API_KEY || "",
        google: systemKeys.GOOGLE_AI_API_KEY || "",
        cohere: systemKeys.COHERE_API_KEY || "",
        mistral: systemKeys.MISTRAL_API_KEY || "",
        firecrawl: systemKeys.FIRECRAWL_API_KEY || "",
    };

    return keyMap[provider] || null;
}