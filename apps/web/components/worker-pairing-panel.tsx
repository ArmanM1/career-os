"use client";

import { Check, Copy, Laptop, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WorkerPairingPanel({ appUrl }: { appUrl: string }) {
  const [name, setName] = useState("Always-on Career OS computer");
  const [pairing, setPairing] = useState<{ code: string; expiresAt: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  async function createCode() { setLoading(true); try { const response = await fetch("/api/settings/worker/pairing-code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setPairing(body); } finally { setLoading(false); } }
  const command = pairing ? `powershell -ExecutionPolicy Bypass -File .\\apps\\worker\\installer\\install.ps1 -GatewayUrl "${appUrl}" -PairingCode "${pairing.code}"` : "";
  async function copy() { await navigator.clipboard.writeText(command); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  return <div className="space-y-5"><div className="space-y-2"><Label htmlFor="device-name">Computer name</Label><Input id="device-name" value={name} onChange={(event) => setName(event.target.value)} /></div><Button onClick={createCode} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <Laptop />}Generate ten-minute pairing code</Button>{pairing ? <div className="space-y-3 rounded-xl border bg-muted/30 p-4"><p className="text-sm text-muted-foreground">Pairing code · expires {new Date(pairing.expiresAt).toLocaleTimeString()}</p><p className="font-mono text-xl font-semibold tracking-wider">{pairing.code}</p><pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-background p-3 text-xs">{command}</pre><Button variant="outline" size="sm" onClick={copy}>{copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy installer command"}</Button></div> : null}</div>;
}
