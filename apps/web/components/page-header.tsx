export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-copy">{description}</p> : null}
      </div>
      {children ? <div className="toolbar">{children}</div> : null}
    </header>
  );
}
