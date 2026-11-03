import type { Metadata } from 'next';
import { getDb } from '@/server/db';
import { fmtKg } from '@/domain/format';
import { dayLabel } from '@/domain/dates';
import { t } from '@/i18n/t';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

interface Shared {
  session: { started_at: string; ended_at: string | null; with_coach: boolean; note: string | null };
  athlete: string | null;
  workout: string | null;
  sets: { exercise_id: string; name: string; number: number; reps: number | null; weight_kg: number | null; time_s: number | null; skipped: boolean; extra: boolean; planned_reps: number | null; planned_weight_kg: number | null; planned_time_s: number | null }[];
  notes: { exercise_id: string | null; text: string }[];
}

/** E1: sdílené shrnutí tréninku bez přihlášení. Čte jen přes get_shared_session (role anon). */
export default async function SharedSession({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await getDb();
  const [row] = await db.asUser(null, (tx) => tx.query<{ r: Shared | null }>(`select get_shared_session($1) r`, [token]));
  const data = row?.r;
  if (!data) return <main className="mx-auto max-w-[480px] p-6"><p className="text-[18px] text-ocel">{t('share.nenalezeno')}</p></main>;

  const groups: { id: string; name: string; sets: Shared['sets'] }[] = [];
  for (const s of data.sets) {
    const g = groups.find((x) => x.id === s.exercise_id);
    if (g) g.sets.push(s); else groups.push({ id: s.exercise_id, name: s.name, sets: [s] });
  }
  const val = (w: number | null, r: number | null, ts: number | null) => (ts != null && r == null ? `${ts} s` : w ? `${fmtKg(Number(w))} × ${r ?? '–'}` : `${r ?? '–'}×`);
  const minutes = data.session.ended_at ? Math.round((+new Date(data.session.ended_at) - +new Date(data.session.started_at)) / 60000) : null;

  return (
    <main className="mx-auto max-w-[480px] px-4 py-6">
      <p className="text-[15px] text-ocel">{t('app.name')}</p>
      <h1 className="font-display text-[44px] font-bold leading-none">{data.workout ? t('share.nadpis', { label: data.workout }) : t('summary.hotovyBezPlanu')}</h1>
      <p className="mt-1 text-[17px] text-ocel">{t('share.kdo', { name: data.athlete || '', date: dayLabel(data.session.started_at) })}{minutes != null ? ` · ${minutes} ${t('common.min')}` : ''}{data.session.with_coach ? ` · ${t('summary.sTrenerem')}` : ''}</p>
      <ul className="mt-5 flex flex-col gap-3">
        {groups.map((g) => {
          const note = data.notes.find((n) => n.exercise_id === g.id)?.text;
          return (
            <li key={g.id} className="rounded-[18px] bg-grafit p-3">
              <p className="text-[18px] font-semibold">{g.name}</p>
              <ul className="mt-1 flex flex-col gap-0.5 tabular">
                {g.sets.map((s, i) => {
                  const plan = s.planned_reps != null || s.planned_time_s != null ? val(s.planned_weight_kg, s.planned_reps, s.planned_time_s) : null;
                  const actual = val(s.weight_kg, s.reps, s.time_s);
                  return (
                    <li key={i} className="flex justify-between text-[16px]">
                      <span>{t('summary.serieN', { n: s.number })}{s.extra ? ` · ${t('summary.navic')}` : ''}</span>
                      <span>{actual}{plan && plan !== actual ? <span className="text-zluta"> · {t('share.plan', { value: plan })}</span> : null}</span>
                    </li>
                  );
                })}
              </ul>
              {note && <p className="mt-1 text-[15px] italic text-ocel">{note}</p>}
            </li>
          );
        })}
      </ul>
      {data.notes.filter((n) => !n.exercise_id).map((n, i) => (
        <section key={i} className="mt-4"><h2 className="text-[16px] font-semibold">{t('share.poznamky')}</h2><p className="text-[17px]">{n.text}</p></section>
      ))}
    </main>
  );
}
