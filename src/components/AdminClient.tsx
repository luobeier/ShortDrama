"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PLATFORMS, SERIES_STATUSES } from "@/lib/enums";
import { Poster } from "./Poster";

interface AdminSeries {
  id: string;
  canonicalTitle: string;
  episodeCount: number;
  status: string;
  synopsis: string;
  posterUrl: string | null;
  tropeIds: string[];
  logs: number;
  reviews: number;
  aliases: number;
}
interface AdminTrope {
  id: string;
  name: string;
  slug: string;
}

interface AdminReport {
  id: string;
  reason: string | null;
  createdAt: string;
  reporterHandle: string | null;
  reviewId: string;
  stars: number;
  oneLiner: string | null;
  authorId: string;
  authorHandle: string | null;
  authorBanned: boolean;
  seriesId: string;
  seriesTitle: string;
}

interface AdminTitleRequest {
  id: string;
  title: string;
  platform: string | null;
  note: string | null;
  requesterHandle: string | null;
  createdAt: string;
}

type Tab = "series" | "merge" | "tropes" | "import" | "mods";

export function AdminClient({
  series,
  tropes,
  reports,
  titleRequests,
}: {
  series: AdminSeries[];
  tropes: AdminTrope[];
  reports: AdminReport[];
  titleRequests: AdminTitleRequest[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("series");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(payload: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(`⚠ ${data.error ?? "Failed."}`);
      return false;
    }
    setMsg("✓ Saved.");
    router.refresh();
    return true;
  }

  return (
    <div className="px-4">
      <div className="mb-4 flex gap-2">
        {(["series", "merge", "tropes", "import", "mods"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`chip ${tab === t ? "chip-active" : ""}`}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {msg && (
        <p className={`mb-3 text-sm ${msg.startsWith("✓") ? "text-good" : "text-bad"}`}>
          {msg}
        </p>
      )}

      {tab === "series" && (
        <SeriesTab series={series} tropes={tropes} call={call} busy={busy} />
      )}
      {tab === "merge" && <MergeTab series={series} call={call} busy={busy} />}
      {tab === "tropes" && <TropesTab tropes={tropes} call={call} busy={busy} />}
      {tab === "import" && <ImportTab />}
      {tab === "mods" && (
        <ModsTab
          reports={reports}
          titleRequests={titleRequests}
          call={call}
          busy={busy}
        />
      )}
    </div>
  );
}

function TropeMultiSelect({
  tropes,
  selected,
  onToggle,
}: {
  tropes: AdminTrope[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-line bg-bg-soft p-2">
      {tropes.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onToggle(t.id)}
          className={`chip text-xs ${selected.includes(t.id) ? "chip-active" : ""}`}
        >
          {t.name}
        </button>
      ))}
    </div>
  );
}

function SeriesTab({
  series,
  tropes,
  call,
  busy,
}: {
  series: AdminSeries[];
  tropes: AdminTrope[];
  call: (p: Record<string, unknown>) => Promise<boolean>;
  busy: boolean;
}) {
  const [editingId, setEditingId] = useState<string | "new">("new");
  const editing = editingId === "new" ? null : series.find((s) => s.id === editingId);

  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [eps, setEps] = useState("60");
  const [status, setStatus] = useState<string>("ongoing");
  const [posterUrl, setPosterUrl] = useState("");
  const [tropeIds, setTropeIds] = useState<string[]>([]);

  const [aliasTitle, setAliasTitle] = useState("");
  const [aliasPlatform, setAliasPlatform] = useState<string>("ReelShort");

  function loadForEdit(s: AdminSeries | null) {
    if (!s) {
      setEditingId("new");
      setTitle("");
      setSynopsis("");
      setEps("60");
      setStatus("ongoing");
      setPosterUrl("");
      setTropeIds([]);
      return;
    }
    setEditingId(s.id);
    setTitle(s.canonicalTitle);
    setSynopsis(s.synopsis);
    setEps(String(s.episodeCount));
    setStatus(s.status);
    setPosterUrl(s.posterUrl ?? "");
    setTropeIds(s.tropeIds);
  }

  const toggle = (id: string) =>
    setTropeIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );

  async function save() {
    const payload = {
      action: editing ? "updateSeries" : "createSeries",
      id: editing?.id,
      canonicalTitle: title,
      synopsis,
      episodeCount: Number(eps),
      status,
      posterUrl,
      tropeIds,
    };
    const ok = await call(payload);
    if (ok && !editing) loadForEdit(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <select
        value={editingId}
        onChange={(e) =>
          loadForEdit(e.target.value === "new" ? null : series.find((s) => s.id === e.target.value) ?? null)
        }
        className="input"
      >
        <option value="new">＋ New series…</option>
        {series.map((s) => (
          <option key={s.id} value={s.id}>
            {s.canonicalTitle}
          </option>
        ))}
      </select>

      <div className="card flex flex-col gap-3 p-4">
        <input className="input" placeholder="Canonical title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input resize-none" rows={3} placeholder="Synopsis" value={synopsis} onChange={(e) => setSynopsis(e.target.value)} />
        <div className="flex gap-2">
          <input className="input" type="number" min={1} placeholder="Episodes" value={eps} onChange={(e) => setEps(e.target.value)} />
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {SERIES_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-ink-soft">
            Poster URL <span className="font-normal text-ink-faint">(optional — leave blank for the auto gradient card)</span>
          </p>
          <div className="flex gap-3">
            <input
              className="input flex-1"
              placeholder="https://…"
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
            />
            <Poster
              title={title || "?"}
              posterUrl={posterUrl || null}
              showTitle={false}
              className="h-[52px] w-[38px] shrink-0 rounded-lg border border-line"
            />
          </div>
          <p className="mt-1 text-[11px] text-ink-faint">
            Only use art you have rights to use — an official image URL you found
            while browsing the platform, or your own upload host. Broken/blocked
            links fall back to the gradient card automatically.
          </p>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-ink-soft">Tropes</p>
          <TropeMultiSelect tropes={tropes} selected={tropeIds} onToggle={toggle} />
        </div>
        <button onClick={save} disabled={busy} className="btn-primary">
          {editing ? "Update series" : "Create series"}
        </button>
      </div>

      {editing && (
        <div className="card flex flex-col gap-2 p-4">
          <p className="text-sm font-bold">Add alias to “{editing.canonicalTitle}”</p>
          <input className="input" placeholder="Alias title" value={aliasTitle} onChange={(e) => setAliasTitle(e.target.value)} />
          <select className="input" value={aliasPlatform} onChange={(e) => setAliasPlatform(e.target.value)}>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <button
            onClick={async () => {
              const ok = await call({
                action: "addAlias",
                seriesId: editing.id,
                aliasTitle,
                platform: aliasPlatform,
              });
              if (ok) setAliasTitle("");
            }}
            disabled={busy || !aliasTitle.trim()}
            className="btn-ghost"
          >
            Add alias
          </button>
          <p className="text-xs text-ink-faint">
            {editing.logs} logs · {editing.reviews} reviews · {editing.aliases} aliases
          </p>
        </div>
      )}
    </div>
  );
}

function MergeTab({
  series,
  call,
  busy,
}: {
  series: AdminSeries[];
  call: (p: Record<string, unknown>) => Promise<boolean>;
  busy: boolean;
}) {
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");

  return (
    <div className="card flex flex-col gap-3 p-4">
      <p className="text-sm text-ink-soft">
        Merge folds the <b>source</b> into the <b>target</b>: aliases, logs, reviews and
        tropes move over (per-user duplicates are dropped), then the source is deleted.
        The source&apos;s title is kept as an alias.
      </p>
      <label className="text-xs font-semibold text-ink-soft">Source (will be removed)</label>
      <select className="input" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
        <option value="">Select source…</option>
        {series.map((s) => (
          <option key={s.id} value={s.id}>
            {s.canonicalTitle}
          </option>
        ))}
      </select>
      <label className="text-xs font-semibold text-ink-soft">Target (kept)</label>
      <select className="input" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
        <option value="">Select target…</option>
        {series.map((s) => (
          <option key={s.id} value={s.id}>
            {s.canonicalTitle}
          </option>
        ))}
      </select>
      <button
        onClick={() => {
          if (confirm("Merge these two series? This can't be undone.")) {
            call({ action: "mergeSeries", sourceId, targetId }).then((ok) => {
              if (ok) {
                setSourceId("");
                setTargetId("");
              }
            });
          }
        }}
        disabled={busy || !sourceId || !targetId || sourceId === targetId}
        className="btn-primary"
      >
        Merge series
      </button>
    </div>
  );
}

function TropesTab({
  tropes,
  call,
  busy,
}: {
  tropes: AdminTrope[];
  call: (p: Record<string, unknown>) => Promise<boolean>;
  busy: boolean;
}) {
  const [name, setName] = useState("");
  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-2 p-4">
        <p className="text-sm font-bold">New trope</p>
        <input className="input" placeholder="Trope name (e.g. Boss-Secretary)" value={name} onChange={(e) => setName(e.target.value)} />
        <button
          onClick={async () => {
            const ok = await call({ action: "createTrope", name });
            if (ok) setName("");
          }}
          disabled={busy || !name.trim()}
          className="btn-primary"
        >
          Create trope
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tropes.map((t) => (
          <span key={t.id} className="chip text-xs">
            {t.name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---- Bulk import ------------------------------------------------------------

interface ImportRowResult {
  index: number;
  title: string;
  action: "create" | "update" | "error";
  matchedBy?: "canonicalTitle" | "alias";
  newAliases: number;
  newTropes: string[];
  warnings: string[];
  error?: string;
  applied?: boolean;
}

interface ImportResponse {
  mode: "preview" | "commit";
  summary: {
    total: number;
    creates: number;
    updates: number;
    errors: number;
    aliasesAdded: number;
    newTropes: string[];
    applied?: number;
    failed?: number;
  };
  results: ImportRowResult[];
}

const IMPORT_EXAMPLE = `[
  {
    "canonicalTitle": "Example Series",
    "synopsis": "One or two sentences.",
    "episodeCount": 70,
    "status": "ongoing",
    "aliases": [
      { "aliasTitle": "Example on ReelShort", "platform": "ReelShort", "url": "https://…" }
    ],
    "tropes": ["revenge", "billionaire-ceo"]
  }
]`;

function ImportTab() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"idle" | "validating" | "importing">("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportResponse | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [committed, setCommitted] = useState<ImportResponse | null>(null);

  async function post(payload: Record<string, unknown>) {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  }

  function parseRows(): unknown | null {
    try {
      return JSON.parse(text);
    } catch (e) {
      setError(`Not valid JSON: ${e instanceof Error ? e.message : "parse failed"}`);
      return null;
    }
  }

  async function validate() {
    setError(null);
    setCommitted(null);
    setPreview(null);
    const rows = parseRows();
    if (rows === null) return;
    setPhase("validating");
    const { ok, data } = await post({ action: "previewImport", rows });
    setPhase("idle");
    if (!ok) {
      setError(data.error ?? "Validation failed.");
      return;
    }
    setPreview(data as ImportResponse);
    setSnapshot(text);
  }

  async function doImport() {
    setError(null);
    const rows = parseRows();
    if (rows === null) return;
    setPhase("importing");
    const { ok, data } = await post({ action: "commitImport", rows });
    setPhase("idle");
    if (!ok) {
      setError(data.error ?? "Import failed.");
      return;
    }
    setCommitted(data as ImportResponse);
    setPreview(null);
    router.refresh();
  }

  const stale = preview !== null && snapshot !== text;
  const importableRows = preview ? preview.summary.creates + preview.summary.updates : 0;
  const shown = committed ?? (stale ? null : preview);

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3 p-4">
        <p className="text-sm font-bold">Bulk import</p>
        <p className="text-xs text-ink-soft">
          Paste a JSON array of series. Existing series are matched by title{" "}
          <i>and</i> alias (case-insensitive) and updated — aliases and tropes are
          added, never removed. Unknown tropes are created.
        </p>
        <details className="text-xs text-ink-faint">
          <summary className="cursor-pointer">Row format</summary>
          <pre className="mt-2 overflow-x-auto rounded-xl border border-line bg-bg-soft p-3">
            {IMPORT_EXAMPLE}
          </pre>
        </details>
        <textarea
          className="input resize-y font-mono text-xs"
          rows={10}
          placeholder='[ { "canonicalTitle": "…", … } ]'
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            onClick={validate}
            disabled={phase !== "idle" || !text.trim()}
            className="btn-ghost flex-1"
          >
            {phase === "validating" ? "Validating…" : "Validate"}
          </button>
          <button
            onClick={doImport}
            disabled={phase !== "idle" || !preview || stale || importableRows === 0}
            className="btn-primary flex-1"
          >
            {phase === "importing"
              ? "Importing…"
              : preview && !stale
                ? `Import ${importableRows} row${importableRows === 1 ? "" : "s"}`
                : "Import"}
          </button>
        </div>
        {stale && (
          <p className="text-xs text-warn">Payload changed since validation — validate again.</p>
        )}
        {error && <p className="text-sm text-bad">⚠ {error}</p>}
      </div>

      {shown && (
        <div className="card flex flex-col gap-2 p-4">
          <p className="text-sm font-bold">
            {shown.mode === "commit" ? "Import results" : "Preview — nothing written yet"}
          </p>
          <p className="text-xs text-ink-soft">
            {shown.summary.creates} create · {shown.summary.updates} update ·{" "}
            {shown.summary.errors} error · +{shown.summary.aliasesAdded} aliases
            {shown.mode === "commit" &&
              ` · ${shown.summary.applied ?? 0} applied, ${shown.summary.failed ?? 0} failed`}
          </p>
          {shown.summary.newTropes.length > 0 && (
            <p className="text-xs text-warn">
              New tropes {shown.mode === "commit" ? "created" : "to create"}:{" "}
              {shown.summary.newTropes.join(", ")}
            </p>
          )}
          <ul className="flex flex-col gap-1.5">
            {shown.results.map((r) => (
              <li key={r.index} className="rounded-xl border border-line bg-bg-soft px-3 py-2 text-xs">
                <span
                  className={`mr-2 font-bold uppercase ${
                    r.action === "create"
                      ? "text-good"
                      : r.action === "update"
                        ? "text-coin"
                        : "text-bad"
                  }`}
                >
                  {r.action}
                  {r.applied === false && " ✗"}
                </span>
                <span className="font-semibold">{r.title}</span>
                {r.matchedBy === "alias" && <span className="text-ink-faint"> (via alias)</span>}
                {r.newAliases > 0 && <span className="text-ink-soft"> · +{r.newAliases} alias{r.newAliases === 1 ? "" : "es"}</span>}
                {r.newTropes.length > 0 && (
                  <span className="text-warn"> · new tropes: {r.newTropes.join(", ")}</span>
                )}
                {r.error && <p className="mt-1 text-bad">{r.error}</p>}
                {r.warnings.map((w, i) => (
                  <p key={i} className="mt-1 text-ink-faint">
                    {w}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}

      <PurgeDangerZone />
    </div>
  );
}

function ModsTab({
  reports,
  titleRequests,
  call,
  busy,
}: {
  reports: AdminReport[];
  titleRequests: AdminTitleRequest[];
  call: (p: Record<string, unknown>) => Promise<boolean>;
  busy: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* Title requests from the search dead-end */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold">
          📥 Title requests <span className="text-ink-faint">{titleRequests.length}</span>
        </p>
        {titleRequests.length === 0 ? (
          <p className="text-xs text-ink-faint">None open — the catalog is keeping up.</p>
        ) : (
          titleRequests.map((t) => (
            <div key={t.id} className="card flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{t.title}</p>
                <p className="text-xs text-ink-faint">
                  {t.platform ? `${t.platform} · ` : ""}requested by @
                  {t.requesterHandle ?? "anon"}
                  {t.note ? ` — “${t.note}”` : ""}
                </p>
              </div>
              <button
                onClick={() => call({ action: "dismissTitleRequest", requestId: t.id })}
                disabled={busy}
                className="btn-ghost shrink-0 px-3 py-1.5 text-xs"
                title="Dismiss (add the series first via the Series or Import tab)"
              >
                Done
              </button>
            </div>
          ))
        )}
      </div>

      <ReportsQueue reports={reports} call={call} busy={busy} />
    </div>
  );
}

function ReportsQueue({
  reports,
  call,
  busy,
}: {
  reports: AdminReport[];
  call: (p: Record<string, unknown>) => Promise<boolean>;
  busy: boolean;
}) {
  if (reports.length === 0) {
    return (
      <div className="card p-6 text-center text-sm text-ink-soft">
        🧹 No open reports. The community is behaving (for now).
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-ink-faint">
        {reports.length} open report{reports.length === 1 ? "" : "s"} — dismiss,
        delete the review, or ban the author (removes all their activity from
        scores and hides their reviews).
      </p>
      {reports.map((r) => (
        <div key={r.id} className="card flex flex-col gap-2 p-3.5">
          <p className="text-xs text-ink-faint">
            @{r.reporterHandle ?? "anon"} flagged{" "}
            <b className="text-ink-soft">@{r.authorHandle ?? "anon"}</b>
            {r.authorBanned && (
              <span className="ml-1 rounded-full bg-bad/20 px-2 py-0.5 text-[10px] font-bold text-bad">
                banned
              </span>
            )}{" "}
            on <b className="text-ink-soft">{r.seriesTitle}</b>
          </p>
          <p className="text-sm">
            <span className="text-coin">{"★".repeat(r.stars)}</span>
            {r.oneLiner ? ` “${r.oneLiner}”` : " (no one-liner)"}
          </p>
          {r.reason && <p className="text-xs text-warn">Reason: {r.reason}</p>}
          <div className="mt-1 flex flex-wrap gap-2">
            <button
              onClick={() => call({ action: "dismissReport", reportId: r.id })}
              disabled={busy}
              className="btn-ghost px-3 py-1.5 text-xs"
            >
              Dismiss
            </button>
            <button
              onClick={() => {
                if (confirm("Delete this review? This can't be undone.")) {
                  call({ action: "deleteReview", reviewId: r.reviewId });
                }
              }}
              disabled={busy}
              className="btn-ghost px-3 py-1.5 text-xs text-warn"
            >
              Delete review
            </button>
            <button
              onClick={() => {
                const verb = r.authorBanned ? "Unban" : "Ban";
                if (confirm(`${verb} @${r.authorHandle ?? "anon"}?`)) {
                  call({
                    action: "setUserBan",
                    userId: r.authorId,
                    banned: !r.authorBanned,
                  });
                }
              }}
              disabled={busy}
              className={`btn-ghost px-3 py-1.5 text-xs ${r.authorBanned ? "text-good" : "text-bad"}`}
            >
              {r.authorBanned ? "Unban author" : "Ban author"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const PURGE_PHRASE = "PURGE SEED DATA";

function PurgeDangerZone() {
  const router = useRouter();
  const [syntheticUsers, setSyntheticUsers] = useState(true);
  const [seedSeries, setSeedSeries] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function purge() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "purgeSeedData",
        confirm: confirmText,
        syntheticUsers,
        seedSeries,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(`⚠ ${data.error ?? "Purge failed."}`);
      return;
    }
    setMsg(`✓ Deleted ${data.usersDeleted} synthetic users and ${data.seriesDeleted} placeholder series.`);
    setConfirmText("");
    router.refresh();
  }

  return (
    <details className="rounded-2xl border border-bad/50 bg-bad/5 p-4">
      <summary className="cursor-pointer text-sm font-bold text-bad">
        Danger zone — purge placeholder data
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        <p className="text-xs text-ink-soft">
          One-time pre-launch cleanup. Deleting the placeholder series also deletes{" "}
          <b>every</b> log and review on them — including any left by real accounts.
          Tropes are never deleted. This can&apos;t be undone (dev fallback:{" "}
          <code>npm run db:reset</code> restores the seed).
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={syntheticUsers}
            onChange={(e) => setSyntheticUsers(e.target.checked)}
          />
          Synthetic reviewer accounts (@seed.dramascore.app) + their logs/reviews
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={seedSeries}
            onChange={(e) => setSeedSeries(e.target.checked)}
          />
          The 30 placeholder series (matched by exact seed title)
        </label>
        <input
          className="input"
          placeholder={`Type "${PURGE_PHRASE}" to confirm`}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
        />
        <button
          onClick={purge}
          disabled={busy || confirmText !== PURGE_PHRASE || (!syntheticUsers && !seedSeries)}
          className="btn bg-bad text-white"
        >
          {busy ? "Purging…" : "Purge selected"}
        </button>
        {msg && (
          <p className={`text-sm ${msg.startsWith("✓") ? "text-good" : "text-bad"}`}>{msg}</p>
        )}
      </div>
    </details>
  );
}
