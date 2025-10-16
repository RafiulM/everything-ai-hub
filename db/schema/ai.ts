import {
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

// User API Keys for different providers
export const userApiKeys = pgTable("user_api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // "openai", "anthropic", "google", "stability-ai"
  encryptedKey: text("encrypted_key").notNull(),
  keyName: text("key_name"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// Chat Sessions
export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title"),
  model: text("model").notNull(), // "gpt-4", "claude-3", etc.
  systemPrompt: text("system_prompt"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// Chat Messages
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "user", "assistant"
  content: text("content").notNull(),
  tokensUsed: integer("tokens_used"),
  metadata: jsonb("metadata"), // Additional data like stop_reason, etc.
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// Usage Analytics
export const usageAnalytics = pgTable("usage_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  serviceType: text("service_type").notNull(), // "chat", "image", "web_scrape"
  provider: text("provider").notNull(),
  model: text("model"),
  tokensUsed: integer("tokens_used"),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
  metadata: jsonb("metadata"), // Additional data like image size, resolution, etc.
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// Image Generations
export const imageGenerations = pgTable("image_generations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  provider: text("provider").notNull(), // "openai", "stability-ai"
  model: text("model"),
  imageUrl: text("image_url"),
  size: text("size"), // "1024x1024", "512x512", etc.
  style: text("style"),
  tokensUsed: integer("tokens_used"),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// Web Scrapes
export const webScrapes = pgTable("web_scrapes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  provider: text("provider").notNull(), // "firecrawl"
  format: text("format"), // "markdown", "html", "raw"
  content: text("content"),
  metadata: jsonb("metadata"), // Links, images, structured data, etc.
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});
