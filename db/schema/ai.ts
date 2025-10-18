import { pgTable, text, timestamp, integer, decimal, json, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

// User API Keys table for storing encrypted API keys
export const userApiKeys = pgTable("user_api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // openai, anthropic, firecrawl, stability
  encryptedKey: text("encrypted_key").notNull(), // encrypted API key
  keyName: text("key_name").notNull(), // user-friendly name
  isActive: text("is_active").default("true").notNull(), // boolean stored as text
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Chat Sessions table for tracking conversations
export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(), // session title
  model: text("model").notNull(), // AI model used
  systemPrompt: text("system_prompt"), // custom system prompt
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Chat Messages table for individual messages
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user, assistant, system
  content: text("content").notNull(), // message content
  tokenCount: integer("token_count").default(0), // token count for this message
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Usage Analytics table for tracking AI service usage
export const usageAnalytics = pgTable("usage_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  serviceType: text("service_type").notNull(), // chat, image, scraping
  provider: text("provider").notNull(), // openai, anthropic, firecrawl, stability
  model: text("model"), // specific model used
  tokensUsed: integer("tokens_used").default(0), // total tokens used
  cost: decimal("cost", { precision: 10, scale: 4 }).default("0.0000"), // cost in USD
  metadata: json("metadata"), // additional metadata as JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Image Generations table for tracking image generation requests
export const imageGenerations = pgTable("image_generations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(), // image generation prompt
  provider: text("provider").notNull(), // openai, stability
  model: text("model").notNull(), // dall-e-3, stable-diffusion-xl, etc.
  size: text("size").notNull(), // image dimensions
  quality: text("quality").default("standard"), // standard, hd
  style: text("style").default("vivid"), // vivid, natural
  imageUrl: text("image_url"), // URL to generated image
  imageStoragePath: text("image_storage_path"), // local storage path
  cost: decimal("cost", { precision: 10, scale: 4 }).default("0.0000"), // cost in USD
  status: text("status").default("pending").notNull(), // pending, completed, failed
  metadata: json("metadata"), // additional metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Web Scrapes table for tracking web scraping requests
export const webScrapes = pgTable("web_scrapes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  url: text("url").notNull(), // target URL
  provider: text("provider").notNull(), // firecrawl
  format: text("format").default("markdown").notNull(), // markdown, html, raw
  content: text("content"), // scraped content
  metadata: json("metadata"), // scraped metadata (title, description, images, etc.)
  cost: decimal("cost", { precision: 10, scale: 4 }).default("0.0000"), // cost in USD
  status: text("status").default("pending").notNull(), // pending, completed, failed
  errorMessage: text("error_message"), // error message if failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Create indexes for better query performance
export const userApiKeysIndexes = {
  userProviderIdx: "CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_provider ON user_api_keys(user_id, provider)",
  userActiveIdx: "CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_active ON user_api_keys(user_id, is_active)",
};

export const chatSessionsIndexes = {
  userCreatedAtIdx: "CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_created ON chat_sessions(user_id, created_at)",
  userModelIdx: "CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_model ON chat_sessions(user_id, model)",
};

export const chatMessagesIndexes = {
  sessionCreatedAtIdx: "CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages(session_id, created_at)",
};

export const usageAnalyticsIndexes = {
  userCreatedAtIdx: "CREATE INDEX IF NOT EXISTS idx_usage_analytics_user_created ON usage_analytics(user_id, created_at)",
  userProviderIdx: "CREATE INDEX IF NOT EXISTS idx_usage_analytics_user_provider ON usage_analytics(user_id, provider)",
  serviceTypeIdx: "CREATE INDEX IF NOT EXISTS idx_usage_analytics_service_type ON usage_analytics(service_type, created_at)",
};

export const imageGenerationsIndexes = {
  userCreatedAtIdx: "CREATE INDEX IF NOT EXISTS idx_image_generations_user_created ON image_generations(user_id, created_at)",
  statusIdx: "CREATE INDEX IF NOT EXISTS idx_image_generations_status ON image_generations(status)",
};

export const webScrapesIndexes = {
  userCreatedAtIdx: "CREATE INDEX IF NOT EXISTS idx_web_scrapes_user_created ON web_scrapes(user_id, created_at)",
  statusIdx: "CREATE INDEX IF NOT EXISTS idx_web_scrapes_status ON web_scrapes(status)",
};
