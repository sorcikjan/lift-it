'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/client/db';
import { exerciseName } from '@/client/library';
import { addExtraExercise, addExtraLoggedSet, saveNote, updateLoggedSet, updateSession } from '@/client/repo';
import { recordHistory, summarize } from '@/domain/progress';
import { fmtKg, fmtNum, parseCzNumber, roundKg } from '@/domain/format';
import { dayLabel } from '@/domain/dates';
import type { LoggedSet } from '@/domain/types';
import { BottomNav } from '@/components/BottomNav';
import { Check, Mic, Plus, Trophy } from '@/components/icons';
import { LinkButton, Page, inputCls } from '@/components/ui';
import { ShareButton } from '@/components/ShareButton';
import { ExercisePicker } from '@/components/ExercisePicker';
import { WritebackButton } from '@/components/WritebackButton';
import { CommentThread } from '@/components/CommentThread';
import { comments as loadComments, people, type CommentView } from '@/client/coach';
import { onMe, type Me } from '@/client/me';
import { WatchPanel } from '@/components/WatchPanel';
import { SyncBadge } from '@/components/SyncBadge';
import { t } from '@/i18n/t';

export default function SummaryPage() {
  return <Suspense><Summary /></Suspense>;
}

/** Shrnutí po tréninku (B12, B13): délka, objem, rekordy, oprava odchylek, poznámka. */
function Summary() {
  const id = useSearchParams().get('id') ?? '';
  const data = useLiveQuery(async () => {
    const session = await db().sessions.get(id);
    if (!session) return null;
    const [sets, allSets, sessions, notes] = await Promise.all([
      db().logged_sets.where('session_id').equals(id).toArray(),
      db().logged_sets.toArray(),
      db().sessions.toArray(),
      db().session_notes.where('session_id').equals(id).toArray(),
    ]);
    const workout = session.workout_id ? await db().workouts.get(session.workout_id) : undefined;
    const pes = session.workout_id ? (await db().planned_exercises.where('workout_id').equals(session.workout_id).toArray()).filter((p) => !p.archived) : [];
    const planned = pes.length ? await db().planned_sets.where('planned_exercise_id').anyOf(pes.map((p) => p.id)).filter((s) => !s.archived).count() : 0;
    const exIds = [...new Set(sets.map((s) => s.exercise_id))];
    const exs = new Map((await db().exercises.bulkGet(exIds)).filter(Boolean).map((e) => [e!.id, e!]));
    const records = recordHistory(allSets, sessions).filter((r) => r.sessionId === id && r.type !== 'e1rm');
    return { session, sets: sets.filter((s) => !s.archived).sort((a, b) => (a.logged_at < b.logged_at ? -1 : 1)), workout, planned, exs, records, note: notes.find((n) => !n.exercise_id && !n.archived)?.text ?? '' };
  }, [id]);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // E5: komentáře od trenéra (jen online a jen když nějakého trenéra mám nebo už komentáře jsou)
  const [me, setMe] = useState<Me | null>(null);
  const [all, setAll] = useState<CommentView[]>([]);
  const [hasCoach, setHasCoach] = useState(false);
  useEffect(() => { const off = onMe((m) => setMe(m)); return () => { off(); }; }, []);
  const reloadComments = useCallback(() => { loadComments().then((c) => setAll(c.comments)).catch(() => {}); }, []);
  useEffect(() => {
    if (!me) return;
    reloadComments();
    people().then((p) => setHasCoach(p.coaches.length > 0)).catch(() => {});
  }, [me, reloadComments]);

  if (data === undefined) return <Page><p className="pt-10 text-ocel">{t('common.nacitam')}</p></Page>;
  if (data === null) return <Page><p className="pt-10 text-ocel">{t('common.zadnaData')}</p><BottomNav /></Page>;
  const { session, sets, workout, planned, exs, records } = data;
  const sum = summarize(session, sets, planned);
  const groups: { exerciseId: string; sets: LoggedSet[] }[] = [];
  for (const s of sets) {
    const g = groups.find((x) => x.exerciseId === s.exercise_id);
    if (g) g.sets.push(s); else groups.push({ exerciseId: s.exercise_id, sets: [s] });
  }
  const name = (eid: string) => exerciseName(exs.get(eid));

  return (
    <Page>
      <div className="min-h-8 pt-2"><SyncBadge /></div>
      <header className="pb-4 pt-2">
        <h1 className="font-display text-[44px] font-bold leading-none">{workout ? t('summary.hotovy', { label: workout.label }) : t('summary.hotovyBezPlanu')}</h1>
        <p className="mt-1 text-[17px] text-ocel">{dayLabel(session.started_at)}</p>
      </header>

      <dl className="grid grid-cols-3 gap-2">
        <Stat label={t('summary.delka')} value={String(sum.durationMin)} unit={t('common.min')} />
        <Stat label={t('summary.objem')} value={fmtNum(Math.round(sum.volume))} unit={t('common.kg')} />
        <Stat label={t('summary.splneno')} value={String(sum.loggedSets)} unit={planned ? t('summary.zN', { n: planned }) : ''} />
      </dl>

      <section aria-labelledby="pr-h" className="mt-5">
        <h2 id="pr-h" className="flex items-center gap-2 font-display text-[26px] font-bold">
          {t('summary.rekordy')} {records.length > 0 && <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-splneno px-2 text-guma">{records.length}</span>}
        </h2>
        {records.length ? (
          <ul className="mt-2 flex flex-col gap-2">
            {records.map((r) => (
              <li key={`${r.exerciseId}-${r.type}-${r.weight}`} className="flex items-center gap-3 rounded-[18px] bg-grafit p-3">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-splneno text-guma"><Trophy size={22} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[18px] font-semibold">{name(r.exerciseId)}</p>
                  <p className="text-[15px] text-ocel">{r.previous != null ? t('summary.predchozi', { value: r.type === 'weight' ? `${fmtKg(r.previous)} kg` : `${fmtKg(r.weight ?? 0)} kg × ${r.previous}` }) : t('summary.prvniRekord')}</p>
                </div>
                <span className="font-display text-[22px] font-bold text-splneno tabular">{r.weight != null ? `${fmtKg(r.weight)} kg × ${r.reps ?? ''}` : r.value}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-1 text-[16px] text-ocel">{t('summary.zadneRekordy')}</p>}
      </section>

      <WatchPanel sessionId={session.id} />

      <section className="mt-5">
        <h2 className="font-display text-[26px] font-bold">{t('summary.odchylky')}</h2>
        <p className="text-[15px] text-ocel">{t('summary.odchylkyText')}</p>
        <ul className="mt-2 flex flex-col gap-2">
          {groups.map((g) => (
            <li key={g.exerciseId} className="rounded-[18px] bg-grafit p-3">
              <p className="text-[18px] font-semibold">{name(g.exerciseId)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {g.sets.map((s) => (
                  <button key={s.id} type="button" onClick={() => setEditing(editing === s.id ? null : s.id)} aria-expanded={editing === s.id}
                    className={`tap rounded-xl px-3 font-display text-[19px] font-semibold tabular ${editing === s.id ? 'bg-krida text-guma' : 'bg-guma'}`}>
                    {setLabel(s)}{s.extra ? ` · ${t('summary.navic')}` : ''}
                  </button>
                ))}
                <button type="button" onClick={() => addExtraLoggedSet(session.id, g.sets[g.sets.length - 1])} aria-label={t('summary.pridatSerii')}
                  className="tap flex items-center justify-center rounded-xl border border-linka px-3 text-ocel"><Plus size={20} /></button>
              </div>
              {g.sets.filter((s) => s.id === editing).map((s) => <SetEditor key={s.id} s={s} onDone={() => setEditing(null)} />)}
              {me && (hasCoach || all.length > 0) && (
                <CommentThread clientId={me.id} targetType="logged_set" targetId={g.sets[0].id} match={g.sets.map((x) => x.id)} all={all} onAdded={reloadComments} label={name(g.exerciseId)} />
              )}
            </li>
          ))}
        </ul>
        {adding ? (
          <div className="mt-3 rounded-[18px] bg-grafit p-3">
            <p className="text-[15px] text-ocel">{t('summary.pridatCvikText')}</p>
            <ExercisePicker onPick={async (eid) => { setEditing(await addExtraExercise(session.id, eid)); setAdding(false); }} />
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="tap mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-linka text-[17px] font-semibold text-ocel">
            <Plus size={20} />{t('summary.pridatCvik')}
          </button>
        )}
      </section>

      {me && (hasCoach || all.some((c) => c.target_id === session.id)) && (
        <section className="mt-5">
          <h2 className="font-display text-[26px] font-bold">{t('coach.komentare')}</h2>
          <CommentThread clientId={me.id} targetType="session" targetId={session.id} all={all} onAdded={reloadComments} />
        </section>
      )}

      <NoteBox sessionId={session.id} initial={data.note} />

      <label className="tap mt-3 flex items-center gap-3 text-[17px]">
        <input type="checkbox" checked={session.with_coach} onChange={(e) => updateSession(session.id, { with_coach: e.target.checked })} className="h-7 w-7 accent-modra-akce" />
        {t('summary.sTrenerem')}
      </label>

      <div className="mt-5 flex flex-col gap-3">
        <ShareButton sessionId={session.id} label={workout?.label ?? ''} />
        <WritebackButton sessionId={session.id} />
        <LinkButton href="/" big variant="done"><Check size={28} />{t('common.hotovo')}</LinkButton>
      </div>
      <BottomNav />
    </Page>
  );
}

function setLabel(s: LoggedSet) {
  if (s.time_s != null && s.reps == null) return `${s.time_s} s`;
  return s.weight_kg ? `${fmtKg(Number(s.weight_kg))} × ${s.reps ?? '–'}` : `${s.reps ?? '–'}×`;
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-[18px] bg-grafit p-3">
      <dt className="text-[14px] text-ocel">{label}</dt>
      <dd className="font-display text-[34px] font-bold leading-tight tabular">{value} <span className="text-[17px] font-semibold text-ocel">{unit}</span></dd>
    </div>
  );
}

function SetEditor({ s, onDone }: { s: LoggedSet; onDone: () => void }) {
  const isTime = s.time_s != null && s.reps == null;
  const [reps, setReps] = useState(String(s.reps ?? ''));
  const [w, setW] = useState(s.weight_kg != null ? fmtKg(Number(s.weight_kg)) : '');
  const [time, setTime] = useState(String(s.time_s ?? ''));
  const save = async () => {
    const weight = parseCzNumber(w);
    await updateLoggedSet(s.id, isTime
      ? { time_s: parseCzNumber(time) }
      : { reps: parseCzNumber(reps), weight_kg: weight == null ? null : roundKg(weight) });
    onDone();
  };
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {isTime ? (
        <label className="col-span-2 flex flex-col gap-1 text-[14px] text-ocel">{t('summary.cas')}
          <input inputMode="numeric" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} /></label>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-[14px] text-ocel">{t('summary.opakovani')}
            <input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} className={inputCls} /></label>
          <label className="flex flex-col gap-1 text-[14px] text-ocel">{t('summary.vaha')}
            <input inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} className={inputCls} /></label>
        </>
      )}
      <button type="button" onClick={() => updateLoggedSet(s.id, { archived: true }).then(onDone)} className="tap rounded-2xl border border-linka text-[16px] text-ocel">{t('common.smazat')}</button>
      <button type="button" onClick={save} className="tap rounded-2xl bg-modra-akce font-display text-[20px] font-bold">{t('common.ulozit')}</button>
    </div>
  );
}

function NoteBox({ sessionId, initial }: { sessionId: string; initial: string }) {
  const [text, setText] = useState(initial);
  return (
    <label className="mt-5 flex flex-col gap-1.5">
      <span className="flex items-center gap-2 text-[16px] font-semibold"><Mic size={20} />{t('summary.nadiktovat')}</span>
      <textarea value={text} onChange={(e) => setText(e.target.value)} onBlur={() => saveNote(sessionId, null, text)} rows={3}
        placeholder={t('summary.poznamkaPlaceholder')} className="w-full rounded-2xl border border-linka bg-guma p-3 text-[18px]" />
    </label>
  );
}
