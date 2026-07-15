"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Hit {
  id: string;
  title: string;
  episodeCount: number;
  score: number | null;
}

export function SearchBar({
  autoFocus = false,
  defaultValue = "",
}: {
  autoFocus?: boolean;
  defaultValue?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced typeahead — instant results as you type.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const query = q.trim();
    if (query.length < 2 || query === defaultValue) {
      setHits([]);
      setOpen(false);
      return;
    }
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setHits(data.results ?? []);
        setOpen((data.results ?? []).length > 0);
      } catch {
        /* network hiccup — dropdown just doesn't open */
      }
    }, 200);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setOpen(false);
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
      className="relative px-4"
    >
      <svg
        className="pointer-events-none absolute left-7 top-[26px] -translate-y-1/2 text-ink-faint"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
        <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <input
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => hits.length > 0 && setOpen(true)}
        placeholder="Search a title or alias…"
        className="input pl-10"
        enterKeyHint="search"
      />
      {open && (
        <div className="absolute inset-x-4 top-full z-40 mt-1.5 overflow-hidden rounded-2xl border border-line bg-bg-elevated shadow-card">
          {hits.map((h) => (
            <Link
              key={h.id}
              href={`/series/${h.id}`}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm hover:bg-bg-card"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold text-ink">{h.title}</span>
                <span className="text-[11px] text-ink-faint">{h.episodeCount} eps</span>
              </span>
              <span
                className={`shrink-0 text-xs font-black tabular-nums ${
                  h.score !== null ? "text-coin" : "text-ink-faint"
                }`}
              >
                {h.score !== null ? `🪙 ${h.score}` : "—"}
              </span>
            </Link>
          ))}
          <button
            type="submit"
            className="block w-full border-t border-line px-3.5 py-2 text-left text-xs text-brand"
          >
            See all results for “{q.trim()}” →
          </button>
        </div>
      )}
    </form>
  );
}
