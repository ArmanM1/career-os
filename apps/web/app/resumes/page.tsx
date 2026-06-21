import { PageHeader } from "@/components/page-header";
import { ObjectCard } from "@/components/object-card";
import { Panel } from "@/components/panel";
import { getDashboardData } from "@/lib/data";

type ResumeRow = {
  id: string;
  title: string;
  status?: string;
  labels?: string[];
  latex_path?: string;
  pdf_path?: string | null;
};

export default async function ResumesPage() {
  const { resumes } = await getDashboardData();
  const rows = resumes as ResumeRow[];

  return (
    <>
      <PageHeader title="Resume Library" description="LaTeX-backed resume templates, base versions, and role-specific variants." />
      <Panel title="Resume Variants" count={rows.length}>
        <div className="item-list">
          {rows.map((resume) => (
            <ObjectCard
              key={resume.id}
              item={resume}
              footer={
                <div className="item-meta">
                  {resume.latex_path ? <span>{resume.latex_path}</span> : null}
                  {resume.pdf_path ? <span>{resume.pdf_path}</span> : <span>PDF pending</span>}
                </div>
              }
            />
          ))}
        </div>
      </Panel>
    </>
  );
}
