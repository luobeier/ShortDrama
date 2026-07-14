import Link from "next/link";

export function EmptyState({
  emoji = "🍿",
  title,
  body,
  ctaLabel,
  ctaHref,
}: {
  emoji?: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="card mx-4 flex flex-col items-center gap-2 p-8 text-center">
      <div className="text-4xl">{emoji}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="max-w-xs text-sm text-ink-soft">{body}</p>
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="btn-primary mt-2">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
