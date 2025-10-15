-- AI Services Schema Migration
-- Add tables for user API keys, chat functionality, and usage analytics

-- AI Provider enum
CREATE TYPE "ai_provider" AS ENUM('openai', 'anthropic', 'google', 'cohere', 'mistral', 'firecrawl');

-- Message type enum
CREATE TYPE "message_type" AS ENUM('user', 'assistant', 'system');

-- Service type enum  
CREATE TYPE "service_type" AS ENUM('chat', 'image_generation', 'web_scraping');

-- User API Keys table
CREATE TABLE "user_api_keys" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "provider" "ai_provider" NOT NULL,
    "encrypted_api_key" TEXT NOT NULL,
    "key_name" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Chat Sessions table
CREATE TABLE "chat_sessions" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "provider" "ai_provider" NOT NULL,
    "system_prompt" TEXT,
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Chat Messages table
CREATE TABLE "chat_messages" (
    "id" TEXT PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "message_type" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSON,
    "token_count" INTEGER,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Usage Analytics table
CREATE TABLE "usage_analytics" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "service_type" "service_type" NOT NULL,
    "provider" "ai_provider" NOT NULL,
    "model" TEXT,
    "token_count" INTEGER,
    "cost" DECIMAL(10, 6),
    "metadata" JSON,
    "session_id" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Image Generations table
CREATE TABLE "image_generations" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "negative_prompt" TEXT,
    "provider" "ai_provider" NOT NULL,
    "model" TEXT NOT NULL,
    "image_url" TEXT,
    "image_storage_path" TEXT,
    "parameters" JSON,
    "cost" DECIMAL(10, 6),
    "status" TEXT DEFAULT 'pending' NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Web Scrapes table
CREATE TABLE "web_scrapes" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "provider" "ai_provider" DEFAULT 'firecrawl' NOT NULL,
    "scraped_data" JSON,
    "markdown" TEXT,
    "metadata" JSON,
    "cost" DECIMAL(10, 6),
    "status" TEXT DEFAULT 'pending' NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Foreign key constraints
ALTER TABLE "user_api_keys" ADD CONSTRAINT "user_api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "usage_analytics" ADD CONSTRAINT "usage_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "usage_analytics" ADD CONSTRAINT "usage_analytics_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "image_generations" ADD CONSTRAINT "image_generations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "web_scrapes" ADD CONSTRAINT "web_scrapes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Indexes for performance
CREATE INDEX "user_api_keys_user_id_idx" ON "user_api_keys"("user_id");
CREATE INDEX "user_api_keys_provider_idx" ON "user_api_keys"("provider");
CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions"("user_id");
CREATE INDEX "chat_messages_session_id_idx" ON "chat_messages"("session_id");
CREATE INDEX "chat_messages_user_id_idx" ON "chat_messages"("user_id");
CREATE INDEX "usage_analytics_user_id_idx" ON "usage_analytics"("user_id");
CREATE INDEX "usage_analytics_created_at_idx" ON "usage_analytics"("created_at");
CREATE INDEX "usage_analytics_service_type_idx" ON "usage_analytics"("service_type");
CREATE INDEX "image_generations_user_id_idx" ON "image_generations"("user_id");
CREATE INDEX "web_scrapes_user_id_idx" ON "web_scrapes"("user_id");