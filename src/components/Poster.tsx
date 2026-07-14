"use client";

import { useEffect, useState } from "react";
import { posterGradient, posterInitials } from "@/lib/gradient";

interface Props {
  title: string;
  posterUrl?: string | null;
  className?: string;
  showTitle?: boolean;
}

/**
 * Poster art. Real posterUrl images (e.g. pasted from a platform's own CDN)
 * are tried first; the gradient placeholder is always rendered underneath so
 * a 404 / hotlink block / CORS failure just reveals the fallback instead of
 * leaving a blank box.
 */
export function Poster({ title, posterUrl, className = "", showTitle = true }: Props) {
  const g = posterGradient(title);
  const [broken, setBroken] = useState(false);
  // Give a new URL a fresh chance to load (e.g. the admin preview while typing).
  useEffect(() => setBroken(false), [posterUrl]);
  const showReal = !!posterUrl && !broken;

  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden text-white ${className}`}
      style={{ background: g.css }}
    >
      {!showReal && (
        <>
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(circle at 25% 20%, rgba(255,255,255,0.5), transparent 45%)",
            }}
          />
          <span className="relative text-2xl font-black tracking-tight drop-shadow">
            {posterInitials(title)}
          </span>
          {showTitle && (
            <span className="relative mt-1 line-clamp-2 px-2 text-center text-[10px] font-semibold leading-tight text-white/85">
              {title}
            </span>
          )}
        </>
      )}
      {posterUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={posterUrl}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover ${broken ? "hidden" : ""}`}
          onError={() => setBroken(true)}
        />
      )}
    </div>
  );
}
