"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="mx-auto flex min-h-[60vh] max-w-xl items-center"><Card className="w-full"><CardHeader><div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><AlertTriangle className="size-5" /></div><CardTitle>Career OS could not load this view</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Your data has not been replaced with demo content. Check Supabase or the paired worker status, then retry.</p><Button onClick={reset}>Try again</Button></CardContent></Card></div>;
}
