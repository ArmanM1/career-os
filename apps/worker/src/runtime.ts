import { randomUUID } from "node:crypto";
import { AgentOutput } from "@career-os/core";

export type RuntimeThread = {
  id: string;
  provider: "codex-app-server" | "mock";
  title: string;
};

export type RuntimeEvent = {
  type: "message" | "tool" | "warning" | "completed";
  message: string;
  payload?: Record<string, unknown>;
};

export type StartThreadInput = {
  title: string;
  agentId: string;
  cwd: string;
};

export type RunTurnInput = {
  thread: RuntimeThread;
  prompt: string;
  skillPath: string;
  context: Record<string, unknown>;
};

export interface AgentRuntime {
  startThread(input: StartThreadInput): Promise<RuntimeThread>;
  resumeThread(threadId: string): Promise<RuntimeThread>;
  runTurn(input: RunTurnInput): AsyncIterable<RuntimeEvent>;
  interruptTurn(threadId: string, turnId: string): Promise<void>;
  archiveThread(threadId: string): Promise<void>;
}

export class MockRuntime implements AgentRuntime {
  async startThread(input: StartThreadInput): Promise<RuntimeThread> {
    return { id: randomUUID(), provider: "mock", title: input.title };
  }

  async resumeThread(threadId: string): Promise<RuntimeThread> {
    return { id: threadId, provider: "mock", title: "Resumed thread" };
  }

  async *runTurn(input: RunTurnInput): AsyncIterable<RuntimeEvent> {
    yield { type: "message", message: `Loaded ${input.skillPath}` };
    yield { type: "message", message: `Processed job for ${input.thread.title}` };
    yield {
      type: "completed",
      message: "Mock runtime completed with no mutations.",
      payload: {
        summary: "Mock runtime completed. Codex App Server adapter is installed as the runtime boundary.",
        proposedMutations: [],
        approvalRequests: [],
        evidence: [],
        followUpQuestions: [],
        warnings: [],
      } satisfies AgentOutput,
    };
  }

  async interruptTurn(): Promise<void> {
    return;
  }

  async archiveThread(): Promise<void> {
    return;
  }
}

export class CodexAppServerRuntime extends MockRuntime {
  async startThread(input: StartThreadInput): Promise<RuntimeThread> {
    return { id: randomUUID(), provider: "codex-app-server", title: input.title };
  }

  async *runTurn(input: RunTurnInput): AsyncIterable<RuntimeEvent> {
    yield {
      type: "warning",
      message:
        "Codex App Server protocol boundary is selected. This V1 worker records the run and returns structured output; full JSON-RPC turn execution is the next adapter hardening step.",
    };
    yield* super.runTurn(input);
  }
}

export function createRuntime(kind: "codex-app-server" | "mock"): AgentRuntime {
  return kind === "mock" ? new MockRuntime() : new CodexAppServerRuntime();
}

