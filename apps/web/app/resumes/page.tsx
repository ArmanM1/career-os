import { FileText, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireUser } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  addExperienceAchievement,
  saveExperience,
  setExperienceReview,
  setResumeComponentReview,
  uploadResumeSource,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function ResumesPage() {
  const { supabase, user } = await requireUser();
  const [
    { data: versions },
    { data: variants },
    { data: experiences },
    { data: achievements },
    { data: projects },
    { data: skills },
  ] = await Promise.all([
    supabase.from("resume_versions").select("id,title,status,track,latex_path,pdf_path,metadata,updated_at").eq("user_id", user.id).is("archived_at", null).order("updated_at", { ascending: false }),
    supabase.from("resume_variants").select("id,title,status,latex_path,pdf_path,rationale,application_id,updated_at").eq("user_id", user.id).is("archived_at", null).order("updated_at", { ascending: false }),
    supabase.from("experiences").select("id,title,organization,description,starts_at,ends_at,status,updated_at").eq("user_id", user.id).is("archived_at", null).order("updated_at", { ascending: false }),
    supabase.from("experience_achievements").select("id,experience_id,achievement,status,metadata").eq("user_id", user.id).is("archived_at", null).order("created_at"),
    supabase.from("projects").select("id,title,description,url,repository_url,status,metadata,updated_at").eq("user_id", user.id).is("archived_at", null).order("updated_at", { ascending: false }),
    supabase.from("skills").select("id,title,proficiency,status,metadata,updated_at").eq("user_id", user.id).is("archived_at", null).order("updated_at", { ascending: false }),
  ]);
  const admin = getSupabaseAdminClient();
  const pdfPaths = [...(versions ?? []), ...(variants ?? [])].flatMap((resume) => resume.pdf_path ? [resume.pdf_path] : []);
  const signed = new Map<string, string>();
  for (const path of pdfPaths.slice(0, 40)) {
    const { data } = await admin.storage.from("resume-artifacts").createSignedUrl(path, 300);
    if (data?.signedUrl) signed.set(path, data.signedUrl);
  }
  const componentCount = (experiences?.length ?? 0) + (achievements?.length ?? 0) + (projects?.length ?? 0) + (skills?.length ?? 0);
  const verifiedCount = [...(experiences ?? []), ...(achievements ?? []), ...(projects ?? []), ...(skills ?? [])].filter((item) => item.status === "verified").length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Resume component library</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          There is no required base resume. Upload every variant you have; Career OS extracts reusable factual experiences, achievements, projects, and skills, then composes a new LaTeX resume for each opportunity.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="size-5" />Upload resume source</CardTitle>
          <CardDescription>PDF-only files become draft extracted facts for review. `.tex` and ZIP sources preserve their original layouts as optional templates.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={uploadResumeSource} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
            <div className="space-y-2"><Label htmlFor="resume-file">Resume file</Label><Input id="resume-file" name="file" type="file" accept=".pdf,.tex,.txt,.zip,application/pdf,application/x-tex,application/zip" required /></div>
            <div className="space-y-2"><Label htmlFor="track">Track hint</Label><Input id="track" name="track" placeholder="general / SWE / PM" defaultValue="general" /></div>
            <Button type="submit"><Upload />Upload & extract</Button>
          </form>
        </CardContent>
      </Card>

      <section>
        <div className="mb-3"><h2 className="text-xl font-semibold">Uploaded source resumes</h2><p className="text-sm text-muted-foreground">{verifiedCount} of {componentCount} extracted components verified.</p></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {versions?.length ? versions.map((resume) => (
            <Card key={resume.id}>
              <CardHeader><div className="flex items-start justify-between gap-3"><CardTitle className="flex items-center gap-2 text-lg"><FileText className="size-5" />{resume.title}</CardTitle><Badge variant="outline">{resume.status.replaceAll("_", " ")}</Badge></div><CardDescription>{resume.track} · updated {new Date(resume.updated_at).toLocaleDateString()}</CardDescription></CardHeader>
              <CardContent>{resume.pdf_path && signed.get(resume.pdf_path) ? <Button asChild size="sm" variant="outline"><a href={signed.get(resume.pdf_path)} target="_blank" rel="noreferrer">View PDF</a></Button> : <span className="text-xs text-muted-foreground">Extraction or review pending</span>}</CardContent>
            </Card>
          )) : <Card><CardHeader><CardTitle>No resumes uploaded</CardTitle><CardDescription>Upload the first source above to begin the component library.</CardDescription></CardHeader></Card>}
        </div>
      </section>

      <section className="space-y-4">
        <div><h2 className="text-xl font-semibold">Experiences and achievements</h2><p className="text-sm text-muted-foreground">Correct every extracted fact. Only verified components can be used in generated variants.</p></div>
        <Card>
          <CardHeader><CardTitle>Add an experience</CardTitle><CardDescription>Add factual work, leadership, research, club, or volunteer context Career OS can reuse.</CardDescription></CardHeader>
          <CardContent><form action={saveExperience.bind(null, null)} className="grid gap-3 md:grid-cols-2"><Input name="title" placeholder="Role or experience title" required /><Input name="organization" placeholder="Organization" /><Input name="startsAt" type="date" aria-label="Start date" /><Input name="endsAt" type="date" aria-label="End date" /><Textarea name="description" placeholder="Verified scope, responsibilities, and context" className="md:col-span-2" /><Button type="submit" className="md:col-span-2 md:justify-self-start">Add experience</Button></form></CardContent>
        </Card>
        <div className="grid gap-4 xl:grid-cols-2">
          {experiences?.map((experience) => {
            const scopedAchievements = achievements?.filter((item) => item.experience_id === experience.id) ?? [];
            return (
              <Card key={experience.id}>
                <CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>{experience.title}</CardTitle><CardDescription>{experience.organization || "No organization"}</CardDescription></div><Badge variant={experience.status === "verified" ? "default" : "outline"}>{experience.status}</Badge></div></CardHeader>
                <CardContent className="space-y-4">
                  <form action={saveExperience.bind(null, experience.id)} className="grid gap-3 sm:grid-cols-2"><Input name="title" defaultValue={experience.title} required /><Input name="organization" defaultValue={experience.organization ?? ""} /><Input name="startsAt" type="date" defaultValue={experience.starts_at ?? ""} aria-label="Start date" /><Input name="endsAt" type="date" defaultValue={experience.ends_at ?? ""} aria-label="End date" /><Textarea name="description" defaultValue={experience.description ?? ""} className="sm:col-span-2" /><Button type="submit" size="sm" variant="outline" className="sm:justify-self-start">Save corrections</Button></form>
                  <div className="space-y-2"><p className="text-sm font-medium">Achievements</p>{scopedAchievements.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 rounded-md border bg-muted/30 p-3 text-sm"><span>{item.achievement}</span><form action={setResumeComponentReview.bind(null, "achievement", item.id, item.status === "verified" ? "draft" : "verified")}><Button type="submit" size="sm" variant={item.status === "verified" ? "outline" : "default"}>{item.status === "verified" ? "Verified" : "Verify"}</Button></form></div>)}<form action={addExperienceAchievement.bind(null, experience.id)} className="flex gap-2"><Input name="achievement" placeholder="Add a factual achievement or outcome" required /><Button type="submit" size="sm">Add</Button></form></div>
                  <form action={setExperienceReview.bind(null, experience.id, experience.status === "verified" ? "draft" : "verified")}><Button type="submit" size="sm" variant={experience.status === "verified" ? "outline" : "default"}>{experience.status === "verified" ? "Return experience to draft" : "Verify experience facts"}</Button></form>
                </CardContent>
              </Card>
            );
          })}
          {!experiences?.length ? <Card className="border-dashed"><CardContent className="py-10 text-center text-sm text-muted-foreground">Uploaded resume experiences will appear here for review.</CardContent></Card> : null}
        </div>
      </section>

      <section className="space-y-4">
        <div><h2 className="text-xl font-semibold">Projects and skills</h2><p className="text-sm text-muted-foreground">Verify extracted project claims and skill names independently; Career OS can combine them with any verified experience.</p></div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>Projects</CardTitle></CardHeader><CardContent className="space-y-3">{projects?.length ? projects.map((project) => <div key={project.id} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{project.title}</p><p className="mt-1 text-sm text-muted-foreground">{project.description || "No description extracted"}</p></div><Badge variant={project.status === "verified" ? "default" : "outline"}>{project.status}</Badge></div><form action={setResumeComponentReview.bind(null, "project", project.id, project.status === "verified" ? "draft" : "verified")}><Button type="submit" size="sm" variant={project.status === "verified" ? "outline" : "default"} className="mt-3">{project.status === "verified" ? "Return to draft" : "Verify project"}</Button></form></div>) : <p className="text-sm text-muted-foreground">No projects extracted yet.</p>}</CardContent></Card>
          <Card><CardHeader><CardTitle>Skills</CardTitle></CardHeader><CardContent className="space-y-3">{skills?.length ? skills.map((skill) => <div key={skill.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-medium">{skill.title}</p><p className="text-xs text-muted-foreground">{skill.proficiency || "Proficiency not claimed"}</p></div><form action={setResumeComponentReview.bind(null, "skill", skill.id, skill.status === "verified" ? "draft" : "verified")}><Button type="submit" size="sm" variant={skill.status === "verified" ? "outline" : "default"}>{skill.status === "verified" ? "Verified" : "Verify"}</Button></form></div>) : <p className="text-sm text-muted-foreground">No skills extracted yet.</p>}</CardContent></Card>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Opportunity-specific variants</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {variants?.length ? variants.map((resume) => <Card key={resume.id}><CardHeader><div className="flex items-start justify-between gap-3"><CardTitle className="text-lg">{resume.title}</CardTitle><Badge>{resume.status.replaceAll("_", " ")}</Badge></div><CardDescription>{resume.rationale || "Composed from verified component facts."}</CardDescription></CardHeader><CardContent>{resume.pdf_path && signed.get(resume.pdf_path) ? <Button asChild size="sm" variant="outline"><a href={signed.get(resume.pdf_path)} target="_blank" rel="noreferrer">View PDF</a></Button> : <span className="text-xs text-muted-foreground">Compilation pending</span>}</CardContent></Card>) : <p className="text-sm text-muted-foreground">Variants appear automatically when an application packet needs one.</p>}
        </div>
      </section>
    </div>
  );
}
