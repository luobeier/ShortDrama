"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RemoveFromListButton({
  listId,
  seriesId,
}: {
  listId: string;
  seriesId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        setBusy(true);
        await fetch("/api/lists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "removeItem", listId, seriesId }),
        }).catch(() => null);
        setBusy(false);
        router.refresh();
      }}
      disabled={busy}
      className="shrink-0 text-xs text-ink-faint hover:text-bad"
      title="Remove from list"
    >
      {busy ? "…" : "✕"}
    </button>
  );
}

export function DeleteListButton({ listId }: { listId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        if (!confirm("Delete this list? The series stay; the list goes.")) return;
        setBusy(true);
        const res = await fetch("/api/lists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "deleteList", listId }),
        }).catch(() => null);
        setBusy(false);
        if (res?.ok) router.push("/diary");
      }}
      disabled={busy}
      className="text-xs text-bad/80 hover:text-bad"
    >
      {busy ? "…" : "Delete list"}
    </button>
  );
}
