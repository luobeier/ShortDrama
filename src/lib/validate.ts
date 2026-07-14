// Small validation helpers for API routes.

export function asInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)))
    return Math.trunc(Number(v));
  return null;
}

export function clampEp(
  ep: number | null,
  episodeCount: number
): number | null {
  if (ep == null) return null;
  return Math.max(1, Math.min(ep, episodeCount));
}

export function badRequest(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}
