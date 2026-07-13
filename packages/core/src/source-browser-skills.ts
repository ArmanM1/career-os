import { z } from "zod";

const hostnameSchema = z.string().min(3).max(253).regex(/^[a-z0-9.-]+$/i, "Expected a hostname");

export const browserSourceSkillDefinitionSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  name: z.string().min(3).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().min(20).max(300),
  sourceMonitorId: z.uuid(),
  sourceUrl: z.url(),
  allowedDomains: z.array(hostnameSchema).min(1).max(10),
  startUrls: z.array(z.url()).min(1).max(10),
  provider: z.string().min(2).max(60),
  requiresAuth: z.boolean().default(false),
  cadenceMinutes: z.number().int().min(15).max(43_200),
  contentScope: z.string().min(2).max(200),
  navigationSteps: z.array(z.string().min(3).max(500)).min(1).max(30),
  relevanceRules: z.array(z.string().min(3).max(500)).min(1).max(30),
  extractionFields: z.array(z.string().min(1).max(80)).min(1).max(40),
  dedupeKeys: z.array(z.string().min(1).max(80)).min(1).max(20),
  captureScreenshots: z.boolean().default(true),
  rawEvidenceRetentionDays: z.number().int().min(1).max(30).default(30),
}).superRefine((definition, context) => {
  const allowed = new Set(definition.allowedDomains.map((domain) => domain.toLowerCase()));
  for (const value of [definition.sourceUrl, ...definition.startUrls]) {
    const hostname = new URL(value).hostname.toLowerCase();
    const permitted = [...allowed].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
    if (!permitted) context.addIssue({ code: "custom", message: `${hostname} is outside the source domain allowlist` });
  }
});

export type BrowserSourceSkillDefinition = z.infer<typeof browserSourceSkillDefinitionSchema>;

function yamlString(value: string) { return JSON.stringify(value); }
function numbered(values: string[]) { return values.map((value, index) => `${index + 1}. ${value}`).join("\n"); }
function bullets(values: string[]) { return values.map((value) => `- ${value}`).join("\n"); }

export function renderBrowserSourceSkill(input: BrowserSourceSkillDefinition) {
  const definition = browserSourceSkillDefinitionSchema.parse(input);
  return `---
name: ${definition.name}
description: ${yamlString(definition.description)}
---

# ${definition.description}

Use browser control only to read this configured source. First attempt the task
with the existing dedicated Career OS browser session. Do not ask the user to
intervene when the authenticated session already works.

## Scope

- Source: ${definition.sourceUrl}
- Provider: ${definition.provider}
- Content: ${definition.contentScope}
- Allowed domains: ${definition.allowedDomains.join(", ")}
- Cadence: every ${definition.cadenceMinutes} minutes

Never navigate outside the allowed domains. Never use shell commands or access
files. Never post, send, follow, like, comment, register, purchase, upload, fill
forms, or submit anything.

## Read procedure

${numbered(definition.navigationSteps)}

Stop after the configured source has been inspected once. Do not continue into
unrelated recommendations, feeds, profiles, or search results.

## Relevance

Keep only content matching these rules:

${bullets(definition.relevanceRules)}

Extract these fields when visible:

${bullets(definition.extractionFields)}

Deduplicate with:

${bullets(definition.dedupeKeys)}

## Evidence and status

${definition.captureScreenshots ? "Capture screenshots only for relevant source evidence." : "Do not capture screenshots unless required to establish source evidence."}
Raw screenshots expire after ${definition.rawEvidenceRetentionDays} days. Create
an evidence record for every returned signal. A source with no current relevant
content is a healthy \`no_change\`, not a failure.

If a usable signed-in session is unavailable, first try safe navigation through
the existing browser profile. If login, consent, CAPTCHA, MFA, or school SSO still
requires the user, stop without bypassing it. Return disposition
\`auth_required\` with an exact \`nextUserAction\` describing the provider and
page the user must open. For layout changes or missing content, return
\`needs_user_input\` only after the allowed read paths have been attempted.

Return only normalized Career OS signals, evidence, source status, and a concise
summary. Do not perform any external write action.
`;
}

export function validateBrowserSourceSkillMarkdown(markdown: string, input: BrowserSourceSkillDefinition) {
  const definition = browserSourceSkillDefinitionSchema.parse(input);
  const issues: string[] = [];
  const lines = markdown.split(/\r?\n/);
  const closing = lines.indexOf("---", 1);
  const frontmatter = closing > 0 ? lines.slice(1, closing) : [];
  const keys = frontmatter.map((line) => line.match(/^([a-z_]+):/)?.[1]).filter(Boolean);
  if (lines[0] !== "---" || closing < 1) issues.push("Missing YAML frontmatter");
  if (keys.join(",") !== "name,description") issues.push("Frontmatter must contain only name and description");
  if (!markdown.includes(`name: ${definition.name}`)) issues.push("Skill name does not match its definition");
  if (!definition.allowedDomains.every((domain) => markdown.includes(domain))) issues.push("Skill omits a domain allowlist entry");
  if (!markdown.includes("Never use shell commands")) issues.push("Skill does not prohibit shell access");
  if (!markdown.includes("auth_required")) issues.push("Skill does not define authentication handoff behavior");
  if (lines.length > 500) issues.push("Skill exceeds 500 lines");
  return issues;
}
