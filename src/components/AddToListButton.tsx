"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export interface MyListOption {
  id: string;
  title: string;
  has: boolean;
}

/** "Save to list" — toggle membership in your lists, or start a new one. */
export function AddToListButton({
  seriesId,
  lists,
  isLoggedIn,
}: {
  seriesId: string;
  lists: MyListOption[];
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(lists);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const savedCount = local.filter((l) => l.has).length;

  if (!isLoggedIn) {
    return (
      <Link href="#" onClick={(e) => { e.preventDefault(); window.location.assign(`/signin?next=${window.location.pathname}`); }} className="btn-ghost px-3.5 py-2 text-sm">
        ➕ Save to list
      </Link>
    );
  }

  async function post(payload: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    return res.ok ? res.json() : null;
  }

  async function toggle(list: MyListOption) {
    const ok = await post({
      action: list.has ? "removeItem" : "addItem",
      listId: list.id,
      seriesId,
    });
    if (ok) {
      setLocal((cur) =>
        cur.map((l) => (l.id === list.id ? { ...l, has: !l.has } : l))
      );
      router.refresh();
    }
  }

  async function createList() {
    const title = newTitle.trim();
    if (!title) return;
    const data = await post({ action: "createList", title, seriesId });
    if (data?.id) {
      setLocal((cur) => [...cur, { id: data.id, title, has: true }]);
      setNewTitle("");
      router.refresh();
    }
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="btn-ghost px-3.5 py-2 text-sm">
        {savedCount > 0 ? `✔ In ${savedCount} list${savedCount === 1 ? "" : "s"}` : "➕ Save to list"}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-40 mt-2 w-64 rounded-2xl border border-line bg-bg-elevated p-2 shadow-card">
            {local.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-ink-faint">No lists yet — make one:</p>
            )}
            {local.map((l) => (
              <button
                key={l.id}
                onClick={() => toggle(l)}
                disabled={busy}
                className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-sm hover:bg-bg-card"
              >
                <span className="truncate">{l.title}</span>
                <span className={l.has ? "text-good" : "text-ink-faint"}>
                  {l.has ? "✔" : "+"}
                </span>
              </button>
            ))}
            <div className="mt-1 flex gap-1.5 border-t border-line pt-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createList()}
                placeholder="New list name…"
                className="input flex-1 px-2.5 py-1.5 text-xs"
              />
              <button
                onClick={createList}
                disabled={busy || !newTitle.trim()}
                className="btn-primary px-3 py-1.5 text-xs"
              >
                Add
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
