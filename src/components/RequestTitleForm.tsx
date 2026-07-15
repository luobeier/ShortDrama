"use client";

import { useState } from "react";
import { PLATFORMS } from "@/lib/enums";

/** The search dead-end turns into catalog growth: "can't find it? request it." */
export function RequestTitleForm({
  prefillTitle,
  isLoggedIn,
}: {
  prefillTitle: string;
  isLoggedIn: boolean;
}) {
  const [title, setTitle] = useState(prefillTitle);
  const [platform, setPlatform] = useState<string>("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    if (!isLoggedIn) {
      window.location.assign(`/signin?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    setState("busy");
    const res = await fetch("/api/request-title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, platform: platform || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setState("done");
    } else {
      setState("error");
      setMsg(data.error ?? "Couldn't send that — try again.");
    }
  }

  if (state === "done") {
    return (
      <div className="card p-4 text-sm text-good">
        ✓ Requested! We&apos;ll get “{title.trim()}” into the catalog.
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-2.5 p-4">
      <p className="text-sm font-bold">Can&apos;t find it? Request it 👇</p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, 120))}
        placeholder="Exact title as the app shows it"
        className="input"
      />
      <select
        value={platform}
        onChange={(e) => setPlatform(e.target.value)}
        className="input"
      >
        <option value="">Where did you see it? (optional)</option>
        {PLATFORMS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      {msg && <p className="text-xs text-bad">{msg}</p>}
      <button
        onClick={submit}
        disabled={state === "busy" || !title.trim()}
        className="btn-primary"
      >
        {state === "busy" ? "Sending…" : isLoggedIn ? "Request this title" : "Sign in to request"}
      </button>
    </div>
  );
}
