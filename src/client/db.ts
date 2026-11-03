'use client';
import Dexie, { type Table } from 'dexie';
import type {
  Exercise, ExerciseAlias, LoggedSet, Measurement, PlanWeek, PlannedExercise, PlannedSet, Program,
  Session, SessionNote, Workout,
} from '@/domain/types';
import type { RunState } from '@/domain/workout/reducer';
import type { SyncTable } from '@/shared/sync-tables';

export interface ActiveRun {
  id: 'current';
  session_id: string;
  workout_id: string;
  state: RunState;
  updated_at: string;
}

export interface OutboxItem {
  seq?: number;
  table: SyncTable;
  row_id: string;
  row: Record<string, unknown>;
  attempts: number;
}

export interface Meta { key: string; value: unknown }

export interface ShareLinkRow { id: string; owner_id: string; session_id: string | null; program_id: string | null; token: string; expires_at: string | null; archived: boolean }
export interface ImportMappingRow { id: string; owner_id: string; spreadsheet_id: string; mapping: unknown; layout: unknown }
export interface CommentRow { id: string; client_id: string; author_id: string; target_type: string; target_id: string; text: string; created_at?: string; archived: boolean }

/** Lokální databáze v IndexedDB: plán, trénink, historie a fronta zápisů. */
export class LiftDb extends Dexie {
  exercises!: Table<Exercise, string>;
  exercise_aliases!: Table<ExerciseAlias & { id: string }, string>;
  programs!: Table<Program, string>;
  plan_weeks!: Table<PlanWeek, string>;
  workouts!: Table<Workout, string>;
  planned_exercises!: Table<PlannedExercise, string>;
  planned_sets!: Table<PlannedSet, string>;
  sessions!: Table<Session, string>;
  logged_sets!: Table<LoggedSet, string>;
  session_notes!: Table<SessionNote, string>;
  measurements!: Table<Measurement, string>;
  share_links!: Table<ShareLinkRow, string>;
  import_mappings!: Table<ImportMappingRow, string>;
  comments!: Table<CommentRow, string>;
  active_run!: Table<ActiveRun, string>;
  outbox!: Table<OutboxItem, number>;
  meta!: Table<Meta, string>;

  constructor(name = 'lift-it') {
    super(name);
    this.version(1).stores({
      exercises: 'id, owner_id, name_cs, name_en',
      exercise_aliases: 'id, text, exercise_id',
      programs: 'id',
      plan_weeks: 'id, program_id, week_start',
      workouts: 'id, week_id',
      planned_exercises: 'id, workout_id, exercise_id',
      planned_sets: 'id, planned_exercise_id',
      sessions: 'id, workout_id, started_at, status',
      logged_sets: 'id, session_id, exercise_id, logged_at',
      session_notes: 'id, session_id',
      measurements: 'id, measured_on',
      share_links: 'id, session_id, token',
      import_mappings: 'id, spreadsheet_id',
      comments: 'id, target_id',
      active_run: 'id',
      outbox: '++seq, table, row_id',
      meta: 'key',
    });
  }
}

let instance: LiftDb | null = null;
export function db(): LiftDb {
  instance ??= new LiftDb();
  return instance;
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db().meta.get(key))?.value as T | undefined;
}
export async function setMeta(key: string, value: unknown) {
  await db().meta.put({ key, value });
}
