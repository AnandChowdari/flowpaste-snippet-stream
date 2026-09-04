/** Illustrative QR placeholder — deterministic pattern from the order reference. */
export function QrPlaceholder({ seed }: { seed: string }) {
  const size = 21;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };

  const isFinder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);

  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (isFinder(x, y)) continue;
      if (rand() > 0.52) cells.push({ x, y });
    }
  }

  const finder = (fx: number, fy: number) => (
    <g key={`${fx}-${fy}`}>
      <rect x={fx} y={fy} width="7" height="7" rx="1.6" fill="currentColor" />
      <rect x={fx + 1} y={fy + 1} width="5" height="5" rx="1.1" fill="var(--color-card)" />
      <rect x={fx + 2} y={fy + 2} width="3" height="3" rx="0.7" fill="currentColor" />
    </g>
  );

  return (
    <svg
      viewBox={`-1 -1 ${size + 2} ${size + 2}`}
      role="img"
      aria-label="Payment QR code placeholder"
      className="h-full w-full text-foreground"
    >
      <rect x="-1" y="-1" width={size + 2} height={size + 2} fill="var(--color-card)" />
      {finder(0, 0)}
      {finder(size - 7, 0)}
      {finder(0, size - 7)}
      {cells.map((c) => (
        <rect
          key={`${c.x}-${c.y}`}
          x={c.x}
          y={c.y}
          width="1"
          height="1"
          rx="0.22"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
