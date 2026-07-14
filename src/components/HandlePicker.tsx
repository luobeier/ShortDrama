"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const SUGGESTIONS = ["coinGoblin", "nightBinger", "tropeHoarder", "ep47andCrying", "cliffhangerVictim"];

export function HandlePicker() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(value: string) {
    setError(null);
    setLoading(true);
    const res = await fetch("/api/handle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: value }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    // Full reload so the session token picks up the new handle.
    window.location.assign("/");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center rounded-xl border border-line bg-bg-soft focus-within:border-brand">
        <span className="pl-4 text-ink-faint">@</span>
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value.replace(/\s/g, ""))}
          placeholder="yourhandle"
          maxLength={20}
          className="w-full bg-transparent px-2 py-3 text-base outline-none"
          autoCapitalize="none"
          autoCorrect="off"
        />
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
      <button
        onClick={() => submit(handle)}
        disabled={loading || handle.length < 3}
        className="btn-primary w-full"
      >
        {loading ? "Claiming…" : "Claim handle"}
      </button>

      <div className="mt-2">
        <p className="mb-2 text-xs text-ink-faint">Need inspiration?</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setHandle(s)}
              className="chip"
              type="button"
            >
              @{s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
