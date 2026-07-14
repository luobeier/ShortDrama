"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PLATFORMS, SERIES_STATUSES } from "@/lib/enums";

interface AdminSeries {
  id: string;
  canonicalTitle: string;
  episodeCount: number;
  status: string;
  synopsis: string;
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

type Tab = "series" | "merge" | "tropes";

export function AdminClient({
  series,
  tropes,
}: {
  series: AdminSeries[];
  tropes: AdminTrope[];
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
        {(["series", "merge", "tropes"] as Tab[]).map((t) => (
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
      setTropeIds([]);
      return;
    }
    setEditingId(s.id);
    setTitle(s.canonicalTitle);
    setSynopsis(s.synopsis);
    setEps(String(s.episodeCount));
    setStatus(s.status);
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
