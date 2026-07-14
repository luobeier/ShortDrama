export function Stars({
  value,
  size = 16,
}: {
  value: number;
  size?: number;
}) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={i <= full ? "#ffcc4d" : "none"}
          stroke={i <= full ? "#ffcc4d" : "#4a4a5a"}
          strokeWidth={1.6}
        >
          <path d="m12 2 2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.8 6 20.5 7.4 13.7 2.3 9l6.9-.7L12 2Z" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}
