import { 
    pgTable, 
    text, 
    timestamp, 
    integer, 
    decimal, 
    boolean, 
    json,
    pgEnum,
    primaryKey
} from "drizzle-orm/pg-core";

export const aiProviderEnum = pgEnum("ai_provider", [
    "openai",
    "anthropic", 
    "google",
    "cohere",
    "mistral",
    "firecrawl"
]);

export const messageTypeEnum = pgEnum("message_type", [
    "user",
    "assistant",
    "system"
]);

export const serviceTypeEnum = pgEnum("service_type", [
    "chat",
    "image_generation",
    "web_scraping"
]);

export const userApiKeys = pgTable("user_api_keys", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
        .notNull()
        .references(() => auth.user.id, { onDelete: "cascade" }),
    provider: aiProviderEnum("provider").notNull(),
    encryptedApiKey: text("encrypted_api_key").notNull(),
    keyName: text("key_name").notNull(),
    isActive: boolean("is_active").$defaultFn(() => true).notNull(),
    createdAt: timestamp("created_at")
        .$defaultFn(() => new Date())
        .notNull(),
    updatedAt: timestamp("updated_at")
        .$defaultFn(() => new Date())
        .notNull(),
});

export const chatSessions = pgTable("chat_sessions", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
        .notNull()
        .references(() => auth.user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    model: text("model").notNull(),
    provider: aiProviderEnum("provider").notNull(),
    systemPrompt: text("system_prompt"),
    isActive: boolean("is_active").$defaultFn(() => true).notNull(),
    createdAt: timestamp("created_at")
        .$defaultFn(() => new Date())
        .notNull(),
    updatedAt: timestamp("updated_at")
        .$defaultFn(() => new Date())
        .notNull(),
});

export const chatMessages = pgTable("chat_messages", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    sessionId: text("session_id")
        .notNull()
        .references(() => chatSessions.id, { onDelete: "cascade" }),
    userId: text("user_id")
        .notNull()
        .references(() => auth.user.id, { onDelete: "cascade" }),
    type: messageTypeEnum("type").notNull(),
    content: text("content").notNull(),
    metadata: json("metadata"),
    tokenCount: integer("token_count"),
    createdAt: timestamp("created_at")
        .$defaultFn(() => new Date())
        .notNull(),
});

export const usageAnalytics = pgTable("usage_analytics", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
        .notNull()
        .references(() => auth.user.id, { onDelete: "cascade" }),
    serviceType: serviceTypeEnum("service_type").notNull(),
    provider: aiProviderEnum("provider").notNull(),
    model: text("model"),
    tokenCount: integer("token_count"),
    cost: decimal("cost", { precision: 10, scale: 6 }),
    metadata: json("metadata"),
    sessionId: text("session_id").references(() => chatSessions.id),
    createdAt: timestamp("created_at")
        .$defaultFn(() => new Date())
        .notNull(),
});

export const imageGenerations = pgTable("image_generations", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
        .notNull()
        .references(() => auth.user.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    negativePrompt: text("negative_prompt"),
    provider: aiProviderEnum("provider").notNull(),
    model: text("model").notNull(),
    imageUrl: text("image_url"),
    imageStoragePath: text("image_storage_path"),
    parameters: json("parameters"),
    cost: decimal("cost", { precision: 10, scale: 6 }),
    status: text("status").$defaultFn(() => "pending").notNull(),
    createdAt: timestamp("created_at")
        .$defaultFn(() => new Date())
        .notNull(),
    updatedAt: timestamp("updated_at")
        .$defaultFn(() => new Date())
        .notNull(),
});

export const webScrapes = pgTable("web_scrapes", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
        .notNull()
        .references(() => auth.user.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    provider: aiProviderEnum("provider").notNull().default("firecrawl"),
    scrapedData: json("scraped_data"),
    markdown: text("markdown"),
    metadata: json("metadata"),
    cost: decimal("cost", { precision: 10, scale: 6 }),
    status: text("status").$defaultFn(() => "pending").notNull(),
    createdAt: timestamp("created_at")
        .$defaultFn(() => new Date())
        .notNull(),
    updatedAt: timestamp("updated_at")
        .$defaultFn(() => new Date())
        .notNull(),
});

import { auth } from "./auth";