export function CommunityPageState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-ink-100 bg-white px-6 py-12 text-center shadow-sm">
      <h2 className="font-display text-2xl font-semibold text-ink-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-ink-600">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </section>
  );
}
