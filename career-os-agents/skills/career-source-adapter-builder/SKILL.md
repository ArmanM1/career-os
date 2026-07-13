---
name: career-source-adapter-builder
description: Create and repair Career OS source adapters. Use for repeatable RSS, GitHub list, ATS, JSON, HTML-selector, and browser workflows, or to define a source-specific browser-reader skill when deterministic extraction is not possible.
---

# Career Source Adapter Builder

Prefer deterministic adapters in this order: public API, RSS/Atom, ATS adapter,
JSON, GitHub Markdown/CSV, HTML selectors, configured browser workflow.

- Store source monitor ID, adapter definition, parser version, checksum, domain
  allowlist, fixture, and test result.
- For every deterministic proposal, call `career.sources.test_adapter` with the
  declarative definition. Treat returned signals/evidence as the first fixture;
  do not claim the adapter passed when the safe test tool failed.
- Emit normalized raw signals; Opportunity Intelligence owns ranking.
- Never generate an adapter that can invoke a shell or access files outside the adapter workspace.
- If deterministic extraction cannot work, emit a `browser_skill` adapter whose
  definition satisfies the Career OS browser-source skill schema. Define one
  concise agent purpose, allowed domains/start URLs, read procedure, relevance,
  extraction fields, dedupe keys, evidence behavior, cadence, and auth needs.
- A `browser_skill` definition must contain exactly the operational fields:
  `schemaVersion: 1`, kebab-case `name`, a 20-300 character `description`,
  `sourceMonitorId`, `sourceUrl`, `allowedDomains`, `startUrls`, `provider`,
  `requiresAuth`, `cadenceMinutes`, `contentScope`, `navigationSteps`,
  `relevanceRules`, `extractionFields`, `dedupeKeys`, `captureScreenshots`, and
  `rawEvidenceRetentionDays`. Every start URL must remain inside the domain
  allowlist.
- For Instagram stories, read only the configured account's current stories,
  keep career-relevant role/event/program frames, dedupe by account plus story
  identifier or content hash plus company/role/link, and use a 120-minute cadence.
- Do not generate executable scraper code as the fallback. The worker renders
  and validates the structured definition into a source-specific `SKILL.md`.
- Mark changed authentication as `auth_required`; never bypass CAPTCHA, MFA, or access controls.
- Propose repairs with evidence after parser failures.

Do not perform external writes or final application actions.
