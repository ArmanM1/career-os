import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { delimiter, isAbsolute, relative, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

export type LatexCompileResult = { pdfPath: string; sha256: string; sizeBytes: number; pageCount: number; log: string };
export type LatexEngine = { command: string; kind: "latexmk" | "pdflatex" };

export function assertResumeWorkspacePath(workspaceRoot: string, candidate: string) {
  const root = resolve(workspaceRoot);
  const absolute = isAbsolute(candidate) ? resolve(candidate) : resolve(root, candidate);
  const rel = relative(root, absolute);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("Resume compilation path is outside the Career OS workspace.");
  return absolute;
}

export async function compileLatexResume(workspaceRoot: string, texPath: string, timeoutMs = 120_000): Promise<LatexCompileResult> {
  const source = assertResumeWorkspacePath(workspaceRoot, texPath);
  if (!source.toLowerCase().endsWith(".tex")) throw new Error("Resume compilation requires a .tex source file.");
  const workingDirectory = resolve(source, "..");
  const before = new Set(await readdir(workingDirectory));
  const engine = resolveLatexEngine();
  const log = await runLatex(engine, source, workingDirectory, timeoutMs);
  const pdfPath = source.replace(/\.tex$/i, ".pdf");
  const details = await stat(pdfPath).catch(() => null);
  if (!details?.isFile() || details.size === 0) throw new Error("LaTeX completed without a non-empty PDF.");
  const bytes = await readFile(pdfPath);
  if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("LaTeX output is not a valid PDF file.");
  const pageCount = bytes.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length ?? 0;
  if (pageCount === 0) throw new Error("LaTeX output does not contain any rendered pages.");
  const after = await readdir(workingDirectory);
  const unexpected = after.filter((name) => !before.has(name) && !/\.(aux|bbl|bcf|blg|fdb_latexmk|fls|log|out|pdf|run\.xml|synctex\.gz|toc)$/i.test(name));
  if (unexpected.length) throw new Error(`LaTeX created unexpected files: ${unexpected.join(", ")}`);
  return { pdfPath, sha256: createHash("sha256").update(bytes).digest("hex"), sizeBytes: bytes.length, pageCount, log: log.slice(-20_000) };
}

export function resolveLatexEngine(environment: NodeJS.ProcessEnv = process.env): LatexEngine {
  const configured = environment.CAREER_OS_LATEX_ENGINE?.toLowerCase();
  const configuredPath = environment.CAREER_OS_LATEX_PATH;
  if (configuredPath) return { command: configuredPath, kind: configured === "latexmk" ? "latexmk" : "pdflatex" };

  const localAppData = environment.LOCALAPPDATA ?? "";
  const programFiles = environment.ProgramFiles ?? "";
  const programFilesX86 = environment["ProgramFiles(x86)"] ?? "";
  const roots = [
    resolve(localAppData, "Programs", "MiKTeX", "miktex", "bin", "x64"),
    resolve(programFiles, "MiKTeX", "miktex", "bin", "x64"),
    resolve(programFilesX86, "MiKTeX", "miktex", "bin", "x64"),
  ].filter((value) => value && value !== resolve("."));
  const pathEntries = (environment.PATH ?? "").split(delimiter).filter(Boolean);
  const candidates = [...roots, ...pathEntries];
  const find = (name: string) => candidates.map((root) => resolve(root, name)).find(existsSync);

  if (configured === "latexmk") return { command: find("latexmk.exe") ?? "latexmk", kind: "latexmk" };
  const pdflatex = find(process.platform === "win32" ? "pdflatex.exe" : "pdflatex");
  if (pdflatex) return { command: pdflatex, kind: "pdflatex" };
  const latexmk = find(process.platform === "win32" ? "latexmk.exe" : "latexmk");
  if (latexmk) return { command: latexmk, kind: "latexmk" };
  return { command: "pdflatex", kind: "pdflatex" };
}

export function inspectLatexEngine(environment: NodeJS.ProcessEnv = process.env) {
  const engine = resolveLatexEngine(environment);
  const result = spawnSync(engine.command, ["--version"], { encoding: "utf8", windowsHide: true, timeout: 10_000 });
  return {
    available: result.status === 0,
    engine,
    error: result.status === 0 ? null : (result.stderr || result.error?.message || `${engine.kind} is unavailable`).slice(0, 500),
  };
}

async function runLatex(engine: LatexEngine, source: string, cwd: string, timeoutMs: number) {
  if (engine.kind === "latexmk") {
    return runLatexProcess(engine.command, ["-pdf", "-interaction=nonstopmode", "-halt-on-error", "-file-line-error", source], cwd, timeoutMs);
  }
  const args = ["-interaction=nonstopmode", "-halt-on-error", "-file-line-error", source];
  const first = await runLatexProcess(engine.command, args, cwd, Math.max(5_000, Math.floor(timeoutMs / 2)));
  const second = await runLatexProcess(engine.command, args, cwd, Math.max(5_000, Math.floor(timeoutMs / 2)));
  return `${first}\n${second}`;
}

function runLatexProcess(command: string, args: string[], cwd: string, timeoutMs: number) {
  return new Promise<string>((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd, windowsHide: true, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    let settled = false;
    const append = (chunk: Buffer) => { output = (output + chunk.toString("utf8")).slice(-100_000); };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      if (process.platform === "win32" && child.pid) spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      else child.kill("SIGKILL");
      reject(new Error(`LaTeX compilation timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`Unable to start ${command}: ${error.message}`));
    });
    child.on("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`LaTeX engine failed with exit code ${code}.\n${output.slice(-10_000)}`));
      else resolvePromise(output);
    });
  });
}
