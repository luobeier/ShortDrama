"use client";

import { useState } from "react";

/**
 * Per-review actions: share (renders the review as an image card via
 * /api/share/review) and report (flags it for the admin mod queue).
 */
export function ReviewActions({
  reviewId,
  isMine = false,
}: {
  reviewId: string;
  isMine?: boolean;
}) {
  const [sharing, setSharing] = useState(false);
  const [reported, setReported] = useState<string | null>(null);

  async function share() {
    setSharing(true);
    try {
      const res = await fetch(`/api/share/review?id=${encodeURIComponent(reviewId)}`);
      if (!res.ok) throw new Error("render failed");
      const blob = await res.blob();
      const file = new File([blob], "dramascore-review.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "dramascore-review.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      /* user cancelled the share sheet, or render failed — no drama */
    } finally {
      setSharing(false);
    }
  }

  async function report() {
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId }),
    });
    if (res.status === 401) {
      setReported("sign in to report");
      return;
    }
    setReported(res.ok ? "reported ✓" : "already reported");
  }

  return (
    <span className="flex shrink-0 items-center gap-2 text-[11px] text-ink-faint">
      <button onClick={share} disabled={sharing} className="hover:text-ink-soft">
        {sharing ? "…" : "↗ share"}
      </button>
      {!isMine &&
        (reported ? (
          <span>{reported}</span>
        ) : (
          <button onClick={report} title="Report this review" className="hover:text-bad">
            ⚑
          </button>
        ))}
    </span>
  );
}
