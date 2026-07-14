import { posterGradient, posterInitials } from "@/lib/gradient";

interface Props {
  title: string;
  posterUrl?: string | null;
  className?: string;
  showTitle?: boolean;
}

/**
 * Gradient placeholder poster. We deliberately don't hotlink real posters —
 * every series gets a deterministic colored card with its initials + title.
 */
export function Poster({ title, posterUrl, className = "", showTitle = true }: Props) {
  const g = posterGradient(title);
  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden text-white ${className}`}
      style={
        posterUrl
          ? { backgroundImage: `url(${posterUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { background: g.css }
      }
    >
      {!posterUrl && (
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
    </div>
  );
}
