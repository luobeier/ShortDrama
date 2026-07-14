import Link from "next/link";

export function TropeRail({
  tropes,
  activeSlug,
}: {
  tropes: { name: string; slug: string; count?: number }[];
  activeSlug?: string;
}) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1">
      {tropes.map((t) => (
        <Link
          key={t.slug}
          href={`/trope/${t.slug}`}
          className={`chip ${activeSlug === t.slug ? "chip-active" : ""}`}
        >
          {t.name}
          {typeof t.count === "number" && (
            <span className="text-ink-faint">{t.count}</span>
          )}
        </Link>
      ))}
    </div>
  );
}
