# Build Everything AI web app with analytics

## Metadata

**Version:** 1.0

**Generated At:** Oct 15, 2025, 11:08 PM

## Task Summary

### Estimated Scope

This is a large feature epic involving significant backend and frontend development. It can be broken down into: 1. Database schema extension for user API keys, usage logs, and chat history. 2. Backend API development with new routes for chat, image generation, and web scraping. 3. Frontend development of three distinct user-facing modules for each AI service. 4. Enhancement of the existing dashboard to fetch and visualize analytics data.

### Enriched Description

Develop a multi-functional AI platform named 'Everything AI' by extending the existing Next.js application. The platform will integrate several AI services: a multi-model chat interface, an image generation tool, and a web scraping feature using Firecrawl. The implementation must utilize the Vercel AI SDK for AI-related functionalities. Key features include allowing users to securely store and use their own API keys or a system-provided key, customize system prompts for chat models, and view detailed usage analytics on a dedicated dashboard.

### Original Description

I wanna build an AI super app Called Everything AI. It would be a web app where users can have access to all things AI such as Image Generation, AI chats with all models using their own API keys or a provided one from the app and ability to change system prompt, web scraping with firecrawl.

It will have an analytics page dashboard showing the user's usage on different models and services.

Use the existing tech stack and use ai-sdk from Vercel for the AI functions.

### Complexity Assessment

high

## Repository Analysis

### Entry Points

1. app/layout.tsx (Root layout)
2. app/page.tsx (Public landing page)
3. app/dashboard/page.tsx (Main authenticated user view)
4. app/api/ (Backend API endpoints)

### Key Components

1. Next.js App Router for file-based routing and layouts.
2. shadcn/ui component library for building the user interface.
3. Drizzle ORM for database interaction with PostgreSQL.
4. Better Auth for user authentication and session management, located at `app/api/auth/`.

### Technology Stack

1. Next.js
2. React
3. TypeScript
4. Tailwind CSS
5. Drizzle ORM
6. PostgreSQL
7. Vercel AI SDK (to be added)
8. Firecrawl SDK (to be added)

### Structure Overview

The repository follows a standard Next.js App Router structure. The `app/` directory contains all routes and pages, with `app/api/` designated for server-side API logic. The `components/` directory houses reusable UI components, primarily from shadcn/ui. This structure is well-suited for modularly adding new features as new route groups within `app/dashboard/` and corresponding API endpoints in `app/api/`.

### Architecture Patterns

1. Full-stack Monorepo
2. Server Components and Client Components (Next.js App Router paradigm)
3. API Routes for backend logic
4. Component-Based UI

## Contextual Requirements

### Dependencies

1. ai (Vercel AI SDK)
2. openai
3. langchain (if needed for complex chains)
4. A client library for Firecrawl API.
5. Database dependency on Drizzle ORM for schema migrations and queries.
6. UI dependency on existing shadcn/ui components.

### Related Functionality

The new AI features will be built upon the existing user authentication system ('Better Auth') and integrated into the authenticated user dashboard at `/dashboard`. The analytics feature will directly extend the purpose of the current dashboard page, transforming it from a static page to a dynamic data visualization hub.

### Testing Considerations

A multi-layered testing strategy is required. Mock external services (OpenAI, Firecrawl, etc.) for unit and integration tests to ensure reliability and control costs. Implement unit tests for utility functions (e.g., API key encryption). Write integration tests for the new API routes to verify logic and database interactions. Employ end-to-end tests (using Playwright or Cypress) to validate complete user flows, such as a user logging in, submitting a chat prompt, and receiving a streamed response.

### Deployment Considerations

All external API keys and sensitive credentials must be managed via environment variables. The database schema will require a migration, which must be executed as part of the deployment process. The application is well-suited for deployment on serverless platforms like Vercel, which offer native support for Next.js, API routes, and environment variable management.

## Implementation Guidance

### Best Practices

1. Use environment variables for all secrets and application-level API keys.
2. Leverage the streaming capabilities of the Vercel AI SDK for chat features to provide immediate feedback to the user.
3. Encrypt all sensitive user data, particularly API keys, before storing it in the database.
4. Use Zod for strict validation of API request payloads and environment variables.
5. Develop the features in a modular way, keeping feature-specific logic and components isolated to facilitate maintenance and testing.

### Suggested Approach

1. **Database Schema:** Use Drizzle ORM to define and migrate new tables for `user_api_keys` (with encrypted values), `ai_usage_analytics`, and `chat_history`. 2. **Backend APIs:** Create new API routes under `app/api/`, such as `app/api/chat/route.ts`, `app/api/image/route.ts`, and `app/api/scrape/route.ts`. These routes will handle user authentication, fetch the appropriate API key, call the Vercel AI SDK or Firecrawl, and log the transaction to the analytics table. 3. **Frontend Modules:** Create new pages within the dashboard, like `app/dashboard/chat/page.tsx`. Develop feature-specific components (e.g., `components/chat-panel.tsx`) using shadcn/ui components. 4. **Dashboard Analytics:** Modify `app/dashboard/page.tsx` to fetch aggregated data from the `ai_usage_analytics` table and visualize it using the existing `chart.tsx` component.

### Key Files To Modify

1. drizzle/schema.ts (or equivalent for DB schema)
2. app/dashboard/layout.tsx (to add navigation links to new tools)
3. app/dashboard/page.tsx (to implement analytics UI)
4. components/ui/sidebar.tsx (to update navigation)
5. **New Files**:
6. app/api/chat/route.ts
7. app/api/image/route.ts
8. app/api/scrape/route.ts
9. app/dashboard/chat/page.tsx
10. app/dashboard/image-gen/page.tsx
11. app/dashboard/settings/keys/page.tsx (for API key management)

### Potential Challenges

1. **API Key Security:** Ensuring user-provided API keys are encrypted at rest in the database and securely handled in transit and memory is critical.
2. **Cost and Rate Limiting:** Implementing robust server-side rate limiting to prevent abuse and control costs associated with third-party AI services.
3. **Real-time UI:** Managing frontend state for streaming chat responses requires careful state management to ensure a smooth user experience.
4. **Third-Party API Reliability:** Building resilient error handling and feedback mechanisms to manage failures or latency from external AI APIs.

