/** Ikona appky: soutěžní kotouč na gumové podlaze (pro ImageResponse, bez textu). */
export function IconArt({ size }: { size: number }) {
  const u = size / 100;
  return (
    <div style={{ width: size, height: size, background: '#1C2024', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 76 * u, height: 76 * u, borderRadius: '50%', background: '#2F6FE4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 52 * u, height: 52 * u, borderRadius: '50%', border: `${4 * u}px solid #1F55C8`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 18 * u, height: 18 * u, borderRadius: '50%', background: '#F2F4F1' }} />
        </div>
      </div>
    </div>
  );
}
