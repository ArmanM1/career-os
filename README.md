# Career OS

Career OS is a web-first, proactive career progression system. It maintains a living, inspectable understanding of the user's goals, recruiting season, thoughts, feelings, energy, completed work, applications, relationships, experiences, and next steps so the user can apply to more opportunities with stronger resumes, projects, events, mentors, and referral paths.

The primary loop is:

`Understand → Discover → Prioritize → Prepare → Connect → Execute → Track → Reflect → Adapt`

The responsive Next.js UI is the complete end-user interface. Supabase owns authenticated canonical state. A paired Windows worker runs the user's authenticated Codex installation, deterministic monitors, dedicated browser profile, artifact sync, and LaTeX compilation through a revocable gateway. The worker never receives database service credentials.

## Product boundaries

- Draft messages, mentor updates, referral requests, and application answers; never send them.
- Prepare and fill approved application forms; never press final submit.
- Generate verified-fact LaTeX resume variants without approval.
- Generate role-specific project specifications; do not automatically build projects.
- Read configured authenticated sources after one-time enablement; never bypass CAPTCHA, MFA, access controls, or account restrictions.
- Keep Gmail, Calendar, and GitHub connectors read-only.

See [Product specification](docs/PRODUCT_SPEC.md), [implementation status](docs/ROADMAP.md), and [architecture](docs/ARCHITECTURE.md).

## Local development

Requirements: Node 24.13.1, Docker Desktop, Supabase CLI, and (for the paired worker) Codex CLI, Chrome, and MiKTeX/`latexmk`.

```bash
npm ci
npm run supabase:start
npm run supabase:reset
npm run dev
```

Run the worker after pairing it through `/settings/worker`:

```bash
npm run worker
```

Release checks:

```bash
npm run typecheck
npm run lint
npm test
npm run supabase:types
npx supabase test db
npm run test:e2e
npm run build
```

Environment variables are documented in `.env.example`. Root `.env.local` is loaded for monorepo local development and remains untracked.
