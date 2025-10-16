"use server";

import { db } from "@/db";
import { userApiKeys } from "@/db/schema/ai";
import { encryptApiKey, decryptApiKey } from "@/lib/encryption";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const apiKeySchema = z.object({
  provider: z.enum(["openai", "anthropic", "google", "stability-ai"]),
  key: z.string().min(1, "API key is required"),
  keyName: z.string().optional(),
});

export async function addApiKey(input: z.infer<typeof apiKeySchema>) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const validated = apiKeySchema.parse(input);

  try {
    const encrypted = encryptApiKey(validated.key);

    await db.insert(userApiKeys).values({
      userId: session.user.id!,
      provider: validated.provider,
      encryptedKey: encrypted,
      keyName: validated.keyName || `${validated.provider}-key`,
    });

    return { success: true };
  } catch (error) {
    console.error("Error adding API key:", error);
    throw new Error("Failed to add API key");
  }
}

export async function updateApiKey(
  id: string,
  input: z.infer<typeof apiKeySchema>
) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const validated = apiKeySchema.parse(input);

  try {
    const encrypted = encryptApiKey(validated.key);

    const result = await db
      .update(userApiKeys)
      .set({
        encryptedKey: encrypted,
        keyName: validated.keyName,
        provider: validated.provider,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userApiKeys.id, id),
          eq(userApiKeys.userId, session.user.id!)
        )
      )
      .returning();

    if (result.length === 0) {
      throw new Error("API key not found or unauthorized");
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating API key:", error);
    throw new Error("Failed to update API key");
  }
}

export async function deleteApiKey(id: string) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  try {
    const result = await db
      .delete(userApiKeys)
      .where(
        and(
          eq(userApiKeys.id, id),
          eq(userApiKeys.userId, session.user.id!)
        )
      )
      .returning();

    if (result.length === 0) {
      throw new Error("API key not found or unauthorized");
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting API key:", error);
    throw new Error("Failed to delete API key");
  }
}

export async function getApiKeys() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  try {
    const keys = await db
      .select()
      .from(userApiKeys)
      .where(eq(userApiKeys.userId, session.user.id!));

    // Don't return encrypted keys, just metadata
    return keys.map((key) => ({
      id: key.id,
      provider: key.provider,
      keyName: key.keyName,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    }));
  } catch (error) {
    console.error("Error fetching API keys:", error);
    throw new Error("Failed to fetch API keys");
  }
}

export async function getApiKeyForProvider(provider: string) {
  const session = await getSession();
  if (!session?.user) {
    return null;
  }

  try {
    const key = await db
      .select()
      .from(userApiKeys)
      .where(
        and(
          eq(userApiKeys.userId, session.user.id!),
          eq(userApiKeys.provider, provider)
        )
      )
      .limit(1);

    if (key.length === 0) {
      return null;
    }

    return decryptApiKey(key[0].encryptedKey);
  } catch (error) {
    console.error("Error retrieving API key:", error);
    return null;
  }
}
