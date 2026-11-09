export type Blok = 'uvod' | 'hlavni' | 'zaver';
export type ExerciseType = 'weight_reps' | 'reps' | 'time';
export type SetKind = 'warmup' | 'working';

/** Cvik v knihovně (globální z free-exercise-db nebo vlastní). */
export interface Exercise {
  id: string;
  name_cs: string;
  name_en: string;
  type: ExerciseType;
  equipment: string | null;
  muscles: string[];
  images: string[];
  steps_cs: string[];
  steps_en: string[];
  video_url?: string | null;
  source: string;
  license: string;
  author?: string | null;
  owner_id?: string | null;
  cs_reviewed?: boolean;
  archived?: boolean;
  updated_at?: string;
}

export interface ExerciseAlias {
  id?: string;
  text: string;
  exercise_id: string;
  owner_id?: string | null;
}

/** Řádky plánu, jak leží v IndexedDB i v Postgresu (stejné názvy sloupců). */
export interface Program {
  id: string; client_id: string; coach_id: string | null; name: string;
  start_date: string | null; end_date: string | null; goal: string | null;
  archived: boolean; updated_at?: string;
}
export interface PlanWeek {
  id: string; program_id: string; week_start: string;
  source: 'sheet' | 'app' | 'manual' | 'paste' | 'baseline';
  sheet_url: string | null; sheet_tab: string | null; imported_at: string | null;
  raw_snapshot: unknown; published: boolean; archived: boolean; updated_at?: string;
}
export interface Workout {
  id: string; week_id: string; label: string; position: number; planned_date: string | null;
  note: string | null; archived: boolean; updated_at?: string;
}
export interface PlannedExercise {
  id: string; workout_id: string; exercise_id: string; position: number; blok: Blok;
  group_label: string | null; coach_note: string | null; source_name: string | null;
  archived: boolean; updated_at?: string;
}
export interface PlannedSet {
  id: string; planned_exercise_id: string; number: number;
  reps_min: number | null; reps_max: number | null; weight_kg: number | null; time_s: number | null;
  kind: SetKind; to_failure: boolean; archived: boolean; updated_at?: string;
}

export interface Session {
  id: string; user_id: string; workout_id: string | null;
  started_at: string; ended_at: string | null; with_coach: boolean; note: string | null;
  status: 'active' | 'done' | 'abandoned'; actual_order: string[]; source: 'app' | 'baseline' | 'coach';
  strava_activity_id: number | null; pairing_status: 'waiting' | 'paired' | 'not_found' | null;
  hr_avg: number | null; hr_max: number | null; kcal: number | null; garmin_activity_id: number | null;
  /** Trénink s trenérem: zaplaceno? null = netýká se. */
  paid?: boolean | null;
  archived: boolean; updated_at?: string;
}
export interface LoggedSet {
  id: string; session_id: string; exercise_id: string;
  planned_set_id: string | null; planned_exercise_id: string | null;
  number: number; reps: number | null; weight_kg: number | null; time_s: number | null;
  rpe: number | null; skipped: boolean; extra: boolean; kind: SetKind;
  logged_at: string; archived: boolean; updated_at?: string;
}
export interface SessionNote {
  id: string; session_id: string; exercise_id: string | null; text: string; archived: boolean; updated_at?: string;
}
export interface Measurement {
  id: string; user_id: string; measured_on: string; weight_kg: number | null;
  waist_cm: number | null; chest_cm: number | null; hips_cm: number | null; arm_cm: number | null; thigh_cm: number | null;
  archived: boolean; updated_at?: string;
}

/** Trénink připravený pro obrazovku tréninku: cviky s plánovanými sériemi. */
export interface PlanSetView {
  id: string;
  number: number;
  repsMin: number | null;
  repsMax: number | null;
  weightKg: number | null;
  timeS: number | null;
  kind: SetKind;
  toFailure: boolean;
}
export interface WorkoutExerciseView {
  id: string;            // planned_exercise_id
  exerciseId: string;
  name: string;
  type: ExerciseType;
  blok: Blok;
  group: string | null;
  images: string[];
  steps: string[];
  coachNote: string | null;
  equipment?: string | null;
  sets: PlanSetView[];
}
export interface WorkoutView {
  workoutId: string;
  label: string;
  exercises: WorkoutExerciseView[];
}
