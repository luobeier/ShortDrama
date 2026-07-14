"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PLATFORMS,
  LOG_STATUSES,
  ENDING_VERDICTS,
  ENDING_VERDICT_LABELS,
  ENDING_VERDICT_EMOJI,
  type LogStatus,
  type EndingVerdict,
} from "@/lib/enums";

export interface ExistingLog {
  status: LogStatus;
  platformWatchedOn: string;
  abandonedAtEp: number | null;
}
export interface ExistingReview {
  stars: number;
  worthCoins: boolean;
  endingVerdict: EndingVerdict;
  fallsApartAtEp: number | null;
  oneLiner: string | null;
}

interface Props {
  seriesId: string;
  title: string;
  episodeCount: number;
  platforms: string[];
  isLoggedIn: boolean;
  existingLog: ExistingLog | null;
  existingReview: ExistingReview | null;
}

const STATUS_META: Record<LogStatus, { emoji: string; label: string }> = {
  watching: { emoji: "👀", label: "Watching" },
  finished: { emoji: "✅", label: "Finished" },
  abandoned: { emoji: "🏳️", label: "Abandoned" },
};

export function LogReviewFlow(props: Props) {
  const { seriesId, title, episodeCount, platforms, isLoggedIn } = props;
  const router = useRouter();
  const [step, setStep] = useState<"closed" | "log" | "review">("closed");

  // Log fields
  const [status, setStatus] = useState<LogStatus>(
    props.existingLog?.status ?? "watching"
  );
  const [platform, setPlatform] = useState<string>(
    props.existingLog?.platformWatchedOn ?? platforms[0] ?? "ReelShort"
  );
  const [abandonedAtEp, setAbandonedAtEp] = useState<number>(
    props.existingLog?.abandonedAtEp ?? Math.min(10, episodeCount)
  );

  // Review fields
  const [stars, setStars] = useState<number>(props.existingReview?.stars ?? 0);
  const [worthCoins, setWorthCoins] = useState<boolean>(
    props.existingReview?.worthCoins ?? true
  );
  const [endingVerdict, setEndingVerdict] = useState<EndingVerdict>(
    props.existingReview?.endingVerdict ?? "satisfying"
  );
  const [fallsApartAtEp, setFallsApartAtEp] = useState<string>(
    props.existingReview?.fallsApartAtEp != null
      ? String(props.existingReview.fallsApartAtEp)
      : ""
  );
  const [oneLiner, setOneLiner] = useState<string>(
    props.existingReview?.oneLiner ?? ""
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Allow deep-linking to open the flow (e.g. the locked-section CTA -> #log).
  useEffect(() => {
    function openFromHash() {
      if (window.location.hash === "#log") {
        if (!isLoggedIn) {
          window.location.assign(`/signin?next=/series/${seriesId}`);
          return;
        }
        setStep(props.existingReview ? "review" : "log");
      }
    }
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    setStep("closed");
    setError(null);
    if (window.location.hash === "#log") {
      history.replaceState(null, "", window.location.pathname);
    }
  }

  async function saveLog(advanceToReview: boolean) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seriesId,
        status,
        platformWatchedOn: platform,
        abandonedAtEp: status === "abandoned" ? abandonedAtEp : null,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't save your log.");
      return;
    }
    router.refresh();
    if (advanceToReview) setStep("review");
    else close();
  }

  async function saveReview() {
    if (stars < 1) {
      setError("Tap a star rating first.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seriesId,
        stars,
        worthCoins,
        endingVerdict,
        fallsApartAtEp: fallsApartAtEp === "" ? null : Number(fallsApartAtEp),
        oneLiner: oneLiner.trim() || null,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't save your review.");
      return;
    }
    close();
    router.refresh();
  }

  // --- Trigger buttons -------------------------------------------------------
  const hasLog = !!props.existingLog;
  const hasReview = !!props.existingReview;

  return (
    <>
      <div id="log" className="scroll-mt-24" />
      <div className="flex gap-2">
        {!isLoggedIn ? (
          <Link href={`/signin?next=/series/${seriesId}`} className="btn-coin flex-1">
            Log this drama
          </Link>
        ) : (
          <>
            <button
              onClick={() => setStep("log")}
              className={`${hasLog ? "btn-ghost" : "btn-coin"} flex-1`}
            >
              {hasLog
                ? `${STATUS_META[props.existingLog!.status].emoji} ${STATUS_META[props.existingLog!.status].label}`
                : "＋ Log this"}
            </button>
            <button
              onClick={() => setStep(hasLog ? "review" : "log")}
              className={`${hasReview ? "btn-ghost" : "btn-primary"} flex-1`}
            >
              {hasReview ? "✏️ Edit review" : "★ Review"}
            </button>
          </>
        )}
      </div>

      {step !== "closed" && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70"
          onClick={close}
        >
          <div
            className="mx-auto w-full max-w-md animate-coin-in rounded-t-3xl border-t border-line bg-bg-soft p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />

            {step === "log" && (
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-lg font-black">Log “{title}”</h2>
                  <p className="text-xs text-ink-faint">Two taps. We&apos;ll be quick.</p>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold">Where are you at?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {LOG_STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-sm ${
                          status === s
                            ? "border-brand bg-brand/15 text-ink"
                            : "border-line bg-bg-card text-ink-soft"
                        }`}
                      >
                        <span className="text-xl">{STATUS_META[s].emoji}</span>
                        {STATUS_META[s].label}
                      </button>
                    ))}
                  </div>
                </div>

                {status === "abandoned" && (
                  <div>
                    <label className="mb-1 flex items-center justify-between text-sm font-semibold">
                      <span>Bailed at episode</span>
                      <span className="tabular-nums text-coin">ep {abandonedAtEp}</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={episodeCount}
                      value={abandonedAtEp}
                      onChange={(e) => setAbandonedAtEp(Number(e.target.value))}
                      className="w-full accent-brand"
                    />
                    <p className="text-[11px] text-ink-faint">
                      Abandoned at ep {abandonedAtEp} of {episodeCount} — we&apos;ve all been there.
                    </p>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-sm font-semibold">Watched on</p>
                  <div className="no-scrollbar flex gap-2 overflow-x-auto">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p}
                        onClick={() => setPlatform(p)}
                        className={`chip ${platform === p ? "chip-active" : ""}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {error && <p className="text-sm text-bad">{error}</p>}

                <div className="flex gap-2">
                  <button
                    onClick={() => saveLog(false)}
                    disabled={busy}
                    className="btn-ghost flex-1"
                  >
                    {busy ? "Saving…" : "Save log"}
                  </button>
                  <button
                    onClick={() => saveLog(true)}
                    disabled={busy}
                    className="btn-coin flex-1"
                  >
                    Save &amp; review →
                  </button>
                </div>
              </div>
            )}

            {step === "review" && (
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-lg font-black">
                    {hasReview ? "Edit your review" : "Review “" + title + "”"}
                  </h2>
                  <p className="text-xs text-ink-faint">
                    {hasReview
                      ? "Update anything you like."
                      : "This is the one that unlocks everything. 🔓"}
                  </p>
                </div>

                <div>
                  <p className="mb-1 text-sm font-semibold">Your rating</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button
                        key={i}
                        onClick={() => setStars(i)}
                        aria-label={`${i} stars`}
                        className="p-1"
                      >
                        <svg width="34" height="34" viewBox="0 0 24 24" fill={i <= stars ? "#ffcc4d" : "none"} stroke={i <= stars ? "#ffcc4d" : "#4a4a5a"} strokeWidth="1.6">
                          <path d="m12 2 2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.8 6 20.5 7.4 13.7 2.3 9l6.9-.7L12 2Z" strokeLinejoin="round" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setWorthCoins((v) => !v)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                    worthCoins ? "border-coin bg-coin/10" : "border-line bg-bg-card"
                  }`}
                >
                  <span className="text-sm font-semibold">Worth your coins? 🪙</span>
                  <span className={`text-sm font-black ${worthCoins ? "text-coin" : "text-ink-faint"}`}>
                    {worthCoins ? "YES" : "NAH"}
                  </span>
                </button>

                <div>
                  <p className="mb-2 text-sm font-semibold">How&apos;s the ending?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ENDING_VERDICTS.map((v) => (
                      <button
                        key={v}
                        onClick={() => setEndingVerdict(v)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                          endingVerdict === v
                            ? "border-brand bg-brand/15 text-ink"
                            : "border-line bg-bg-card text-ink-soft"
                        }`}
                      >
                        <span>{ENDING_VERDICT_EMOJI[v]}</span>
                        {ENDING_VERDICT_LABELS[v]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Falls apart at ep <span className="text-ink-faint">(optional)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={episodeCount}
                    inputMode="numeric"
                    value={fallsApartAtEp}
                    onChange={(e) => setFallsApartAtEp(e.target.value)}
                    placeholder="e.g. 34"
                    className="input"
                  />
                </div>

                <div>
                  <label className="mb-1 flex items-center justify-between text-sm font-semibold">
                    <span>One-liner <span className="text-ink-faint">(optional)</span></span>
                    <span className="text-xs text-ink-faint">{oneLiner.length}/280</span>
                  </label>
                  <textarea
                    value={oneLiner}
                    onChange={(e) => setOneLiner(e.target.value.slice(0, 280))}
                    placeholder="Hot take in one line…"
                    rows={2}
                    className="input resize-none"
                  />
                </div>

                {error && <p className="text-sm text-bad">{error}</p>}

                <div className="flex gap-2">
                  <button onClick={close} className="btn-ghost">
                    Skip
                  </button>
                  <button
                    onClick={saveReview}
                    disabled={busy}
                    className="btn-primary flex-1"
                  >
                    {busy ? "Posting…" : hasReview ? "Update review" : "Post review 🔓"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
