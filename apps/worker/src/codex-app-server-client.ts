import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface, type Interface } from "node:readline";

type RequestId = number | string;
type JsonObject = Record<string, unknown>;

export type AppServerMessage = {
  id?: RequestId;
  method?: string;
  params?: JsonObject;
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
    data?: unknown;
  };
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

export class CodexAppServerClient {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private lines: Interface | null = null;
  private nextId = 1;
  private pending = new Map<RequestId, PendingRequest>();
  private events = new EventEmitter();
  private initialization: Promise<void> | null = null;

  constructor(private readonly options: { cwd: string }) {}

  async start() {
    if (!this.initialization) {
      this.initialization = this.startProcess().then(async () => {
        await this.request("initialize", {
          clientInfo: {
            name: "career_os",
            title: "Career OS",
            version: "0.1.0",
          },
          capabilities: {
            experimentalApi: true,
          },
        });
        this.notify("initialized", {});
      });
    }

    await this.initialization;
  }

  async request<T = unknown>(method: string, params: JsonObject = {}, timeoutMs = 120_000): Promise<T> {
    await this.ensureProcess();
    const id = this.nextId++;

    const promise = new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`codex app-server request timed out: ${method}`));
      }, timeoutMs);

      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timeout,
      });
    });

    this.send({ id, method, params });
    return promise;
  }

  notify(method: string, params: JsonObject = {}) {
    this.send({ method, params });
  }

  respond(id: RequestId, result: unknown) {
    this.send({ id, result });
  }

  rejectRequest(id: RequestId, code: number, message: string, data?: unknown) {
    this.send({ id, error: { code, message, data } });
  }

  onMessage(listener: (message: AppServerMessage) => void) {
    this.events.on("message", listener);
    return () => this.events.off("message", listener);
  }

  dispose() {
    const pid = this.proc?.pid;
    this.lines?.close();
    if (process.platform === "win32" && pid) {
      spawnSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      this.proc?.kill();
    }
    this.proc = null;
    this.lines = null;
  }

  private async ensureProcess() {
    if (!this.initialization && !this.proc) {
      await this.start();
      return;
    }

    if (!this.proc?.stdin.writable) {
      this.initialization = null;
      await this.start();
    }
  }

  private async startProcess() {
    if (this.proc) return;

    const command = resolveCodexCommand();
    const useShell = process.platform === "win32" && command.toLowerCase().endsWith(".cmd");
    this.proc = spawn(command, ["app-server", "-c", "service_tier=fast", "--listen", "stdio://"], {
      cwd: this.options.cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
      shell: useShell,
      windowsHide: true,
    });

    this.proc.stderr.on("data", (chunk) => {
      this.events.emit("message", {
        method: "career-os/stderr",
        params: { text: chunk.toString("utf8") },
      } satisfies AppServerMessage);
    });

    this.proc.on("exit", (code, signal) => {
      const error = new Error(`codex app-server exited with code ${code ?? "null"} signal ${signal ?? "null"}`);
      for (const [id, pending] of this.pending) {
        clearTimeout(pending.timeout);
        pending.reject(error);
        this.pending.delete(id);
      }
      this.events.emit("message", {
        method: "career-os/exit",
        params: { code, signal },
      } satisfies AppServerMessage);
      this.proc = null;
      this.initialization = null;
    });

    this.lines = createInterface({ input: this.proc.stdout });
    this.lines.on("line", (line) => this.handleLine(line));
  }

  private handleLine(line: string) {
    const trimmed = line.trim();
    if (!trimmed) return;

    let message: AppServerMessage;
    try {
      message = JSON.parse(trimmed) as AppServerMessage;
    } catch (caught) {
      this.events.emit("message", {
        method: "career-os/protocol-error",
        params: {
          message: caught instanceof Error ? caught.message : String(caught),
          line: trimmed,
        },
      } satisfies AppServerMessage);
      return;
    }

    if (message.id !== undefined && !message.method) {
      const pending = this.pending.get(message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pending.delete(message.id);
        if (message.error) {
          pending.reject(new Error(message.error.message ?? `codex app-server error ${message.error.code ?? ""}`));
        } else {
          pending.resolve(message.result);
        }
      }
      return;
    }

    this.events.emit("message", message);
  }

  private send(message: AppServerMessage) {
    if (!this.proc?.stdin.writable) {
      throw new Error("codex app-server is not running.");
    }
    this.proc.stdin.write(`${JSON.stringify(message)}\n`);
  }
}

function resolveCodexCommand() {
  if (process.platform !== "win32") return "codex";

  const npmRootResult = spawnSync("npm.cmd", ["root", "-g"], { encoding: "utf8" });
  const npmRoot = typeof npmRootResult.stdout === "string" ? npmRootResult.stdout.trim() : "";
  const packageRoot = join(npmRoot, "@openai", "codex", "node_modules", "@openai", "codex-win32-x64", "vendor", "x86_64-pc-windows-msvc");
  const bundledExecutables = [join(packageRoot, "bin", "codex.exe"), join(packageRoot, "codex", "codex.exe")];
  const bundledExe = bundledExecutables.find(existsSync);
  if (bundledExe) return bundledExe;

  const result = spawnSync("where.exe", ["codex"], { encoding: "utf8" });
  const paths = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const cmdShim = paths.find((path) => path.toLowerCase().endsWith(".cmd"));
  if (cmdShim) {
    const shimRoot = join(dirname(cmdShim), "node_modules", "@openai", "codex", "node_modules", "@openai", "codex-win32-x64", "vendor", "x86_64-pc-windows-msvc");
    const shimExe = [join(shimRoot, "bin", "codex.exe"), join(shimRoot, "codex", "codex.exe")].find(existsSync);
    if (shimExe) return shimExe;
  }

  return paths.find((path) => path.toLowerCase().endsWith(".cmd")) ?? paths.find((path) => path.toLowerCase().endsWith(".exe")) ?? paths[0] ?? "codex";
}
