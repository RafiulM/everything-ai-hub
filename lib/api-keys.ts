'use server';

import { db } from '@/db';
import { userApiKeys } from '@/db/schema/ai';
import { auth } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/encryption';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Validation schemas
const createApiKeySchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'firecrawl', 'stability']),
  keyName: z.string().min(1, 'Key name is required'),
  apiKey: z.string().min(1, 'API key is required'),
});

const updateApiKeySchema = z.object({
  id: z.string().uuid(),
  keyName: z.string().min(1, 'Key name is optional').optional(),
  apiKey: z.string().min(1, 'API key is optional').optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

/**
 * Get all API keys for the current user
 */
export async function getUserApiKeys() {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(),
    });

    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const apiKeys = await db
      .select({
        id: userApiKeys.id,
        provider: userApiKeys.provider,
        keyName: userApiKeys.keyName,
        isActive: userApiKeys.isActive,
        createdAt: userApiKeys.createdAt,
        updatedAt: userApiKeys.updatedAt,
      })
      .from(userApiKeys)
      .where(eq(userApiKeys.userId, session.user.id));

    return {
      success: true,
      data: apiKeys,
    };
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch API keys',
    };
  }
}

/**
 * Create a new API key for the user
 */
export async function createApiKey(data: z.infer<typeof createApiKeySchema>) {
  try {
    // Validate input
    const validatedData = createApiKeySchema.parse(data);

    const session = await auth.api.getSession({
      headers: new Headers(),
    });

    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    // Check if user already has an active key for this provider
    const existingKey = await db
      .select()
      .from(userApiKeys)
      .where(
        and(
          eq(userApiKeys.userId, session.user.id),
          eq(userApiKeys.provider, validatedData.provider),
          eq(userApiKeys.isActive, 'true')
        )
      )
      .limit(1);

    if (existingKey.length > 0) {
      throw new Error(`You already have an active ${validatedData.provider} API key`);
    }

    // Encrypt the API key
    const encryptedKey = encrypt(validatedData.apiKey);

    // Create the API key record
    const [newApiKey] = await db
      .insert(userApiKeys)
      .values({
        userId: session.user.id,
        provider: validatedData.provider,
        encryptedKey,
        keyName: validatedData.keyName,
        isActive: 'true',
      })
      .returning({
        id: userApiKeys.id,
        provider: userApiKeys.provider,
        keyName: userApiKeys.keyName,
        isActive: userApiKeys.isActive,
        createdAt: userApiKeys.createdAt,
        updatedAt: userApiKeys.updatedAt,
      });

    return {
      success: true,
      data: newApiKey,
    };
  } catch (error) {
    console.error('Error creating API key:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create API key',
    };
  }
}

/**
 * Update an existing API key
 */
export async function updateApiKey(data: z.infer<typeof updateApiKeySchema>) {
  try {
    // Validate input
    const validatedData = updateApiKeySchema.parse(data);

    const session = await auth.api.getSession({
      headers: new Headers(),
    });

    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    // Build update object
    const updateData: any = {};
    
    if (validatedData.keyName !== undefined) {
      updateData.keyName = validatedData.keyName;
    }
    
    if (validatedData.apiKey !== undefined) {
      updateData.encryptedKey = encrypt(validatedData.apiKey);
    }
    
    if (validatedData.isActive !== undefined) {
      updateData.isActive = validatedData.isActive;
    }
    
    updateData.updatedAt = new Date();

    // Update the API key
    const [updatedApiKey] = await db
      .update(userApiKeys)
      .set(updateData)
      .where(
        and(
          eq(userApiKeys.id, validatedData.id),
          eq(userApiKeys.userId, session.user.id)
        )
      )
      .returning({
        id: userApiKeys.id,
        provider: userApiKeys.provider,
        keyName: userApiKeys.keyName,
        isActive: userApiKeys.isActive,
        createdAt: userApiKeys.createdAt,
        updatedAt: userApiKeys.updatedAt,
      });

    if (!updatedApiKey) {
      throw new Error('API key not found or you do not have permission to update it');
    }

    return {
      success: true,
      data: updatedApiKey,
    };
  } catch (error) {
    console.error('Error updating API key:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update API key',
    };
  }
}

/**
 * Delete an API key
 */
export async function deleteApiKey(id: string) {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(),
    });

    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    // Delete the API key
    const deletedApiKey = await db
      .delete(userApiKeys)
      .where(
        and(
          eq(userApiKeys.id, id),
          eq(userApiKeys.userId, session.user.id)
        )
      )
      .returning({
        id: userApiKeys.id,
        provider: userApiKeys.provider,
        keyName: userApiKeys.keyName,
      });

    if (deletedApiKey.length === 0) {
      throw new Error('API key not found or you do not have permission to delete it');
    }

    return {
      success: true,
      data: deletedApiKey[0],
    };
  } catch (error) {
    console.error('Error deleting API key:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete API key',
    };
  }
}

/**
 * Get decrypted API key for a specific provider (for internal use)
 */
export async function getApiKeyForProvider(provider: string): Promise<string | null> {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(),
    });

    if (!session?.user?.id) {
      return null;
    }

    // Get the user's active API key for this provider
    const [apiKeyRecord] = await db
      .select({
        encryptedKey: userApiKeys.encryptedKey,
      })
      .from(userApiKeys)
      .where(
        and(
          eq(userApiKeys.userId, session.user.id),
          eq(userApiKeys.provider, provider),
          eq(userApiKeys.isActive, 'true')
        )
      )
      .limit(1);

    if (!apiKeyRecord) {
      return null;
    }

    // Decrypt the API key
    const decryptedKey = decrypt(apiKeyRecord.encryptedKey);
    
    return decryptedKey;
  } catch (error) {
    console.error('Error retrieving API key:', error);
    return null;
  }
}


