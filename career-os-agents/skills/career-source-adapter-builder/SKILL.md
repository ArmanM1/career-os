---
name: career-source-adapter-builder
description: Create and repair declarative Career OS source adapters. Use for repeatable RSS, GitHub list, ATS, JSON, HTML-selector, browser-workflow, and isolated custom source parsing.
---

# Career Source Adapter Builder

Prefer deterministic declarative adapters in this order: public API, RSS/Atom, ATS adapter, JSON, GitHub Markdown/CSV, HTML selectors, configured browser workflow.

- Store adapter definition, parser version, checksum, domain allowlist, fixture, and test result.
- Emit normalized raw signals; Opportunity Intelligence owns ranking.
- Never generate an adapter that can invoke a shell or access files outside the adapter workspace.
- Custom executable code requires approval and must run in an isolated process with no shell, a source-domain network allowlist, and time/output limits.
- Mark changed authentication as `auth_required`; never bypass CAPTCHA, MFA, or access controls.
- Propose repairs with evidence after parser failures.

Do not perform external writes or final application actions.
