import Link from "next/link";

export function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2">
      <span
        className="flex items-center justify-center rounded-full font-black text-black"
        style={{
          width: size === "sm" ? 26 : 30,
          height: size === "sm" ? 26 : 30,
          background: "radial-gradient(circle at 35% 30%, #ffe08a, #f5a623 65%, #d98c0f)",
          boxShadow: "0 2px 0 0 #8a5a00",
        }}
      >
        D
      </span>
      <span className={`font-black tracking-tight ${size === "sm" ? "text-lg" : "text-xl"}`}>
        Drama<span className="text-coin">Score</span>
      </span>
    </Link>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-5">
      <div>
        <h1 className="text-2xl font-black tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
