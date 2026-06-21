import { PageHeader } from "@/components/page-header";
import { ObjectCard } from "@/components/object-card";
import { Panel } from "@/components/panel";
import { getDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

type ApprovalRow = { id: string; title: string; status?: string; labels?: string[]; rationale?: string };

export default async function ApprovalsPage() {
  const { approvals } = await getDashboardData();
  const rows = approvals as ApprovalRow[];

  return (
    <>
      <PageHeader
        title="Approvals"
        description="Externally visible or irreversible actions wait here: sending, submitting, connector scope expansion, authenticated browser control, and deletion."
      />
      <Panel title="Pending Approval Requests" count={rows.length}>
        <div className="item-list">
          {rows.map((approval) => (
            <ObjectCard
              key={approval.id}
              item={approval}
              footer={<div className="item-meta">{approval.rationale ? <span>{approval.rationale}</span> : null}</div>}
            />
          ))}
        </div>
      </Panel>
    </>
  );
}
