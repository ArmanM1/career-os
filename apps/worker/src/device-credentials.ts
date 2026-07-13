import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

export type DeviceCredentials = { deviceId: string; deviceSecret: string };

const decryptCommand = [
  "$encrypted=Get-Content -Raw -LiteralPath $env:CAREER_OS_DPAPI_PATH",
  "$secure=ConvertTo-SecureString $encrypted",
  "$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)",
  "try {[Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr))} finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}",
].join("; ");

const encryptCommand = [
  "$plain=[Console]::In.ReadToEnd()",
  "$secure=ConvertTo-SecureString $plain -AsPlainText -Force",
  "$secure | ConvertFrom-SecureString | Set-Content -NoNewline -LiteralPath $env:CAREER_OS_DPAPI_PATH",
].join("; ");

export function loadDeviceCredentials(dataDir: string): DeviceCredentials {
  const deviceId = readFileSync(join(dataDir, "device-id.txt"), "utf8").trim();
  const secretPath = join(dataDir, "device-secret.dpapi");
  const deviceSecret = execFileSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", decryptCommand], { encoding: "utf8", windowsHide: true, env: { ...process.env, CAREER_OS_DPAPI_PATH: secretPath } }).trim();
  if (!deviceId || !deviceSecret) throw new Error("Paired device credentials are incomplete.");
  return { deviceId, deviceSecret };
}

export function saveDeviceCredentials(dataDir: string, credentials: DeviceCredentials) {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, "device-id.txt"), credentials.deviceId, { encoding: "utf8", mode: 0o600 });
  const result = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", encryptCommand], { input: credentials.deviceSecret, encoding: "utf8", windowsHide: true, env: { ...process.env, CAREER_OS_DPAPI_PATH: join(dataDir, "device-secret.dpapi") } });
  if (result.status !== 0) throw new Error(`Unable to protect worker secret with DPAPI: ${result.stderr}`);
}
