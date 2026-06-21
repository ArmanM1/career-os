import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { promisify } from "node:util";
import type { WorkerSupabase } from "./supabase";

const execFileAsync = promisify(execFile);

type Row = Record<string, unknown>;

export async function runDueApplicationStatusChecks(supabase: WorkerSupabase) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("application_status_checks")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_for", now)
    .limit(10);

  if (error || !data?.length) return { processed: 0 };

  for (const check of data) {
    await supabase
      .from("application_status_checks")
      .update({
        status: "completed",
        result_status: "no_change",
        completed_at: now,
        updated_at: now,
        metadata: {
          ...record(check, "metadata"),
          note: "V1 placeholder status check recorded no_change. Email/calendar/browser connectors wire in next.",
        },
      })
      .eq("id", check.id);
  }

  return { processed: data.length };
}

export async function runDueSourceMonitors(supabase: WorkerSupabase) {
  const { data, error } = await supabase
    .from("source_monitors")
    .select("*")
    .eq("status", "active")
    .limit(10);

  if (error || !data?.length) return { processed: 0 };

  let processed = 0;
  for (const monitor of data as Row[]) {
    if (!isMonitorDue(monitor)) continue;
    processed += 1;

    if (text(monitor, "source_type") === "github_repo" && text(monitor, "fetch_strategy") === "git_pull") {
      await runGitHubRepoMonitor(supabase, monitor);
    } else {
      await recordUnsupportedMonitorRun(supabase, monitor);
    }
  }

  return { processed };
}

async function runGitHubRepoMonitor(supabase: WorkerSupabase, monitor: Row) {
  const now = new Date().toISOString();
  const run = await insertRow(supabase, "source_runs", {
    user_id: requiredText(monitor, "user_id"),
    source_monitor_id: requiredText(monitor, "id"),
    title: `Run ${requiredText(monitor, "title")}`,
    status: "needs_review",
    started_at: now,
    metadata: {
      monitorType: "github_repo",
      fetchStrategy: "git_pull",
    },
    created_by: "system",
    updated_by: "system",
  });

  try {
    const localPath = await cloneOrPullGitHubRepo(monitor);
    const evidenceId = await createRunEvidence(supabase, monitor, run, localPath);
    const parsedSignals = await parseRepositorySignals(localPath, monitor, requiredText(run, "id"), evidenceId);
    const insertedSignalIds: string[] = [];

    for (const signal of parsedSignals) {
      const signalId = await insertSignalIfNew(supabase, signal);
      if (signalId) insertedSignalIds.push(signalId);
    }

    if (insertedSignalIds.length > 0) {
      await enqueueOpportunityRanking(supabase, monitor, requiredText(run, "id"), insertedSignalIds);
      await supabase
        .from("signals")
        .update({ status: "queued_for_ranking", updated_by: "system" })
        .in("id", insertedSignalIds);
    }

    const completedAt = new Date().toISOString();
    await supabase
      .from("source_runs")
      .update({
        status: insertedSignalIds.length > 0 ? "success" : "no_change",
        completed_at: completedAt,
        new_signal_count: insertedSignalIds.length,
        new_opportunity_count: 0,
        metadata: {
          monitorType: "github_repo",
          fetchStrategy: "git_pull",
          parsedSignalCount: parsedSignals.length,
          insertedSignalCount: insertedSignalIds.length,
          rankingQueued: insertedSignalIds.length > 0,
        },
        updated_by: "system",
      })
      .eq("id", requiredText(run, "id"));

    await supabase
      .from("source_monitors")
      .update({
        last_run_at: completedAt,
        local_path: localPath,
        last_seen_hash: hashText(insertedSignalIds.join("|")),
        updated_by: "system",
      })
      .eq("id", requiredText(monitor, "id"));
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    await supabase
      .from("source_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: message,
        updated_by: "system",
      })
      .eq("id", requiredText(run, "id"));
  }
}

async function recordUnsupportedMonitorRun(supabase: WorkerSupabase, monitor: Row) {
  const now = new Date().toISOString();
  await insertRow(supabase, "source_runs", {
    user_id: requiredText(monitor, "user_id"),
    source_monitor_id: requiredText(monitor, "id"),
    title: `Run ${requiredText(monitor, "title")}`,
    status: "no_change",
    started_at: now,
    completed_at: now,
    new_signal_count: 0,
    new_opportunity_count: 0,
    metadata: {
      note: "No deterministic parser exists for this source yet. Social/browser-backed sources remain agent-led.",
      sourceType: text(monitor, "source_type"),
      fetchStrategy: text(monitor, "fetch_strategy"),
    },
    created_by: "system",
    updated_by: "system",
  });
}

async function cloneOrPullGitHubRepo(monitor: Row) {
  const url = requiredText(monitor, "url");
  const monitorId = requiredText(monitor, "id");
  const explicitPath = text(monitor, "local_path");
  const localPath = explicitPath || join(repoRoot(), "monitors", "github", monitorId);

  await mkdir(localPath, { recursive: true });
  const gitDir = join(localPath, ".git");

  if (existsSync(gitDir)) {
    await execFileAsync("git", ["-C", localPath, "pull", "--ff-only"], { timeout: 120_000 });
  } else {
    const parent = resolve(localPath, "..");
    await mkdir(parent, { recursive: true });
    await execFileAsync("git", ["clone", "--depth", "1", url, localPath], { timeout: 180_000 });
  }

  return localPath;
}

async function createRunEvidence(supabase: WorkerSupabase, monitor: Row, run: Row, localPath: string) {
  const row = await insertRow(supabase, "evidence", {
    user_id: requiredText(monitor, "user_id"),
    title: `Parsed ${requiredText(monitor, "title")}`,
    status: "active",
    labels: ["source-run", "github"],
    source_type: "github_repo",
    source_url: requiredText(monitor, "url"),
    external_ref: requiredText(run, "id"),
    excerpt: "Deterministic GitHub repo monitor cloned or pulled the configured source and parsed opportunity-like links.",
    payload: {
      sourceMonitorId: requiredText(monitor, "id"),
      sourceRunId: requiredText(run, "id"),
      localPath,
    },
    created_by: "system",
    updated_by: "system",
  });

  return requiredText(row, "id");
}

async function parseRepositorySignals(localPath: string, monitor: Row, sourceRunId: string, evidenceId: string) {
  const files = await collectParseableFiles(localPath);
  const signals: Row[] = [];

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    const lines = content.split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      const urls = extractUrls(line).filter(looksLikeOpportunityUrl);
      if (urls.length === 0) continue;

      const cells = markdownCells(line);
      const title = cleanTitle(cells.length ? cells.join(" - ") : line);
      const companyName = cells[0];
      const roleTitle = cells.find((cell) => /intern|software|engineer|developer|new grad/i.test(cell));
      const location = cells.find((cell) => /remote|hybrid|onsite|united states|usa|canada|new york|san francisco|seattle|austin/i.test(cell));

      for (const url of urls) {
        const externalRef = hashText(`${requiredText(monitor, "id")}:${filePath}:${index}:${url}`);
        signals.push({
          user_id: requiredText(monitor, "user_id"),
          source_monitor_id: requiredText(monitor, "id"),
          source_run_id: sourceRunId,
          title,
          status: "new",
          labels: ["github", "job app"],
          signal_type: "internship_post",
          source_type: "github_repo",
          source_url: requiredText(monitor, "url"),
          canonical_url: url,
          external_ref: externalRef,
          company_name: companyName,
          role_title: roleTitle,
          location,
          opportunity_type: "internship",
          raw_payload: {
            filePath,
            lineNumber: index + 1,
            line,
            cells,
          },
          normalized_payload: {
            targetSeason: record(monitor, "metadata").targetSeason,
            targetRoles: record(monitor, "metadata").targetRoles ?? [],
          },
          parser_name: "github_markdown_link_parser",
          parser_confidence: "medium",
          rationale: "This row contains an application or careers link in a configured GitHub source monitor.",
          evidence_ids: [evidenceId],
          metadata: {
            sourceTitle: requiredText(monitor, "title"),
          },
          created_by: "system",
          updated_by: "system",
        });
      }
    }

    if (signals.length >= 100) break;
  }

  return signals.slice(0, 100);
}

async function collectParseableFiles(root: string) {
  const result: string[] = [];
  await walk(root, result);
  return result.slice(0, 60);
}

async function walk(directory: string, result: string[]) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(path, result);
      continue;
    }

    const extension = extname(entry.name).toLowerCase();
    if ([".md", ".markdown", ".csv", ".tsv"].includes(extension)) {
      result.push(path);
    }
  }
}

async function insertSignalIfNew(supabase: WorkerSupabase, signal: Row) {
  const canonicalUrl = text(signal, "canonical_url");
  const sourceMonitorId = requiredText(signal, "source_monitor_id");
  const externalRef = requiredText(signal, "external_ref");

  const existing = canonicalUrl
    ? await supabase
        .from("signals")
        .select("id")
        .eq("user_id", requiredText(signal, "user_id"))
        .eq("canonical_url", canonicalUrl)
        .limit(1)
    : await supabase
        .from("signals")
        .select("id")
        .eq("user_id", requiredText(signal, "user_id"))
        .eq("source_monitor_id", sourceMonitorId)
        .eq("external_ref", externalRef)
        .limit(1);

  if (existing.error) throw new Error(`signals lookup: ${existing.error.message}`);
  if (existing.data?.length) return null;

  const row = await insertRow(supabase, "signals", signal);
  return requiredText(row, "id");
}

async function enqueueOpportunityRanking(supabase: WorkerSupabase, monitor: Row, sourceRunId: string, signalIds: string[]) {
  await insertRow(supabase, "agent_jobs", {
    user_id: requiredText(monitor, "user_id"),
    agent_id: "career-opportunity-ranking",
    title: `Rank signals from ${requiredText(monitor, "title")}`,
    status: "queued",
    labels: ["opportunity-ranking", "source-monitor"],
    queue: "opportunities",
    prompt: "Rank the new raw source signals. Create opportunity recommendations and planner hints, but do not create applications or send outreach.",
    input: {
      type: "opportunity_ranking.rank_signals",
      sourceMonitorId: requiredText(monitor, "id"),
      sourceRunId,
      signalIds,
      targetSeason: record(monitor, "metadata").targetSeason,
      targetRoles: record(monitor, "metadata").targetRoles ?? [],
    },
    priority: 50,
    scheduled_for: new Date().toISOString(),
    metadata: {
      createdBy: "source_monitor",
    },
    created_by: "system",
    updated_by: "system",
  });
}

function isMonitorDue(monitor: Row) {
  const intervalMs = scheduleIntervalMs(text(monitor, "schedule", "daily"));
  if (intervalMs === null) return false;

  const lastRunAt = text(monitor, "last_run_at");
  if (!lastRunAt) return true;

  const elapsedMs = Date.now() - new Date(lastRunAt).getTime();
  return elapsedMs >= intervalMs;
}

function scheduleIntervalMs(schedule: string) {
  const normalized = schedule.toLowerCase();
  if (normalized.includes("manual")) return null;
  if (normalized.includes("hour")) {
    const match = normalized.match(/(\d+)/);
    return Number(match?.[1] ?? 1) * 60 * 60 * 1000;
  }
  if (normalized.includes("6_hours")) return 6 * 60 * 60 * 1000;
  if (normalized.includes("12_hours")) return 12 * 60 * 60 * 1000;
  if (normalized.includes("week")) return 7 * 24 * 60 * 60 * 1000;
  if (normalized.includes("day") || normalized.includes("daily")) return 24 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

function extractUrls(line: string) {
  return Array.from(line.matchAll(/https?:\/\/[^\s|)\]>"]+/g)).map((match) => match[0].replace(/[.,;]+$/, ""));
}

function looksLikeOpportunityUrl(url: string) {
  return /greenhouse|lever\.co|ashbyhq|workday|job|career|apply|intern|new-grad|newgrad/i.test(url);
}

function markdownCells(line: string) {
  if (!line.includes("|")) return [];
  return line
    .split("|")
    .map((cell) => cleanTitle(cell))
    .filter((cell) => cell.length > 0 && !/^-+$/.test(cell) && !/^:?-+:?$/.test(cell));
}

function cleanTitle(input: string) {
  return input
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_`#<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

async function insertRow(supabase: WorkerSupabase, table: string, row: Row) {
  const { data, error } = await supabase.from(table).insert(compact(row)).select("*").limit(1);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data?.[0] as Row;
}

function compact(input: Row) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function text(row: Row, key: string, fallback = "") {
  const raw = row[key];
  return typeof raw === "string" && raw.length > 0 ? raw : fallback;
}

function requiredText(row: Row | undefined, key: string, fallback = "") {
  return text(row ?? {}, key, fallback);
}

function record(row: Row, key: string) {
  const raw = row[key];
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Row;
  return {};
}

function hashText(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function repoRoot() {
  const cwd = process.cwd();
  return basename(cwd) === "worker" ? resolve(cwd, "..", "..") : cwd;
}
