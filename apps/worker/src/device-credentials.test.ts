import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadDeviceCredentials, saveDeviceCredentials } from "./device-credentials";

describe("Windows DPAPI device credentials", () => {
  it.skipIf(process.platform !== "win32")("round-trips a device secret without placing it in command arguments", () => {
    const directory = mkdtempSync(join(tmpdir(), "career-os-dpapi-"));
    try {
      const credentials = { deviceId: "00000000-0000-4000-8000-000000000001", deviceSecret: "test-device-secret-with-at-least-thirty-two-characters" };
      saveDeviceCredentials(directory, credentials);
      expect(loadDeviceCredentials(directory)).toEqual(credentials);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
