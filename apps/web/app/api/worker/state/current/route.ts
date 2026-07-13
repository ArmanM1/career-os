import { NextResponse } from "next/server";
import { assembleCurrentState } from "@/lib/current-state";
import { authenticateWorker, workerUnauthorized } from "@/lib/worker-auth";

export async function POST(request: Request) {
  const device = await authenticateWorker(request);
  if (!device) return workerUnauthorized();
  return NextResponse.json(await assembleCurrentState(device.userId));
}
