const WORKER_OFFLINE_AFTER_MS = 120_000;

export function isWorkerOnline(
  worker: { status: string | null; last_heartbeat_at: string | null } | null | undefined,
): boolean {
  if (worker?.status !== "online" || !worker.last_heartbeat_at) return false;
  return Date.now() - new Date(worker.last_heartbeat_at).getTime() < WORKER_OFFLINE_AFTER_MS;
}
