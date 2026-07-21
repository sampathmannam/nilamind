// InfoCard — a read-only card for narratives, summaries, and informational content.
// Part of the standardized card taxonomy (StatCard / ActionCard / InfoCard).
// Design: title + body, no action button. Used for insights, narratives, context.

interface InfoCardProps {
  /** Card title. */
  title: string;
  /** Body content. */
  children: React.ReactNode;
  /** Optional header eyebrow text. */
  eyebrow?: string;
  className?: string;
}

export default function InfoCard({ title, children, eyebrow, className = "" }: InfoCardProps) {
  return (
    <section className={`glass rounded-2xl p-4 space-y-2 ${className}`} aria-label={title}>
      {eyebrow && (
        <p className="text-xs uppercase font-mono tracking-widest text-ink-faint">{eyebrow}</p>
      )}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <div className="text-sm text-ink-muted leading-relaxed">{children}</div>
    </section>
  );
}
