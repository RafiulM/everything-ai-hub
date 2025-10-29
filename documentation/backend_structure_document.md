# Backend Structure Document for everything-ai-hub

This document lays out the backend architecture, hosting solutions, and infrastructure components of the `everything-ai-hub` super app. It uses everyday language so anyone can understand how the backend is put together.

## 1. Backend Architecture

The backend is built around Next.js with a clear separation of server-side logic and client-side interaction.

• Next.js App Router & Server Actions
  - Routes and server logic live together under `app/` and `app/api/`.
  - Server Actions handle secure calls to AI services and database operations without exposing secrets to the browser.

• Next.js API Routes
  - Classic REST-style endpoints for chat, image generation, web scraping, and analytics.
  - Each route processes requests, interacts with the database, calls external AI APIs, and returns JSON responses.

• Better Auth for Authentication
  - Provides login, registration, session management, and secure user contexts.
  - Ensures only authenticated users can reach protected routes and API endpoints.

• Drizzle ORM
  - Defines the database schema in TypeScript for type safety.
  - Manages migrations and generates type-safe query functions.

• Vercel AI SDK
  - Integrates with Server Actions to stream chat completions and model responses directly to clients.

• Design for Scalability, Maintainability, Performance
  - Stateless server functions allow horizontal scaling on Vercel.
  - ORM-driven schema makes evolving the database straightforward.
  - Modular code structure keeps concerns separated (authentication, AI logic, data access).

## 2. Database Management

We use PostgreSQL as our relational database, along with best practices for structure and access.

• Database Technology
  - PostgreSQL (managed in production, containerized with Docker in development).
  - Drizzle ORM for schema definition, migrations, and type-safe queries.

• Data Structure & Storage
  - Core tables for users, API keys, chat sessions, chat messages, and usage analytics.
  - Encrypted fields for sensitive data (user API keys).

• Access Patterns & Practices
  - Server Actions and API routes use Drizzle’s query API to fetch or modify data.
  - Migrations managed by `drizzle-kit` ensure database evolves with code.
  - Connection pooling managed by environment variables and Next.js’s built-in pooling.

## 3. Database Schema

### Human-Readable Schema Overview

• users
  - id: unique user identifier
  - email, name, hashed password, created_at, updated_at

• user_api_keys
  - id, user_id, service_name, encrypted_key, created_at

• chat_sessions
  - id, user_id, session_name, created_at, updated_at

• chat_messages
  - id, session_id, role (user or assistant), content, timestamp

• usage_analytics
  - id, user_id, service_name, model_name, tokens_used, timestamp

### SQL Schema (PostgreSQL)

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  hashed_password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE user_api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE chat_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE usage_analytics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  model_name TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```  

## 4. API Design and Endpoints

We follow a RESTful style using Next.js API routes plus Server Actions.

• Authentication Endpoints (Better Auth)
  - POST `/api/auth/register` – create a new user.
  - POST `/api/auth/login` – return a session token.
  - GET `/api/auth/user` – fetch current user profile.
  - POST `/api/auth/logout` – end the session.

• AI Service Endpoints
  - POST `/api/chat` – send user prompt, stream back assistant messages. Logs usage.
  - POST `/api/image` – generate images via third-party API.
  - POST `/api/scrape` – run web-scraping via Firecrawl or another service.

• Analytics Endpoints
  - GET `/api/usage` – return aggregated usage metrics (e.g., tokens per model).
  - GET `/api/sessions` – list chat sessions for the user.
  - GET `/api/sessions/[id]/messages` – fetch messages in a given session.

• Key Management Endpoints
  - GET `/api/keys` – list saved API keys.
  - POST `/api/keys` – add a new API key (encrypted at rest).
  - DELETE `/api/keys/[id]` – remove an API key.

## 5. Hosting Solutions

• Vercel for Code Hosting and Serverless Functions
  - One-click deployments from GitHub.
  - Automatic scaling of Server Actions and API routes.
  - Global CDN for static assets and edge caching.

• PostgreSQL (Production)
  - Managed instance via a cloud provider (AWS RDS, Supabase, or similar).
  - Daily backups and automatic failover.

• Docker Compose (Development)
  - Local PostgreSQL container to ensure consistent environments.
  - Shared `.env` file for environment variable management.

Benefits
  - Reliability: Managed services with built-in backups and failover.
  - Scalability: Vercel auto-scales with demand. The database can be vertically or horizontally scaled.
  - Cost-effectiveness: Pay-as-you-go hosting and serverless functions keep costs aligned with usage.

## 6. Infrastructure Components

• Load Balancing & Edge Network
  - Vercel’s global edge network balances traffic and caches responses.

• Caching Mechanisms
  - Edge caching of static assets and common API responses.
  - In-memory caching (e.g., LRU) can be added to Server Actions if needed.

• Content Delivery Network (CDN)
  - All static files, images, and front-end assets served from Vercel’s CDN.

• Environment Variables
  - Managed securely in Vercel’s dashboard for production.
  - Local `.env` file for development, loaded by Next.js and Docker.

## 7. Security Measures

• Authentication & Authorization
  - All protected API routes check for a valid Better Auth session.
  - Role-based or user-based access enforced at the route level.

• Data Encryption
  - User API keys are encrypted before being saved to the database.
  - HTTPS enforced for all client-server communication.

• Secure Secrets Management
  - Environment variables stored in Vercel’s secret store.
  - No secrets checked into source control.

• Best Practices
  - Use of HTTP security headers (HSTS, CSP) via Next.js.
  - Validation and sanitization of all incoming data (using Zod schemas).
  - Rate limiting on critical API endpoints to prevent abuse.

## 8. Monitoring and Maintenance

• Performance & Health Monitoring
  - Vercel analytics track request volumes, response times, and errors.
  - Database health checks via cloud provider dashboard.

• Logging & Error Tracking
  - Console logs and error details sent to a service like Sentry or Logflare.
  - Alerts configured for error rate spikes or downtime.

• Maintenance Practices
  - Automated database migrations with `drizzle-kit` on deploy.
  - Scheduled dependency updates and security audits.
  - Regular backups of production database.

## 9. Conclusion and Overall Backend Summary

The `everything-ai-hub` backend combines Next.js Server Actions, a managed PostgreSQL database, and modern tooling to provide a solid foundation for the Everything AI super app. Key strengths:

• A clear, modular architecture that separates authentication, AI logic, and data access.  
• Type-safe database management with Drizzle ORM and code-first migrations.  
• Seamless AI integration via the Vercel AI SDK, with usage logging for analytics.  
• Production-ready hosting on Vercel with global CDN, auto-scaling, and managed database services.  
• Strong security posture with encrypted API keys, secure environment variables, and robust authentication.

This setup ensures the backend can grow with new AI features, maintain top performance, and keep user data safe.