import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { spawn } from "node:child_process";

export type LatexCompileResult = { pdfPath: string; sha256: string; sizeBytes: number; log: string };

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
  const log = await runLatexmk(source, workingDirectory, timeoutMs);
  const pdfPath = source.replace(/\.tex$/i, ".pdf");
  const details = await stat(pdfPath).catch(() => null);
  if (!details?.isFile() || details.size === 0) throw new Error("latexmk completed without a non-empty PDF.");
  const bytes = await readFile(pdfPath);
  const after = await readdir(workingDirectory);
  const unexpected = after.filter((name) => !before.has(name) && !/\.(aux|bbl|bcf|blg|fdb_latexmk|fls|log|out|pdf|run\.xml|synctex\.gz|toc)$/i.test(name));
  if (unexpected.length) throw new Error(`LaTeX created unexpected files: ${unexpected.join(", ")}`);
  return { pdfPath, sha256: createHash("sha256").update(bytes).digest("hex"), sizeBytes: bytes.length, log: log.slice(-20_000) };
}

function runLatexmk(source: string, cwd: string, timeoutMs: number) {
  return new Promise<string>((resolvePromise, reject) => {
    const child = spawn("latexmk", ["-pdf", "-interaction=nonstopmode", "-halt-on-error", "-file-line-error", source], { cwd, windowsHide: true, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    const append = (chunk: Buffer) => { output = (output + chunk.toString("utf8")).slice(-100_000); };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    const timer = setTimeout(() => { child.kill(); reject(new Error(`LaTeX compilation timed out after ${timeoutMs}ms.`)); }, timeoutMs);
    child.on("error", (error) => { clearTimeout(timer); reject(new Error(`Unable to start latexmk: ${error.message}`)); });
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`latexmk failed with exit code ${code}.\n${output.slice(-10_000)}`));
      else resolvePromise(output);
    });
  });
}
