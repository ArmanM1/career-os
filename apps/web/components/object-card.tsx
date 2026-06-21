export type CardObject = {
  id: string;
  title: string;
  status?: string | null;
  labels?: string[] | null;
  priority?: number | null;
  due_at?: string | null;
  dueAt?: string | null;
};

export function ObjectCard({ item, footer }: { item: CardObject; footer?: React.ReactNode }) {
  const labels = item.labels ?? [];
  const due = item.due_at ?? item.dueAt;

  return (
    <article className="item">
      <div className="item-title">
        <span>{item.title}</span>
        {item.priority ? <span className="badge">{item.priority}</span> : null}
      </div>
      <div className="item-meta">
        {item.status ? <span className="badge blue">{item.status}</span> : null}
        {due ? <span className="badge">{new Date(due).toLocaleDateString()}</span> : null}
        {labels.map((label) => (
          <span className="badge" key={label}>
            {label}
          </span>
        ))}
      </div>
      {footer ? <div style={{ marginTop: 10 }}>{footer}</div> : null}
    </article>
  );
}
