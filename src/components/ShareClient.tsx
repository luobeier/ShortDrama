"use client";

import { useState } from "react";

export function ShareClient({ handle }: { handle: string }) {
  const [busy, setBusy] = useState<null | "download" | "share">(null);
  const [note, setNote] = useState<string | null>(null);
  // Cache-bust so edits to the diary reflect on regenerate.
  const src = `/api/share?ts=${Math.floor(Date.now() / 1000)}`;

  async function getBlob(): Promise<Blob> {
    const res = await fetch(src);
    if (!res.ok) throw new Error("Couldn't build the image.");
    return res.blob();
  }

  async function download() {
    setBusy("download");
    setNote(null);
    try {
      const blob = await getBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dramascore-wrapped-${handle}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setNote("Download failed — try again.");
    } finally {
      setBusy(null);
    }
  }

  async function nativeShare() {
    setBusy("share");
    setNote(null);
    try {
      const blob = await getBlob();
      const file = new File([blob], `dramascore-wrapped-${handle}.png`, {
        type: "image/png",
      });
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
      };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "My DramaScore Wrapped",
          text: "My short-drama year, wrapped 🎁🪙",
        });
      } else {
        setNote("Sharing isn't supported here — use Download instead.");
      }
    } catch (e) {
      // User canceling the share sheet throws AbortError; ignore it.
      if ((e as Error)?.name !== "AbortError") {
        setNote("Share failed — try Download.");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-2xl border border-line shadow-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Your DramaScore Wrapped card"
          className="aspect-[9/16] w-full bg-bg-soft object-cover"
        />
      </div>

      {note && <p className="mt-3 text-center text-sm text-warn">{note}</p>}

      <div className="mt-5 flex gap-2">
        <button onClick={download} disabled={busy !== null} className="btn-ghost flex-1">
          {busy === "download" ? "Building…" : "⬇ Download"}
        </button>
        <button onClick={nativeShare} disabled={busy !== null} className="btn-primary flex-1">
          {busy === "share" ? "Opening…" : "Share"}
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-ink-faint">
        1080×1920 · perfect for stories. Regenerates from your latest diary.
      </p>
    </div>
  );
}
