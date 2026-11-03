'use client';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/client/db';
import { exerciseName } from '@/client/library';
import { clientData, coachWrite, comments as loadComments, publishWeek, type ClientData, type CommentView } from '@/client/coach';
import { nowIso, uuid } from '@/client/uuid';
import { mondayOf } from '@/client/repo';
import { BottomNav } from '@/components/BottomNav';
import { CommentThread } from '@/components/CommentThread';
import { Sparkline } from '@/components/charts/Sparkline';
import { Button, Page, PageTitle, Toast } from '@/components/ui';
import { addDays, bumpWeights, copyWeek, latestWeek, weekStats, weekTree } from '@/domain/coach/plan-ops';
import { dayLabel, fullDate } from '@/domain/dates';
import { changeFromStart, exerciseHistory } from '@/domain/progress';
import { bestText, pct } from '@/domain/progress-format';
import { setsText } from '@/domain/sets-text';
import type { LoggedSet, PlanWeek, Workout } from '@/domain/types';
import { t } from '@/i18n/t';

export default function ClientPage() {
  return <Suspense><ClientOverview /></Suspense>;
}

/** E3, E4, E5: přehled klienta, plán a komentáře. */
function ClientOverview() {
  const clientId = useSearchParams().get('id') ?? '';
  const [data, setData] = useState<ClientData | null>(null);
  const [all, setAll] = useState<CommentView[]>([]);
  const [msg, setMsg] = useState<{ text: string; tone: 'done' | 'info' } | null>(null);
  const [busy, setBusy] = useState(false);
  const library = useLiveQuery(() => db().exercises.toArray(), []);

  const reload = useCallback(async () => {
    try {
      const [d, c] = await Promise.all([clientData(clientId), loadComments(clientId)]);
      setData(d); setAll(c.comments);
    } catch { setMsg({ text: t('coach.offline'), tone: 'info' }); }
  }, [clientId]);
  useEffect(() => { void reload(); }, [reload]);

  const names = useMemo(() => new Map([...(library ?? []), ...(data?.exercises ?? [])].map((e) => [e.id, exerciseName(e)])), [library, data]);

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    try { setMsg({ text: await fn(), tone: 'done' }); await reload(); } catch { setMsg({ text: t('coach.chyba'), tone: 'info' }); }
    setBusy(false);
  };

  if (!data) return <Page><PageTitle title={t('coach.klient')} back="/trener" />{msg ? <Toast tone="info">{msg.text}</Toast> : <p className="text-ocel">{t('common.nacitam')}</p>}<BottomNav /></Page>;

  const stats = weekStats(data, data.sessions);
  const latest = latestWeek(data);

  // E3: kopie minulého týdne jako koncept (1 ťuknutí), pak +2,5 kg a publikovat
  const copyLast = () => run(async () => {
    const tree = weekTree(latest!.id, data)!;
    const c = copyWeek(tree, uuid, nowIso());
    await coachWrite(clientId, { plan_weeks: [c.week], workouts: c.workouts, planned_exercises: c.exercises, planned_sets: c.sets });
    return t('coach.zkopirovano', { date: fullDate(c.week.week_start) });
  });
  const newWeek = () => run(async () => {
    let program = data.programs.find((p) => !p.archived);
    const rows: Record<string, object[]> = {};
    if (!program) {
      program = { id: uuid(), client_id: clientId, coach_id: null, name: 'Do Vánoc 2026', start_date: null, end_date: '2026-12-24', goal: null, archived: false };
      rows.programs = [program];
    }
    const week: PlanWeek = { id: uuid(), program_id: program.id, week_start: addDays(mondayOf(), 7), source: 'app', sheet_url: null, sheet_tab: null, imported_at: nowIso(), raw_snapshot: null, published: false, archived: false };
    const wo: Workout = { id: uuid(), week_id: week.id, label: 'A', position: 0, planned_date: null, note: null, archived: false };
    await coachWrite(clientId, { ...rows, plan_weeks: [week], workouts: [wo] });
    return t('coach.zkopirovano', { date: fullDate(week.week_start) });
  });
  const bump = (weekId: string) => run(async () => {
    const sets = bumpWeights(weekTree(weekId, data)!);
    await coachWrite(clientId, { planned_sets: sets });
    return t('coach.pridanoKg', { n: sets.length });
  });
  const publish = (weekId: string) => run(async () => { await publishWeek(clientId, weekId); return t('coach.publikovano'); });
  const addWorkout = (weekId: string) => run(async () => {
    const tree = weekTree(weekId, data)!;
    const wo: Workout = { id: uuid(), week_id: weekId, label: String.fromCharCode(65 + tree.workouts.length), position: tree.workouts.length, planned_date: null, note: null, archived: false };
    await coachWrite(clientId, { workouts: [wo] });
    location.href = `/trener/trenink?klient=${clientId}&id=${wo.id}`;
    return '';
  });

  const done = data.sessions.filter((s) => s.status === 'done' && !s.archived).sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
  const sets = data.logged_sets.filter((s) => !s.archived && !s.skipped);
  const exIds = [...new Set(sets.map((s) => s.exercise_id))];
  const progress = exIds.map((id) => {
    const h = exerciseHistory(id, sets, data.sessions);
    return { id, h, change: changeFromStart(h) };
  }).filter((x) => x.h.length).sort((a, b) => (b.h.at(-1)!.date > a.h.at(-1)!.date ? 1 : -1));

  return (
    <Page>
      <PageTitle title={data.profile?.name || data.profile?.email || t('coach.klient')} back="/trener" />
      {msg && <div className="mb-3"><Toast tone={msg.tone}>{msg.text}</Toast></div>}

      <section aria-labelledby="plan-h">
        <h2 id="plan-h" className="font-display text-[28px] font-bold">{t('coach.plan')}</h2>
        <div className="mt-2 flex gap-2">
          {latest
            ? <Button className="flex-1" disabled={busy} onClick={copyLast}>{t('coach.kopirovat')}</Button>
            : <Button className="flex-1" disabled={busy} onClick={newWeek}>{t('coach.novyTyden')}</Button>}
        </div>
        {!latest && <p className="mt-2 text-[16px] text-ocel">{t('coach.zadnyPlan')}</p>}
        <ul className="mt-3 flex flex-col gap-3">
          {stats.slice(0, 4).map((w) => {
            const tree = weekTree(w.weekId, data)!;
            return (
              <li key={w.weekId} data-testid="coach-week" className="rounded-[18px] bg-grafit p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[18px] font-semibold">{t('coach.tydenOd', { date: fullDate(w.weekStart) })}</p>
                  <span className={`rounded-full px-3 py-1 text-[14px] font-semibold ${w.published ? 'bg-splneno text-guma' : 'bg-zluta text-guma'}`}>
                    {w.published ? t('coach.publikovanyStav') : t('coach.koncept')}
                  </span>
                </div>
                <p className="text-[15px] text-ocel">{t('coach.odcvicenoTyden', { done: w.done, plan: w.planned })}</p>
                <ul className="mt-2 flex flex-col">
                  {tree.workouts.map((wo) => {
                    const pes = tree.exercises.filter((p) => p.workout_id === wo.id);
                    return (
                      <li key={wo.id} className="flex min-h-12 items-center justify-between gap-2 border-t border-linka">
                        <span className="min-w-0 flex-1 truncate text-[16px]">
                          <b>{wo.label}</b> · {pes.map((p) => p.source_name || names.get(p.exercise_id) || p.exercise_id).join(', ')}
                        </span>
                        <Link href={`/trener/trenink?klient=${clientId}&id=${wo.id}`} aria-label={`${t('coach.upravit')} ${wo.label}`}
                          className="tap flex items-center rounded-xl px-2 text-[15px] font-semibold text-modra-svetla underline underline-offset-4">{t('common.upravit')}</Link>
                      </li>
                    );
                  })}
                </ul>
                {!w.published && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button variant="ghost" disabled={busy} onClick={() => bump(w.weekId)}>{t('coach.pridatKg')}</Button>
                    <Button variant="ghost" disabled={busy} onClick={() => addWorkout(w.weekId)}>{t('coach.novyTrenink')}</Button>
                    <Button variant="done" className="col-span-2" disabled={busy} onClick={() => publish(w.weekId)}>{t('coach.publikovat')}</Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="sess-h" className="mt-6">
        <h2 id="sess-h" className="font-display text-[28px] font-bold">{t('coach.treninky')}</h2>
        {!done.length && <p className="text-[16px] text-ocel">{t('coach.zadneTreninky')}</p>}
        <ul className="mt-2 flex flex-col gap-3">
          {done.slice(0, 8).map((s) => {
            const wo = data.workouts.find((w) => w.id === s.workout_id);
            const ss = sets.filter((x) => x.session_id === s.id).sort((a, b) => (a.logged_at < b.logged_at ? -1 : 1));
            const groups: { exerciseId: string; peId: string | null; sets: LoggedSet[] }[] = [];
            for (const x of ss) {
              const g = groups.find((y) => y.exerciseId === x.exercise_id);
              if (g) g.sets.push(x); else groups.push({ exerciseId: x.exercise_id, peId: x.planned_exercise_id, sets: [x] });
            }
            const notes = data.session_notes.filter((n) => n.session_id === s.id && !n.archived && n.text.trim());
            return (
              <li key={s.id} data-testid="coach-session" className="rounded-[18px] bg-grafit p-3">
                <p className="text-[18px] font-semibold">{dayLabel(s.started_at)}{wo ? ` · ${t('summary.hotovy', { label: wo.label })}` : ''}</p>
                {s.hr_avg != null && <p className="text-[15px] text-ocel">{t('summary.prumernyTep')} {s.hr_avg} · {t('summary.kcal')} {s.kcal ?? '–'}</p>}
                <ul className="mt-2 flex flex-col gap-2">
                  {groups.map((g) => {
                    const pe = data.planned_exercises.find((p) => p.id === g.peId);
                    const planned = data.planned_sets.filter((p) => p.planned_exercise_id === g.peId && !p.archived).sort((a, b) => a.number - b.number)
                      .map((p) => ({ reps: p.reps_max, weight_kg: p.weight_kg, time_s: p.time_s }));
                    const name = pe?.source_name || names.get(g.exerciseId) || g.exerciseId;
                    const note = notes.find((n) => n.exercise_id === g.exerciseId);
                    return (
                      <li key={g.exerciseId} className="border-t border-linka pt-2">
                        <p className="text-[16px] font-semibold">{name}</p>
                        <p className="text-[16px] tabular">{t('coach.odcviceno')}: {setsText(g.sets)}</p>
                        {planned.length > 0 && <p className="text-[14px] text-ocel tabular">{t('coach.planText', { plan: setsText(planned) })}</p>}
                        {note && <p className="text-[15px] text-ocel">{t('coach.poznamkaKlienta', { text: note.text })}</p>}
                        <CommentThread clientId={clientId} targetType="logged_set" targetId={g.sets[0].id} match={g.sets.map((x) => x.id)} all={all} onAdded={reload} label={name} />
                      </li>
                    );
                  })}
                </ul>
                {notes.filter((n) => !n.exercise_id).map((n) => <p key={n.id} className="mt-2 text-[15px] text-ocel">{t('coach.poznamkaKlienta', { text: n.text })}</p>)}
                <CommentThread clientId={clientId} targetType="session" targetId={s.id} all={all} onAdded={reload} label={dayLabel(s.started_at)} />
              </li>
            );
          })}
        </ul>
      </section>

      {progress.length > 0 && (
        <section aria-labelledby="prog-h" className="mt-6">
          <h2 id="prog-h" className="font-display text-[28px] font-bold">{t('coach.progres')}</h2>
          <ul className="mt-2 flex flex-col">
            {progress.map((p) => (
              <li key={p.id} className="flex min-h-14 items-center gap-3 border-b border-linka py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] font-semibold">{names.get(p.id) ?? p.id}</span>
                  <span className="block text-[14px] text-ocel tabular">{t('progres.ted', { now: bestText(p.h.at(-1)), start: bestText(p.h[0]) })}</span>
                </span>
                <Sparkline values={p.h.map((x) => x.bestE1rm ?? x.maxWeight ?? x.maxTime ?? x.maxReps ?? 0)} />
                {p.change != null && p.h.length > 1 && <span className="w-16 text-right font-display text-[20px] font-bold tabular">{pct(p.change)}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
      <BottomNav />
    </Page>
  );
}
