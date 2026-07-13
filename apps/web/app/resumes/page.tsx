import { FileText, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireUser } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { uploadResumeSource } from "./actions";

export const dynamic = "force-dynamic";

export default async function ResumesPage() {
  const { supabase, user } = await requireUser();
  const [{ data: versions }, { data: variants }, { data: experiences }] = await Promise.all([
    supabase.from("resume_versions").select("id,title,status,track,latex_path,pdf_path,metadata,updated_at").eq("user_id", user.id).is("archived_at", null).order("updated_at", { ascending: false }),
    supabase.from("resume_variants").select("id,title,status,latex_path,pdf_path,rationale,application_id,updated_at").eq("user_id", user.id).is("archived_at", null).order("updated_at", { ascending: false }),
    supabase.from("experiences").select("id,status").eq("user_id", user.id).is("archived_at", null),
  ]);
  const admin = getSupabaseAdminClient();
  const pdfPaths = [...(versions ?? []), ...(variants ?? [])].flatMap((resume) => resume.pdf_path ? [resume.pdf_path] : []);
  const signed = new Map<string, string>();
  for (const path of pdfPaths.slice(0, 40)) {
    const { data } = await admin.storage.from("resume-artifacts").createSignedUrl(path, 300);
    if (data?.signedUrl) signed.set(path, data.signedUrl);
  }

  return <div className="mx-auto w-full max-w-7xl space-y-7"><header><h1 className="text-3xl font-semibold tracking-tight">Resume library</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Upload every existing variant. Career OS extracts a reviewable factual experience library and produces role-specific LaTeX variants without inventing facts.</p></header>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Upload className="size-5" />Upload resume source</CardTitle><CardDescription>PDF-only files become draft extracted facts for review. `.tex` and ZIP sources preserve the original LaTeX structure.</CardDescription></CardHeader><CardContent><form action={uploadResumeSource} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end"><div className="space-y-2"><Label htmlFor="resume-file">Resume file</Label><Input id="resume-file" name="file" type="file" accept=".pdf,.tex,.txt,.zip,application/pdf,application/x-tex,application/zip" required /></div><div className="space-y-2"><Label htmlFor="track">Track</Label><Input id="track" name="track" placeholder="general / SWE / PM" defaultValue="general" /></div><Button type="submit"><Upload />Upload & process</Button></form></CardContent></Card>
    <section><div className="mb-3 flex items-end justify-between"><div><h2 className="text-xl font-semibold">Base versions</h2><p className="text-sm text-muted-foreground">{experiences?.length ?? 0} experience records currently available for tailoring.</p></div></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{versions?.length ? versions.map((resume) => <Card key={resume.id}><CardHeader><div className="flex items-start justify-between gap-3"><CardTitle className="flex items-center gap-2 text-lg"><FileText className="size-5" />{resume.title}</CardTitle><Badge variant="outline">{resume.status}</Badge></div><CardDescription>{resume.track} · updated {new Date(resume.updated_at).toLocaleDateString()}</CardDescription></CardHeader><CardContent className="flex gap-2">{resume.pdf_path && signed.get(resume.pdf_path) ? <Button asChild size="sm" variant="outline"><a href={signed.get(resume.pdf_path)} target="_blank" rel="noreferrer">View PDF</a></Button> : <span className="text-xs text-muted-foreground">PDF pending</span>}</CardContent></Card>) : <Card><CardHeader><CardTitle>No resumes uploaded</CardTitle><CardDescription>Upload the first source above to begin the experience review.</CardDescription></CardHeader></Card>}</div></section>
    <section><h2 className="mb-3 text-xl font-semibold">Role-specific variants</h2><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{variants?.length ? variants.map((resume) => <Card key={resume.id}><CardHeader><div className="flex items-start justify-between gap-3"><CardTitle className="text-lg">{resume.title}</CardTitle><Badge>{resume.status.replaceAll("_", " ")}</Badge></div><CardDescription>{resume.rationale || "Tailored from verified experience facts."}</CardDescription></CardHeader><CardContent>{resume.pdf_path && signed.get(resume.pdf_path) ? <Button asChild size="sm" variant="outline"><a href={signed.get(resume.pdf_path)} target="_blank" rel="noreferrer">View PDF</a></Button> : <span className="text-xs text-muted-foreground">Compilation pending</span>}</CardContent></Card>) : <p className="text-sm text-muted-foreground">Variants appear automatically when an application packet needs one.</p>}</div></section>
  </div>;
}
