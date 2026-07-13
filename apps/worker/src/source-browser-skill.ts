import {
  browserSourceSkillDefinitionSchema,
  renderBrowserSourceSkill,
  validateBrowserSourceSkillMarkdown,
  type BrowserSourceSkillDefinition,
} from "@career-os/core";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

export async function materializeBrowserSourceSkill(
  input: BrowserSourceSkillDefinition,
  workspaceRoot: string,
) {
  const definition = browserSourceSkillDefinitionSchema.parse(input);
  const sourceRoot = resolve(workspaceRoot, definition.sourceMonitorId);
  const skillRoot = resolve(sourceRoot, definition.name);
  const relativeSkillRoot = relative(sourceRoot, skillRoot);
  if (relativeSkillRoot.startsWith("..") || isAbsolute(relativeSkillRoot))
    throw new Error("Generated source skill escaped its source workspace.");
  const skillPath = resolve(skillRoot, "SKILL.md");
  const markdown = renderBrowserSourceSkill(definition);
  const issues = validateBrowserSourceSkillMarkdown(markdown, definition);
  if (issues.length) throw new Error(`Generated source skill is invalid: ${issues.join("; ")}`);
  await mkdir(skillRoot, { recursive: true });
  const existing = await readFile(skillPath, "utf8").catch(() => null);
  if (existing !== markdown) await writeFile(skillPath, markdown, "utf8");
  return {
    cwd: sourceRoot,
    skillPath,
    checksum: createHash("sha256").update(markdown).digest("hex"),
    allowedOrigins: definition.allowedDomains.flatMap((domain) => [
      `https://${domain}`,
      `https://*.${domain}`,
    ]),
  };
}
