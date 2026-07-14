import { PLATFORM_ACCENT, isPlatform } from "@/lib/enums";

export function PlatformDot({
  platform,
  withLabel = false,
}: {
  platform: string;
  withLabel?: boolean;
}) {
  const color = isPlatform(platform) ? PLATFORM_ACCENT[platform] : "#7a7a90";
  if (withLabel) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-elevated px-2.5 py-1 text-xs font-medium text-ink-soft">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        {platform}
      </span>
    );
  }
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ background: color }}
      title={platform}
    />
  );
}
