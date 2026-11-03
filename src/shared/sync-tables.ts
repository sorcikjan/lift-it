/**
 * Tabulky, které klient smí synchronizovat, v pořadí rodič → dítě.
 * owner: sloupec, který server vždy přepíše na přihlášeného uživatele.
 */
export const SYNC_TABLES = {
  exercises: { owner: 'owner_id', cols: ['id', 'name_cs', 'name_en', 'type', 'equipment', 'muscles', 'images', 'steps_cs', 'steps_en', 'video_url', 'source', 'license', 'author', 'owner_id', 'archived'] },
  exercise_aliases: { owner: 'owner_id', cols: ['id', 'text', 'exercise_id', 'owner_id'] },
  programs: { owner: 'client_id', cols: ['id', 'client_id', 'coach_id', 'name', 'start_date', 'end_date', 'goal', 'archived'] },
  plan_weeks: { owner: null, cols: ['id', 'program_id', 'week_start', 'source', 'sheet_url', 'sheet_tab', 'imported_at', 'raw_snapshot', 'published', 'archived'] },
  workouts: { owner: null, cols: ['id', 'week_id', 'label', 'position', 'planned_date', 'note', 'archived'] },
  planned_exercises: { owner: null, cols: ['id', 'workout_id', 'exercise_id', 'position', 'blok', 'group_label', 'coach_note', 'source_name', 'archived'] },
  planned_sets: { owner: null, cols: ['id', 'planned_exercise_id', 'number', 'reps_min', 'reps_max', 'weight_kg', 'time_s', 'kind', 'to_failure', 'archived'] },
  sessions: { owner: 'user_id', cols: ['id', 'user_id', 'workout_id', 'started_at', 'ended_at', 'with_coach', 'note', 'status', 'actual_order', 'source', 'archived'] },
  logged_sets: { owner: null, cols: ['id', 'session_id', 'exercise_id', 'planned_set_id', 'planned_exercise_id', 'number', 'reps', 'weight_kg', 'time_s', 'rpe', 'skipped', 'extra', 'kind', 'logged_at', 'archived'] },
  session_notes: { owner: null, cols: ['id', 'session_id', 'exercise_id', 'text', 'archived'] },
  measurements: { owner: 'user_id', cols: ['id', 'user_id', 'measured_on', 'weight_kg', 'waist_cm', 'chest_cm', 'hips_cm', 'arm_cm', 'thigh_cm', 'archived'] },
  share_links: { owner: 'owner_id', cols: ['id', 'owner_id', 'session_id', 'program_id', 'token', 'expires_at', 'archived'] },
  import_mappings: { owner: 'owner_id', cols: ['id', 'owner_id', 'spreadsheet_id', 'mapping', 'layout'] },
  comments: { owner: 'author_id', cols: ['id', 'client_id', 'author_id', 'target_type', 'target_id', 'text', 'archived'] },
} as const;

export type SyncTable = keyof typeof SYNC_TABLES;
export const SYNC_ORDER = Object.keys(SYNC_TABLES) as SyncTable[];

export interface Change { table: SyncTable; row: Record<string, unknown> }
export interface SyncResult { applied: string[]; rejected: { table: string; id: string; error: string }[] }
