# AI Development Agent Guidelines

## Project Overview
**Project:** everything-ai-hub
**** ## Enhanced Repository Summary: `everything-ai-hub` for the "Everything AI" Super App

This repository, `everything-ai-hub`, serves as a robust and modern full-stack web application starter template. It's meticulously crafted with Next.js (App Router), TypeScript, and a suite of contemporary tools, making it an ideal foundation for building the **"Everything AI" super app**. The core focus is on delivering a foundational application with essential features like user authentication, a structured dashboard, and a sleek UI, all integrated with a PostgreSQL database via Drizzle ORM. This summary has been enhanced to show how this template directly supports your goal of creating a centralized hub for AI services.

### 1. What this codebase does (purpose and functionality)

The primary purpose of `everything-ai-hub` is to drastically reduce the setup time for new web applications. For the **"Everything AI"** project, it provides a ready-to-use boilerplate that includes:

*   **Secure User Authentication**: Leverages "Better Auth" for comprehensive user management. This is the cornerstone of your app, allowing you to securely manage individual user accounts, store their API keys, track their AI service usage, and save their chat histories.
*   **Interactive Dashboard**: Offers a protected, authenticated area (`/dashboard`) that is the perfect starting point for your **analytics page**. The existing components can be adapted to visualize user-specific data on model usage, image generations, and other service consumption.
*   **Robust Database Integration**: Seamlessly integrates with PostgreSQL using Drizzle ORM. This is critical for storing all application data, including user profiles, encrypted user API keys, system prompts, chat sessions, and the granular usage data required for the analytics dashboard.
*   **Modern UI/UX**: Utilizes `shadcn/ui` and Tailwind CSS to deliver a consistent, aesthetically pleasing, and highly customizable user interface. This allows you to quickly build polished interfaces for your AI chat, image generation, and web scraping tools.
*   **Developer Experience Focus**: By pre-configuring Docker, environment variables, and essential Next.js settings, it streamlines the development and deployment workflow, letting you focus on building the core AI features.

Essentially, it's a "batteries-included" template that provides the essential user management and data persistence layers, allowing you to immediately start integrating AI functionalities using the Vercel AI SDK and other services.

### 2. Key architecture and technology choices

The project's modern, full-stack architecture is perfectly suited for building the "Everything AI" super app:

*   **Frontend**:
    *   **Next.js (App Router)**: The cornerstone for routing and rendering. You will create new routes like `/chat`, `/image-generation`, and `/web-scraping` within the authenticated dashboard area.
    *   **React & TypeScript**: Ensures a type-safe and maintainable codebase as you build complex, interactive AI interfaces.
    *   **Tailwind CSS & `shadcn/ui`**: A collection of re-usable UI components that will accelerate the development of forms for API key input, system prompt configuration, and chat interfaces.
    *   **`react-hook-form` & `Zod`**: Perfect for creating secure and validated forms for users to submit their own API keys or configure settings for AI models.
*   **Backend & AI Integration**:
    *   **Next.js API Routes & Server Actions**: The ideal place to handle server-side logic. You will use these to securely interact with various AI model APIs (OpenAI, Anthropic, etc.) and the Firecrawl service, using either the app's keys or the user's stored keys.
    *   **Vercel AI SDK**: This will be a key addition to your stack. It integrates seamlessly with Next.js Server Actions and provides powerful hooks like `useChat` and `useCompletion` to build streaming, real-time AI chat experiences with minimal effort.
    *   **PostgreSQL**: A powerful relational database for storing all your application's state, including users, chat history, and detailed usage logs for the analytics dashboard.
    *   **Drizzle ORM**: A modern, type-safe ORM that makes it easy to extend the database schema to support your features. You will define new tables for storing chat messages, API keys, and usage statistics.
    *   **Better Auth**: Manages user sessions, ensuring that only authenticated users can access the AI tools and their personal data.
*   **Infrastructure & Tooling**:
    *   **Docker**: Provides a containerized PostgreSQL database, ensuring a consistent development environment for every developer working on the project.
    *   **Vercel**: The recommended platform for deployment, offering first-class support for Next.js and the Vercel AI SDK.

### 3. Main components and how they interact

The codebase's structure provides a clear path for implementing your features:

*   **`app/(dashboard)/` Directory**: This is where you will build out the core of your application.
    *   You will create new pages like `app/(dashboard)/chat/page.tsx`, `app/(dashboard)/image/page.tsx`, and `app/(dashboard)/scraper/page.tsx`.
    *   The existing `app/(dashboard)/dashboard/page.tsx` will be transformed into your **analytics dashboard**. The components `SectionCards`, `ChartAreaInteractive`, and `DataTable` are perfect building blocks for displaying model usage statistics fetched from your database.
*   **`components/` Directory**: You will create new, feature-specific components here, such as:
    *   `components/chat/chat-interface.tsx`: A component that uses the Vercel AI SDK's `useChat` hook to manage the conversation state.
    *   `components/chat/system-prompt-form.tsx`: A form for users to customize the system prompt for their chat sessions.
    *   `components/settings/api-key-manager.tsx`: A secure form for users to add and manage their third-party API keys.
*   **`db/` Directory**: This is where you'll define your application's data structure.
    *   **`db/schema/auth.ts`**: You will extend this or create new schema files (e.g., `db/schema/ai.ts`) to define tables for `chat_messages`, `user_api_keys` (with encrypted keys), and `usage_analytics`.
*   **`lib/` Directory**: This is the ideal place for your core AI logic.
    *   You can create a new `lib/ai/` directory to house configurations for the Vercel AI SDK and functions that interact with different model providers.
    *   `lib/auth.ts` will continue to manage authentication, which is crucial for associating all AI activity with the correct user.

**New Interaction Flow for an AI Chat Feature:**
1.  A logged-in user navigates to `/chat`.
2.  The `chat-interface.tsx` component renders, using the Vercel AI SDK's `useChat` hook.
3.  The user types a message and submits it.
4.  The `useChat` hook sends the message history to a **Next.js Server Action** or API route (e.g., `app/api/chat/route.ts`).
5.  The Server Action retrieves the user's API key from the database (or uses the app's key), constructs the request with the correct model and system prompt, and calls the AI model via the Vercel AI SDK.
6.  Simultaneously, the Server Action logs the request details (user ID, model used, token count) into the `usage_analytics` table in your PostgreSQL database.
7.  The Vercel AI SDK streams the response back to the client, where the `chat-interface.tsx` component displays it in real-time.
8.  The user can then visit the `/dashboard` (analytics page) to see their updated usage reflected in the charts and tables.

### 4. Notable patterns, configurations, or design decisions

This template's design decisions directly support the development of your "Everything AI" app:

*   **Server Components & Client Components**: This distinction is critical for an AI app. You'll use **Server Actions/Components** to securely handle API keys and communicate with AI services on the server, preventing key leakage. You'll use **Client Components** for the highly interactive UIs, like the chat window, which needs to manage state and handle streaming data.
*   **Type-Safe Full-Stack Development**: As you add new database tables for usage analytics and chat history with Drizzle, TypeScript will ensure your data queries and frontend components are perfectly aligned, preventing bugs.
*   **Containerized Database**: The `docker-compose.yml` ensures that the PostgreSQL database setup is simple and reproducible, which is vital for developing and testing the data-heavy analytics features.
*   **Declarative Database Schema**: Drizzle's schema-as-code approach makes it straightforward to evolve your database as you add new features like Firecrawl integration or support for more AI models.

### 5. Overall code structure and organization

The repository's organized structure is ready to scale with your vision:

*   **`/app`**: New pages for each AI tool will be added here, keeping your routing clean and logical.
*   **`/components`**: Will house UI elements for chat, image generation, and your analytics dashboard. You can create subfolders like `/components/chat` and `/components/analytics` for better organization.
*   **`/db`**: Will contain the Drizzle schemas for all your new tables (`usage_analytics`, `user_api_keys`, etc.).
*   **`/lib`**: A new `/lib/ai` or `/lib/integrations` folder can be created to centralize all logic related to the Vercel AI SDK, Firecrawl, and other third-party services.

This structure provides clear separation of concerns, making it easy to manage the growing complexity of a super app.

### 6. Code quality observations and recommendations

This template provides a high-quality foundation. To build your app successfully, focus on these tailored recommendations:

*   **Implement Dynamic Data Fetching for Analytics**: This is your first major task. Replace the static `data.json` in the dashboard with real data. Create Server Actions that query your PostgreSQL database using Drizzle to fetch usage statistics for the logged-in user and pass that data to the chart and table components.
*   **Prioritize Security for API Keys**: When implementing the feature for users to add their own API keys, ensure they are encrypted at rest in the database. Never expose these keys on the client-side; all API calls using them must be made from the server.
*   **Robust Error Handling for AI Services**: AI APIs can fail due to rate limits, invalid input, or downtime. Implement comprehensive error handling in your Server Actions and display user-friendly notifications (e.g., using the built-in Toaster) on the frontend.
*   **Comprehensive Testing**: Write tests for your Server Actions that handle AI calls. Mock the API responses to test your usage tracking logic and error handling paths. Use end-to-end tests with Playwright or Cypress to validate critical user flows like submitting a chat message or adding an API key.

### 7. Potential areas for improvement or refactoring (Your Roadmap)

This section outlines a clear roadmap for extending the template into the "Everything AI" super app:

1.  **Extend the Database Schema**:
    *   In `/db/schema/`, define new Drizzle schemas for `user_api_keys` (with an encrypted `key` field), `chat_sessions`, `chat_messages`, and `usage_analytics` (tracking user_id, service_name, model, tokens_used, timestamp, etc.).
    *   Run `drizzle-kit push:pg` to apply these changes to your database.

2.  **Build the Core AI Features**:
    *   **AI Chat**: Create a new route at `/chat`. Build the UI using `shadcn/ui` components and the Vercel AI SDK's `useChat` hook for a streaming interface. Implement the backend Server Action to handle the logic.
    *   **Image Generation**: Create a `/image-generation` route and a Server Action to communicate with an image generation API.
    *   **Web Scraping**: Create a `/web-scraper` route and a Server Action that calls the Firecrawl API.

3.  **Implement the Analytics Dashboard**:
    *   Refactor the existing `/dashboard` page.
    *   Create Server Actions to perform aggregate queries on your `usage_analytics` table (e.g., `SUM(tokens_used) GROUP BY model`).
    *   Connect the `ChartAreaInteractive` and `DataTable` components to this dynamic data to visualize the user's activity.

4.  **Develop User Settings**:
    *   Create a `/settings` page where users can manage their profiles.
    *   Build the API Key Manager component with secure forms for adding and deleting their keys.

5.  **Refine State Management**:
    *   For the complex, stateful chat interface, consider using a lightweight state management library like Zustand or Jotai to manage client-side state (e.g., current model, system prompt, conversation history) more effectively than with `useState` alone.

By following this roadmap, you can systematically leverage the powerful foundation of `everything-ai-hub` to build a scalable, secure, and feature-rich "Everything AI" super app.

## CodeGuide CLI Usage Instructions

This project is managed using CodeGuide CLI. The AI agent should follow these guidelines when working on this project.

### Essential Commands

#### Project Setup & Initialization
```bash
# Login to CodeGuide (first time setup)
codeguide login

# Start a new project (generates title, outline, docs, tasks)
codeguide start "project description prompt"

# Initialize current directory with CLI documentation
codeguide init
```

#### Task Management
```bash
# List all tasks
codeguide task list

# List tasks by status
codeguide task list --status pending
codeguide task list --status in_progress
codeguide task list --status completed

# Start working on a task
codeguide task start <task_id>

# Update task with AI results
codeguide task update <task_id> "completion summary or AI results"

# Update task status
codeguide task update <task_id> --status completed
```

#### Documentation Generation
```bash
# Generate documentation for current project
codeguide generate

# Generate documentation with custom prompt
codeguide generate --prompt "specific documentation request"

# Generate documentation for current codebase
codeguide generate --current-codebase
```

#### Project Analysis
```bash
# Analyze current project structure
codeguide analyze

# Check API health
codeguide health
```

### Workflow Guidelines

1. **Before Starting Work:**
   - Run `codeguide task list` to understand current tasks
   - Identify appropriate task to work on
   - Use `codeguide task update <task_id> --status in_progress` to begin work

2. **During Development:**
   - Follow the task requirements and scope
   - Update progress using `codeguide task update <task_id>` when significant milestones are reached
   - Generate documentation for new features using `codeguide generate`

3. **Completing Work:**
   - Update task with completion summary: `codeguide task update <task_id> "completed work summary"`
   - Mark task as completed: `codeguide task update <task_id> --status completed`
   - Generate any necessary documentation

### AI Agent Best Practices

- **Task Focus**: Work on one task at a time as indicated by the task management system
- **Documentation**: Always generate documentation for new features and significant changes
- **Communication**: Provide clear, concise updates when marking task progress
- **Quality**: Follow existing code patterns and conventions in the project
- **Testing**: Ensure all changes are properly tested before marking tasks complete

### Project Configuration
This project includes:
- `codeguide.json`: Project configuration with ID and metadata
- `documentation/`: Generated project documentation
- `AGENTS.md`: AI agent guidelines

### Getting Help
Use `codeguide --help` or `codeguide <command> --help` for detailed command information.

---
*Generated by CodeGuide CLI on 2025-10-15T23:46:07.108Z*
