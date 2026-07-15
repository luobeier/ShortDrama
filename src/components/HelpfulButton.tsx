"use client";

import { useState } from "react";

/** Toggleable "helpful" vote on a review. */
export function HelpfulButton({
  reviewId,
  initialCount,
  initiallyVoted,
  disabled = false,
}: {
  reviewId: string;
  initialCount: number;
  initiallyVoted: boolean;
  disabled?: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(initiallyVoted);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const res = await fetch("/api/review/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId }),
    });
    setBusy(false);
    if (res.status === 401) {
      window.location.assign(`/signin?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    setVoted(data.voted);
    setCount(data.count);
  }

  if (disabled) {
    return count > 0 ? (
      <span className="text-[11px] text-ink-faint">👍 {count} found this helpful</span>
    ) : null;
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
        voted
          ? "border-coin/60 bg-coin/15 text-coin"
          : "border-line bg-bg-elevated text-ink-faint hover:text-ink-soft"
      }`}
    >
      👍 Helpful{count > 0 ? ` · ${count}` : ""}
    </button>
  );
}
