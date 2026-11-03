/** Mini křivka do seznamu v Progresu (jedna série, bez os). Kreslí se na pozadí guma kvůli kontrastu. */
export function Sparkline({ values, width = 72, height = 28 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <svg width={width} height={height} aria-hidden="true" />;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [2 + (i * (width - 4)) / (values.length - 1), height - 3 - ((v - min) / span) * (height - 6)]);
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} aria-hidden="true">
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#2F6FE4" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={3} fill="#2F6FE4" stroke="#1C2024" strokeWidth={2} />
    </svg>
  );
}
