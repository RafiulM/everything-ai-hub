# Project Requirements Document

# Project Requirements Document (PRD)

## 1. Project Overview

The "Everything AI" Super App aims to be a one-stop hub where authenticated users can access, experiment with, and track their usage of multiple AI services (text chat, image generation, web scraping, etc.) through a clean, unified web interface. Built on a robust full-stack template called `everything-ai-hub`, the app provides secure user authentication, an interactive analytics dashboard, and a polished UI out of the box. Users will be able to connect their own API keys, send requests to various AI providers, and visualize their activity in real time.

By providing a standardized foundation—powered by Next.js, TypeScript, Drizzle ORM, and the Vercel AI SDK—the project drastically reduces setup time for new AI features. Key objectives include 1) ensuring user data and API keys remain secure, 2) offering a responsive, real-time UI for AI interactions, and 3) delivering an analytics dashboard that tracks usage metrics (tokens used, models accessed, timestamps) for each user. Success will be measured by secure login flows, reliable AI calls with proper error handling, and a dashboard that accurately reflects user activity.

---

## 2. In-Scope vs. Out-of-Scope

### In-Scope (Version 1)
- User registration, login, logout, and session management via Better Auth.  
- Dashboard area under `/dashboard` showing real-time usage charts and tables using Drizzle ORM + PostgreSQL.  
- AI Chat feature at `/chat` using the Vercel AI SDK’s `useChat` hook with streaming responses.  
- Image Generation feature at `/image-generation` calling an external model API.  
- Web Scraping feature at `/web-scraper` calling the Firecrawl API.  
- UI built with Next.js (App Router), React, TypeScript, Tailwind CSS, and `shadcn/ui` components.  
- Secure storage of user-provided API keys (encrypted at rest) and usage logging in `usage_analytics` table.  
- Containerized development environment (Docker + docker-compose) with a PostgreSQL service.  
- Basic error handling and user notifications (Toaster) for AI request failures or form validation errors.  

### Out-of-Scope (Later Phases)
- Mobile app or React Native implementation.  
- Billing or subscription management.  
- Role-based access control beyond basic authenticated vs. anonymous.  
- Multi-tenant architecture (support for organizational accounts).  
- Advanced analytics like predictive insights or anomaly detection.  
- Offline access or progressive web app capabilities.  

---

## 3. User Flow

A new user visits the landing page and clicks "Sign Up." They provide their email and password, complete the registration form, and land on the main dashboard. The dashboard sidebar shows links: Chat, Image Generation, Web Scraper, Settings, and Analytics. The main panel welcomes them with an overview chart of zero usage and prompts them to add an API key under Settings.

After adding their third-party AI API key, the user navigates to the Chat page. They type a message in the chat interface and hit "Send." Behind the scenes, a Next.js Server Action retrieves their encrypted key, sends the chat history to the AI model via Vercel AI SDK, logs token usage to the database, and streams the AI’s reply back to the client. The user can then click "Analytics" to see updated charts and tables reflecting their recent chat session.

---

## 4. Core Features

- **User Authentication**: Sign up, log in/out, session management using Better Auth with secure cookies and encrypted storage.  
- **API Key Manager**: Secure form for users to store, view, and delete their own AI service API keys (encrypted at rest).  
- **AI Chat Module**: Interactive chat interface using Vercel AI SDK’s `useChat` hook, streaming responses, configurable system prompts.  
- **Image Generation Module**: Page and server action to send image requests to a chosen AI model, display generated images.  
- **Web Scraper Module**: Integration with Firecrawl API, server action to scrape websites and return structured data to the UI.  
- **Analytics Dashboard**: Charts (`ChartAreaInteractive`), tables (`DataTable`), and summary cards showing usage metrics (tokens, model counts, timestamps) per user.  
- **Database Schema**: Drizzle ORM definitions for `users`, `user_api_keys`, `chat_sessions`, `chat_messages`, `usage_analytics`.  
- **Error Handling & Notifications**: Global Toaster for user-friendly alerts on failures or validation errors.  
- **Dockerized Environment**: `docker-compose.yml` for local Postgres, environment variable management.  

---

## 5. Tech Stack & Tools

- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, react-hook-form + Zod for validated forms.  
- **Backend**: Next.js API Routes & Server Actions, Vercel AI SDK for `useChat` and `useCompletion` hooks.  
- **Database**: PostgreSQL with Drizzle ORM (schema-as-code, type-safe).  
- **Authentication**: Better Auth for session handling, encrypted credentials.  
- **Containerization**: Docker & Docker Compose for local development environment.  
- **Deployment**: Vercel platform for hosting Next.js app and Serverless functions.  
- **AI Providers**: OpenAI, Anthropic, Firecrawl (configurable via user-provided API keys).  

---

## 6. Non-Functional Requirements

- **Performance**: API calls to AI services should respond within 1–3 seconds; analytics dashboard queries should complete under 500ms for up to 10k records.  
- **Security**: All API keys encrypted at rest (e.g., using AES), HTTPS enforced site-wide, secrets managed via environment variables.  
- **Compliance**: GDPR-ready data handling (users can delete their account and data), CORS configured to allow only authorized origins.  
- **Usability**: UI must follow WCAG 2.1 AA guidelines for accessibility (keyboard navigation, color contrast).  
- **Scalability**: Design database tables and queries to handle 100k+ records; Vercel Serverless functions should scale on demand.  

---

## 7. Constraints & Assumptions

- The Vercel AI SDK and target AI provider APIs (OpenAI, Anthropic) are available and accessible from serverless environments.  
- Users will supply valid API keys for their chosen AI services; the app does not provide its own credits.  
- Local development assumes Docker Desktop is installed; production assumes deployment on Vercel.  
- PostgreSQL version >=14 and Node.js version >=18 are required.  

---

## 8. Known Issues & Potential Pitfalls

- **API Rate Limits**: Hitting rate limits on user-provided keys can cause failed requests. Mitigation: catch errors and show clear retry or upgrade suggestions.  
- **Streaming Interruptions**: Network hiccups can drop streaming responses from Vercel AI SDK. Mitigation: implement automatic reconnect logic or partial retry.  
- **Database Migration Conflicts**: Drizzle ORM schema changes may conflict if multiple branches alter the same tables. Mitigation: enforce a migration review process and use `drizzle-kit` correctly.  
- **Client-Side Key Exposure**: Accidentally calling AI APIs from the client could leak keys. Mitigation: strictly separate Server Actions (secure) from Client Components (UI only).  
- **Large Analytics Queries**: Dashboard queries over large datasets may slow down. Mitigation: add pagination, caching, or pre-aggregated materialized views for heavy tables.

---

This PRD lays out the precise scope, flows, features, and technical considerations needed for the "Everything AI" Super App. With these guidelines, an AI-driven development process can generate detailed technical docs, component blueprints, and implementation code without ambiguity.

---
**Document Details**
- **Project ID**: b329b808-85a5-4e2f-8b32-1e5190543994
- **Document ID**: 833c1c1a-95b8-4157-9ccf-b4d0d8488f0b
- **Type**: custom
- **Custom Type**: project_requirements_document
- **Status**: completed
- **Generated On**: 2025-10-15T23:05:35.960Z
- **Last Updated**: N/A
