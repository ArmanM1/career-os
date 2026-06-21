# Supabase Setup

## Target Project

Dashboard:

```text
https://supabase.com/dashboard/project/dlfryjaqabwdrsymuzgj
```

Project ref:

```text
dlfryjaqabwdrsymuzgj
```

Expected API URL:

```text
https://dlfryjaqabwdrsymuzgj.supabase.co
```

## Local CLI Status

The repo has been initialized with:

```powershell
npx supabase init
```

This created:

```text
supabase/config.toml
```

The Supabase CLI has been authenticated locally using a classic personal access token named:

```text
career-os-cli
```

The token expires:

```text
2026-07-21
```

The token is not committed to the repo. It is stored in the local Supabase CLI credential store.

CLI verification:

```text
Project dlfryjaqabwdrsymuzgj is visible, linked from C:\tmp\career-os-supabase-link, and ACTIVE_HEALTHY.
```

Linking from the OneDrive workspace was attempted with:

```powershell
npx supabase link --project-ref dlfryjaqabwdrsymuzgj
```

Observed blocker:

```text
AlreadyExists: FileSystem.makeDirectory (...\supabase\.temp)
```

This appears to be a Supabase CLI + OneDrive reparse-point issue. Linking succeeds from a normal local path:

```powershell
$tmp = "C:\tmp\career-os-supabase-link"
npx supabase link --project-ref dlfryjaqabwdrsymuzgj --workdir $tmp
```

For Supabase CLI operations that need linked project state, use the clean `C:\tmp\career-os-supabase-link` workdir until the project moves out of OneDrive or the CLI issue is avoided.

Committed repo files:

```text
supabase/config.toml
supabase/seed.sql
supabase/migrations/.gitkeep
```

Ignored local state:

```text
supabase/.temp/
```

## Required For Future CLI Work

The CLI is already authenticated locally. If auth is lost, re-run one of:

```powershell
npx supabase login
```

or:

```powershell
$env:SUPABASE_ACCESS_TOKEN="..."
npx supabase link --project-ref dlfryjaqabwdrsymuzgj
```

The CLI may also ask for the project database password during linking or migration commands.

Do not commit:

- Supabase access token
- database password
- service role key
- Gmail/Google OAuth credentials
- GitHub tokens

## Environment Variables

The web app will eventually need:

```text
NEXT_PUBLIC_SUPABASE_URL=https://dlfryjaqabwdrsymuzgj.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<server/local-worker only>
```

The service role key must only be used by trusted backend/local worker code. It should never be exposed to the browser.

See [.env.example](../.env.example) for placeholders.

## First Database Work

After linking, the first migrations should create:

- core object tables
- task/application/goal tables
- source monitor tables
- application status check tables
- resume library metadata tables
- agent job/run/thread tables
- approval request table
- audit log table
- connected account table
- academic context and constraints tables
