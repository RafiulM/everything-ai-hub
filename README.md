# Everything AI Hub

A modern, full‑stack Next.js starter tailored for building an "Everything AI" super app. It ships with authentication, database, a polished dashboard, and starter routes for AI chat, image generation, and web scraping — all wired for rapid iteration.

<p align="left">
  <a href="https://nextjs.org"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs" /></a>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" /></a>
  <a href="https://tailwindcss.com/"><img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white" /></a>
  <a href="https://ui.shadcn.com/"><img alt="shadcn/ui" src="https://img.shields.io/badge/shadcn%2Fui-New_York-111827" /></a>
  <a href="https://orm.drizzle.team/"><img alt="Drizzle ORM" src="https://img.shields.io/badge/Drizzle_ORM-PostgreSQL-3b82f6" /></a>
  <a href="https://better-auth.com/"><img alt="Better Auth" src="https://img.shields.io/badge/Auth-Better_Auth-10b981" /></a>
  <a href="https://sdk.vercel.ai/"><img alt="Vercel AI SDK" src="https://img.shields.io/badge/Vercel_AI_SDK-Streaming-000000?logo=vercel" /></a>
  <img alt="Status" src="https://img.shields.io/badge/Status-Active-success" />
</p>

## Table of Contents
- Overview
- Features
- Tech Stack
- Quick Start
- Configuration
- Project Structure
- Development Scripts
- Docker
- Deployment
- Documentation
- Contributing
- License

## Overview
Everything AI Hub is a batteries‑included template for AI‑powered apps. It provides secure auth, a PostgreSQL database via Drizzle, a responsive dashboard, and starter API routes/pages for:
- Chat (`/dashboard/chat`)
- Image generation (`/dashboard/image-generation`)
- Web scraper (`/dashboard/web-scraper`)
- Analytics landing (`/dashboard`)

Use it as a foundation to integrate providers through the Vercel AI SDK and extend analytics to track usage per user and model.

## Features
- Authentication with Better Auth (email/password)
- PostgreSQL + Drizzle ORM (type‑safe)
- 40+ shadcn/ui components, dark mode
- App Router, Server/Client Components, Turbopack
- Ready routes for chat, image, scraping APIs
- Dockerized Postgres with dev profile
- Production‑ready Dockerfile and compose

## Tech Stack
- Framework: Next.js 15 (App Router)
- Language: TypeScript
- UI: Tailwind CSS v4, shadcn/ui (New York), Lucide
- Auth: Better Auth
- Database: PostgreSQL + Drizzle ORM
- AI: Vercel AI SDK, OpenAI/Anthropic/Google providers (adapters installed)

## Quick Start
1) Clone and install
```bash
git clone <your-repository-url>
cd everything-ai-hub
npm install
```

2) Copy env file
```bash
cp .env.example .env
```

3) Start database (Docker)
```bash
npm run db:up
```

4) Push schema
```bash
npm run db:push
```

5) Run the app (dev on port 3091)
```bash
npm run dev
```
Open http://localhost:3091

Note: `.env.example` uses `http://localhost:3000` for Better Auth URLs. If you keep dev at `3091`, update `BETTER_AUTH_URL` and `NEXT_PUBLIC_BETTER_AUTH_URL` accordingly.

## Configuration
Environment variables (see `.env.example` for defaults):
```env
# Database (Docker defaults)
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/postgres
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Authentication
BETTER_AUTH_SECRET=your_secret_key_here
BETTER_AUTH_URL=http://localhost:3091
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3091
```

## Project Structure
```
app/                    # App Router pages
  dashboard/            # Authenticated dashboard sections
    chat/               # Chat UI
    image-generation/   # Image generation UI
    web-scraper/        # Web scraping UI
components/             # Reusable components (incl. shadcn/ui)
db/                     # Drizzle ORM and schema
docker/                 # Docker & Postgres setup
lib/                    # Auth + utilities
public/                 # Static assets
```

## Development Scripts
Application
- `npm run dev`         Start dev server on 3091
- `npm run build`       Build for production
- `npm start`           Start production server
- `npm run lint`        ESLint

Database
- `npm run db:up`       Start Postgres (Docker)
- `npm run db:down`     Stop Postgres
- `npm run db:dev`      Start dev Postgres (port 5433)
- `npm run db:dev-down` Stop dev Postgres
- `npm run db:push`     Push schema
- `npm run db:generate` Generate migrations
- `npm run db:studio`   Open Drizzle Studio
- `npm run db:reset`    Drop and recreate

Docker
- `npm run docker:build` Build image
- `npm run docker:up`    Up app + db
- `npm run docker:down`  Down stack
- `npm run docker:logs`  Follow logs

## Docker
Quick start:
```bash
npm run docker:up
npm run docker:logs
npm run docker:down
```
Profiles:
```bash
docker compose --profile dev up postgres-dev -d
# or
npm run db:dev
```

## Deployment
- Docker Compose on a VPS
- Container registry (AWS/GCP/Azure)
- Vercel + external Postgres (set envs, run `npm run db:push`)

Production envs:
```env
DATABASE_URL=postgresql://user:password@host:5432/database
BETTER_AUTH_SECRET=generate-a-strong-secret
BETTER_AUTH_URL=https://yourdomain.com
NEXT_PUBLIC_BETTER_AUTH_URL=https://yourdomain.com
NODE_ENV=production
```

## Documentation
Additional docs are in `documentation/`:
- `documentation/tech_stack_document.md`
- `documentation/backend_structure_document.md`
- `documentation/frontend_guidelines_document.md`
- `documentation/app_flow_document.md`
- `documentation/app_flowchart.md`
- `documentation/security_guideline_document.md`
- `documentation/project_requirements_document.md`

## Contributing
We welcome contributions! See `CONTRIBUTING.md` for guidelines, branch naming, commit messages, and PR process.

## License
No license specified yet. Please contact the maintainers before reuse.
