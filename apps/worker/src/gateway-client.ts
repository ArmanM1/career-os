import type { AgentOutput } from "@career-os/core";
import type { DeviceCredentials } from "./device-credentials";
import type { SourceMonitorJob } from "./source-adapters";

export type ClaimedJob = {
  id: string;
  user_id: string;
  agent_id: string;
  title: string;
  prompt?: string | null;
  input_type: string;
  input: Record<string, unknown>;
  required_capabilities: string[];
  metadata: Record<string, unknown>;
};

export class WorkerGatewayClient {
  constructor(private readonly baseUrl: string, private readonly credentials: DeviceCredentials) {}

  private async request<T>(path: string, body: unknown = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.credentials.deviceId}.${this.credentials.deviceSecret}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : `Gateway request failed (${response.status})`);
    return payload as T;
  }

  heartbeat(body: Record<string, unknown>) { return this.request("/api/worker/heartbeat", body); }
  tickSchedules() { return this.request("/api/worker/schedules/tick"); }
  claimJobs(limit = 1) { return this.request<{ jobs: ClaimedJob[] }>("/api/worker/jobs/claim", { limit, leaseSeconds: 600 }); }
  currentState() { return this.request<Record<string, unknown>>("/api/worker/state/current"); }
  mcp(tool: string, arguments_: Record<string, unknown> = {}) { return this.request<{ result: unknown }>("/api/worker/mcp", { tool, arguments: arguments_ }); }
  event(jobId: string, eventType: string, message: string, payload: Record<string, unknown> = {}) { return this.request(`/api/worker/jobs/${jobId}/events`, { eventType, message, payload }); }
  complete(jobId: string, output: AgentOutput, runtime: Record<string, unknown>) { return this.request(`/api/worker/jobs/${jobId}/complete`, { output, runtime }); }
  fail(jobId: string, error: string, retryable = true) { return this.request(`/api/worker/jobs/${jobId}/fail`, { error, retryable }); }
  needsInput(jobId: string, reason: string, approvalRequest: unknown) { return this.request(`/api/worker/jobs/${jobId}/needs-input`, { reason, approvalRequest }); }
  dueSources() { return this.request<{ monitors: SourceMonitorJob[] }>("/api/worker/sources/due"); }
  dueConnectors() { return this.request<{ accounts: Array<{ id: string; provider: string }> }>("/api/worker/connectors/due"); }
  syncConnector(connectedAccountId: string) { return this.request("/api/worker/connectors/sync", { connectedAccountId }); }
  dispatchNotifications() { return this.request("/api/worker/notifications/dispatch"); }
  completeSource(id: string, result: unknown) { return this.request(`/api/worker/sources/${id}/complete`, result); }
  artifactDownloadUrl(bucket: string, path: string) { return this.request<{ signedUrl: string }>("/api/worker/artifacts/download-url", { bucket, path, expiresIn: 300 }); }
  artifactUploadUrl(bucket: string, path: string) { return this.request<{ signedUrl: string; token: string; path: string }>("/api/worker/artifacts/upload-url", { bucket, path }); }
  artifactSynced(artifactId: string, sha256: string, localPath: string) { return this.request("/api/worker/artifacts/synced", { artifactId, sha256, localPath }); }
}

export async function pairWorker(baseUrl: string, code: string, capabilities: string[]) {
  const response = await fetch(`${baseUrl}/api/worker/pair`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, workerVersion: "0.3.0", capabilities }),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => ({})) as { deviceId?: string; deviceSecret?: string; error?: string };
  if (!response.ok || !payload.deviceId || !payload.deviceSecret) throw new Error(payload.error ?? "Worker pairing failed");
  return { deviceId: payload.deviceId, deviceSecret: payload.deviceSecret };
}
