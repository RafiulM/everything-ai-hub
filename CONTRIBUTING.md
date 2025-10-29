# Contributing to Everything AI Hub

Thanks for your interest in contributing! This guide covers standards, workflow, and tips to help you make effective contributions.

## Table of Contents
- Code of Conduct
- Ways to Contribute
- Development Setup
- Branching Strategy
- Commit Message Convention
- Pull Request Process
- Coding Standards
- Testing & Quality
- Issue Reporting
- Security

## Code of Conduct
We follow the Contributor Covenant. By participating, you agree to uphold it:
https://www.contributor-covenant.org/version/2/1/code_of_conduct/

## Ways to Contribute
- Tackle an open issue (good first issues welcome)
- Improve docs (`README.md`, this file, `documentation/`)
- Enhance developer experience (scripts, lint rules)
- Add features or bug fixes (discuss in an issue first when scope is large)

## Development Setup
1) Fork and clone your fork
```bash
git clone <your-fork-url>
cd everything-ai-hub
npm install
cp .env.example .env
npm run db:up && npm run db:push
npm run dev
```
2) Open http://localhost:3091

## Branching Strategy
- Base branch: `main`
- Create feature branches from `main`:
  - `feature/<short-context>--<ticket-or-hash>`
  - Examples: `feature/ai-chat-streaming--1234`, `fix/image-route-error--abc9`

## Commit Message Convention
Use Conventional Commits for clarity and automation:
```
<type>(optional scope): <short summary>

[optional body]
[optional footer]
```
Common types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `perf`, `build`.
Examples:
- `feat(chat): stream assistant tokens via Vercel AI SDK`
- `fix(db): correct drizzle config port for dev profile`
- `docs: add Docker quick start to README`

## Pull Request Process
- Keep PRs focused and small; link the related issue
- Update docs and types where applicable
- Ensure `npm run lint` passes
- Provide a clear summary: problem, approach, and screenshots/GIFs when UI is affected
- PR title should follow Conventional Commits when possible
- At least one approval is required before merge

## Coding Standards
- TypeScript: strict, explicit types where helpful
- React/Next.js: prefer Server Components where possible; use Client Components for interactivity
- Tailwind CSS: use utility classes; prefer existing shadcn/ui patterns
- Files/dirs: follow existing structure; keep changes minimal and targeted
- Secrets: never commit secrets; use `.env`

## Testing & Quality
- Lint: `npm run lint`
- Runtime checks: run the app locally and verify affected flows
- Database: use Docker Postgres for local dev (`npm run db:up`)
- Add tests if a module already has tests; otherwise document manual verification steps in the PR

## Issue Reporting
- Search existing issues first
- Provide a clear description, steps to reproduce, and expected vs actual behavior
- Include environment details (OS, Node version, branch/commit)

## Security
- Report vulnerabilities privately to the maintainers
- Do not open public issues for sensitive disclosures

## Links
- Project overview and setup: `README.md`
- Architecture and guidelines: `documentation/`
