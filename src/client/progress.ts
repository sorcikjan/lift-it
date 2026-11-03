'use client';
import { attendance, changeFromStart, exerciseHistory, recordHistory, type ExerciseSessionStat } from '@/domain/progress';
import type { Exercise } from '@/domain/types';
import { db } from './db';

export interface ExerciseProgress {
  exercise: Exercise;
  history: ExerciseSessionStat[];
  change: number | null;
  series: number[];
}

const metric = (x: ExerciseSessionStat) => x.bestE1rm ?? x.maxWeight ?? x.maxTime ?? x.maxReps ?? 0;

export async function loadProgress() {
  const [sets, sessions] = await Promise.all([db().logged_sets.toArray(), db().sessions.toArray()]);
  const ids = [...new Set(sets.filter((s) => !s.archived).map((s) => s.exercise_id))];
  const exs = (await db().exercises.bulkGet(ids)).filter(Boolean) as Exercise[];
  const items: ExerciseProgress[] = exs.map((e) => {
    const history = exerciseHistory(e.id, sets, sessions);
    return { exercise: e, history, change: changeFromStart(history), series: history.map(metric) };
  }).filter((x) => x.history.length).sort((a, b) => (b.history.at(-1)!.date > a.history.at(-1)!.date ? 1 : -1));

  const changes = items.filter((i) => i.history.length >= 2 && i.change != null).map((i) => i.change!);
  const overall = changes.length ? changes.reduce((a, b) => a + b, 0) / changes.length : null;

  const weeks = (await db().plan_weeks.toArray()).filter((w) => !w.archived && w.source !== 'baseline');
  const wos = await db().workouts.toArray();
  const att = attendance(sessions, weeks.map((w) => ({ week_start: w.week_start, planned: wos.filter((x) => x.week_id === w.id && !x.archived).length })))
    .sort((a, b) => (a.week_start < b.week_start ? 1 : -1));
  return { items, overall, attendance: att, records: recordHistory(sets, sessions) };
}

export async function loadExerciseProgress(exerciseId: string) {
  const [sets, sessions, exercise] = await Promise.all([db().logged_sets.toArray(), db().sessions.toArray(), db().exercises.get(exerciseId)]);
  const history = exerciseHistory(exerciseId, sets, sessions);
  const records = recordHistory(sets, sessions).filter((r) => r.exerciseId === exerciseId);
  const hr = sessions.filter((s) => s.hr_avg && history.some((h) => h.sessionId === s.id)).map((s) => ({ date: s.started_at, value: s.hr_avg! }));
  return { exercise, history, change: changeFromStart(history), records, hr };
}
