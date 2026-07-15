import Link from "next/link";
import { Stars } from "./Stars";
import { ReviewActions } from "./ReviewActions";
import { HelpfulButton } from "./HelpfulButton";
import {
  ENDING_VERDICT_EMOJI,
  ENDING_VERDICT_LABELS,
  isEndingVerdict,
} from "@/lib/enums";
import type { ReviewView } from "@/lib/seriesDetail";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / (24 * 3600 * 1000));
  if (d <= 0) return "today";
  if (d === 1) return "1d ago";
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

export function ReviewCard({
  review,
  isMine = false,
  voted = false,
}: {
  review: ReviewView;
  isMine?: boolean;
  /** Whether the current user has marked this review helpful. */
  voted?: boolean;
}) {
  const verdict = isEndingVerdict(review.endingVerdict)
    ? review.endingVerdict
    : "na";
  return (
    <div className={`card p-3.5 ${isMine ? "border-brand/50" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {review.handle ? (
            <Link href={`/u/${review.handle}`} className="truncate text-sm font-bold text-ink">
              @{review.handle}
            </Link>
          ) : (
            <span className="text-sm font-bold text-ink-faint">@anon</span>
          )}
          {review.isFoundingMember && (
            <span title="Founding member" className="text-xs">🌟</span>
          )}
          {isMine && (
            <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[10px] font-bold text-brand">
              you
            </span>
          )}
        </div>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-[11px] text-ink-faint">{timeAgo(review.createdAt)}</span>
          <ReviewActions reviewId={review.id} isMine={isMine} />
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars value={review.stars} size={15} />
        <span
          className={`text-xs font-semibold ${review.worthCoins ? "text-coin" : "text-ink-faint"}`}
        >
          {review.worthCoins ? "🪙 worth it" : "🪙 not worth it"}
        </span>
        <span className="text-xs text-ink-soft">
          {ENDING_VERDICT_EMOJI[verdict]} {ENDING_VERDICT_LABELS[verdict]}
        </span>
        {review.fallsApartAtEp != null && (
          <span className="text-xs text-warn">falls apart ~ep {review.fallsApartAtEp}</span>
        )}
        {review.watchStatus === "finished" && (
          <span className="text-xs text-good">✅ finished it</span>
        )}
        {review.watchStatus === "abandoned" && (
          <span className="text-xs text-ink-faint">
            🏳️ bailed{review.bailedAtEp != null ? ` at ep ${review.bailedAtEp}` : ""}
          </span>
        )}
      </div>

      {review.oneLiner && (
        <p className="mt-2 text-sm text-ink">“{review.oneLiner}”</p>
      )}
      {review.coinsSpent != null && (
        <p className="mt-1.5 text-[11px] text-coin/90">
          💸 actually spent ${review.coinsSpent.toFixed(2)}
        </p>
      )}
      {review.helpfulCount !== undefined && (
        <div className="mt-2">
          <HelpfulButton
            reviewId={review.id}
            initialCount={review.helpfulCount}
            initiallyVoted={voted}
            disabled={isMine}
          />
        </div>
      )}
      {review.quarantined && (
        <p className="mt-1.5 text-[11px] text-ink-faint">
          New account — counts once it ages past 24h.
        </p>
      )}
    </div>
  );
}
