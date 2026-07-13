import { LockKeyhole } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, signIn } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const notice = typeof params.notice === "string" ? params.notice : null;
  const next = typeof params.next === "string" ? params.next : "/dashboard";

  return (
    <main data-auth-screen className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><LockKeyhole className="size-5" /></div>
          <CardTitle><h1>Sign in to Career OS</h1></CardTitle>
          <CardDescription>Your private career state, plans, relationships, and applications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
          {notice ? <Alert><AlertDescription>{notice}</AlertDescription></Alert> : null}
          <form action={signIn} className="space-y-4">
            <input type="hidden" name="next" value={next} />
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div>
            <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete="current-password" required minLength={12} /></div>
            <Button className="w-full" type="submit">Sign in</Button>
          </form>
          <form action={requestPasswordReset} className="flex items-end gap-2 border-t pt-4">
            <div className="min-w-0 flex-1 space-y-2"><Label htmlFor="reset-email">Reset password</Label><Input id="reset-email" name="email" type="email" placeholder="you@example.com" required /></div>
            <Button type="submit" variant="outline">Send link</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
