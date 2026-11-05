'use client';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtNum } from '@/domain/format';
import { shortDate } from '@/domain/dates';

export interface Point { date: string; value: number; detail?: string }

const INK = '#F2F4F1', MUTED = '#9AA3AB', GRID = '#1B1F24', DATA = '#3B7BFF';

/**
 * Jedna série v čase: čára 2 px, body ≥ 8 px (jeden bod = jeden trénink), tiché osy a mřížka,
 * volitelně tichá linka výchozího stavu a rekordu. Tooltip na dotyk s datem a nejlepší sérií.
 */
export function TimeChart({ points, unit, baseline, record, label }: {
  points: Point[]; unit: string; baseline?: { value: number; label: string }; record?: { value: number; label: string }; label: string;
}) {
  const values = points.map((p) => p.value);
  const lo = Math.min(...values, baseline?.value ?? Infinity);
  const hi = Math.max(...values, record?.value ?? -Infinity);
  const pad = Math.max(2, (hi - lo) * 0.12);
  return (
    <figure className="m-0" aria-label={label}>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 16, right: 12, bottom: 4, left: -8 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: MUTED, fontSize: 13 }} axisLine={{ stroke: GRID }} tickLine={false} minTickGap={24} />
            <YAxis domain={[Math.floor(lo - pad), Math.ceil(hi + pad)]} tickFormatter={(v) => fmtNum(v, 0)} tick={{ fill: MUTED, fontSize: 13 }} axisLine={false} tickLine={false} width={44} />
            {baseline && <ReferenceLine y={baseline.value} stroke={MUTED} strokeDasharray="4 4" label={{ value: baseline.label, position: 'insideBottomLeft', fill: MUTED, fontSize: 12 }} />}
            {record && <ReferenceLine y={record.value} stroke={GRID} label={{ value: record.label, position: 'insideTopLeft', fill: INK, fontSize: 12 }} />}
            <Tooltip
              cursor={{ stroke: MUTED, strokeWidth: 1 }}
              contentStyle={{ background: '#1B1F24', border: '1px solid #323A42', borderRadius: 12, color: INK }}
              labelStyle={{ color: MUTED }}
              labelFormatter={(d) => shortDate(String(d))}
              formatter={(v, _n, item) => [`${fmtNum(Number(v), 1)} ${unit}${(item.payload as Point).detail ? ` · ${(item.payload as Point).detail}` : ''}`, '']}
              separator=""
            />
            <Line type="monotone" dataKey="value" stroke={DATA} strokeWidth={2} isAnimationActive={false}
              dot={{ r: 5, fill: DATA, stroke: '#111418', strokeWidth: 2 }} activeDot={{ r: 7, fill: DATA, stroke: INK, strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
