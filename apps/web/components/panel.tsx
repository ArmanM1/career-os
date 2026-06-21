export function Panel({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2 className="panel-title">{title}</h2>
        {typeof count === "number" ? <span className="badge">{count}</span> : null}
      </div>
      {children}
    </section>
  );
}
