-- Lift It: celé datové schéma (PRD, kapitola Datový model).
-- Plán (PlannedSet) a skutečnost (LoggedSet) jsou oddělené. ID generuje klient
-- (UUID), aby offline zápisy šly bezpečně opakovat. Nic se nemaže natvrdo,
-- jen archivuje (sloupec archived).

-- Uživatelé a role ----------------------------------------------------------

create table if not exists profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  roles       text[] not null default array['athlete']::text[]
              check (roles <@ array['athlete', 'coach', 'admin']::text[]),
  name        text not null default '',
  email       text not null default '',
  units       text not null default 'kg' check (units in ('kg')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists coach_clients (
  coach_id    uuid not null references profiles (id),
  client_id   uuid not null references profiles (id),
  status      text not null default 'active' check (status in ('active', 'ended')),
  created_at  timestamptz not null default now(),
  primary key (coach_id, client_id)
);

create table if not exists coach_invites (
  token       text primary key,
  coach_id    uuid not null references profiles (id),
  accepted_by uuid references profiles (id),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '14 days'
);

-- Knihovna cviků ------------------------------------------------------------

create table if not exists exercises (
  id          text primary key,              -- id z free-exercise-db, u vlastních UUID
  name_cs     text not null default '',
  name_en     text not null default '',
  type        text not null default 'weight_reps' check (type in ('weight_reps', 'reps', 'time')),
  equipment   text,
  muscles     text[] not null default '{}',
  images      text[] not null default '{}',
  steps_cs    text[] not null default '{}',
  steps_en    text[] not null default '{}',
  video_url   text,
  source      text not null default 'free-exercise-db',
  license     text not null default 'Public domain',
  author      text,
  owner_id    uuid references profiles (id), -- null = globální knihovna
  archived    boolean not null default false,
  updated_at  timestamptz not null default now()
);

create table if not exists exercise_aliases (
  id          uuid primary key,
  text        text not null,                 -- normalizovaný: malá písmena, bez diakritiky a interpunkce
  exercise_id text not null references exercises (id),
  owner_id    uuid references profiles (id), -- null = globální alias z české vrstvy
  updated_at  timestamptz not null default now()
);
create unique index if not exists exercise_aliases_owner_text
  on exercise_aliases (coalesce(owner_id, '00000000-0000-0000-0000-000000000000'::uuid), text);

-- Plán ----------------------------------------------------------------------

create table if not exists programs (
  id          uuid primary key,
  client_id   uuid not null references profiles (id),
  coach_id    uuid references profiles (id),
  name        text not null,
  start_date  date,
  end_date    date,
  goal        text,
  archived    boolean not null default false,
  updated_at  timestamptz not null default now()
);

create table if not exists plan_weeks (
  id           uuid primary key,
  program_id   uuid not null references programs (id),
  week_start   date not null,
  source       text not null default 'manual' check (source in ('sheet', 'app', 'manual', 'paste', 'baseline')),
  sheet_url    text,
  sheet_tab    text,
  imported_at  timestamptz,
  raw_snapshot jsonb,
  published    boolean not null default true,  -- trenérský koncept (fáze 4) je false
  archived     boolean not null default false,
  updated_at   timestamptz not null default now()
);

create table if not exists workouts (
  id           uuid primary key,
  week_id      uuid not null references plan_weeks (id),
  label        text not null,                  -- A / B
  position     int not null default 0,
  planned_date date,
  note         text,
  archived     boolean not null default false,
  updated_at   timestamptz not null default now()
);

create table if not exists planned_exercises (
  id           uuid primary key,
  workout_id   uuid not null references workouts (id),
  exercise_id  text not null references exercises (id),
  position     int not null,
  blok         text not null default 'hlavni' check (blok in ('uvod', 'hlavni', 'zaver')),
  group_label  text,                           -- superserie, např. „A“ pro A1/A2
  coach_note   text,
  source_name  text,                           -- název tak, jak stál v sheetu
  archived     boolean not null default false,
  updated_at   timestamptz not null default now()
);

create table if not exists planned_sets (
  id                  uuid primary key,
  planned_exercise_id uuid not null references planned_exercises (id),
  number              int not null,
  reps_min            int,
  reps_max            int,
  weight_kg           numeric(6, 2) check (weight_kg is null or weight_kg * 4 = floor(weight_kg * 4)),
  time_s              int,
  kind                text not null default 'working' check (kind in ('warmup', 'working')),
  to_failure          boolean not null default false,
  archived            boolean not null default false,
  updated_at          timestamptz not null default now()
);

-- Skutečnost ----------------------------------------------------------------

create table if not exists sessions (
  id                 uuid primary key,
  user_id            uuid not null references profiles (id),
  workout_id         uuid references workouts (id),
  started_at         timestamptz not null,
  ended_at           timestamptz,
  with_coach         boolean not null default false,
  note               text,
  status             text not null default 'active' check (status in ('active', 'done', 'abandoned')),
  actual_order       uuid[] not null default '{}', -- planned_exercises v pořadí, jak se reálně cvičily
  source             text not null default 'app' check (source in ('app', 'baseline')),
  strava_activity_id bigint,
  pairing_status     text check (pairing_status in ('waiting', 'paired', 'not_found')),
  hr_avg             int,
  hr_max             int,
  kcal               int,
  garmin_activity_id bigint,
  archived           boolean not null default false,
  updated_at         timestamptz not null default now()
);

create table if not exists logged_sets (
  id                  uuid primary key,          -- UUID z klienta
  session_id          uuid not null references sessions (id),
  exercise_id         text not null references exercises (id),
  planned_set_id      uuid references planned_sets (id),
  planned_exercise_id uuid references planned_exercises (id),
  number              int not null,
  reps                int,
  weight_kg           numeric(6, 2) check (weight_kg is null or weight_kg * 4 = floor(weight_kg * 4)),
  time_s              int,
  rpe                 numeric(3, 1),
  skipped             boolean not null default false,
  extra               boolean not null default false, -- série navíc mimo plán (B15)
  kind                text not null default 'working' check (kind in ('warmup', 'working')),
  logged_at           timestamptz not null,
  archived            boolean not null default false,
  updated_at          timestamptz not null default now()
);

create table if not exists session_notes (
  id          uuid primary key,
  session_id  uuid not null references sessions (id),
  exercise_id text references exercises (id),    -- null = poznámka k celému tréninku
  text        text not null,
  archived    boolean not null default false,
  updated_at  timestamptz not null default now()
);

create table if not exists measurements (
  id          uuid primary key,
  user_id     uuid not null references profiles (id),
  measured_on date not null,
  weight_kg   numeric(5, 2),
  waist_cm    numeric(5, 1),
  chest_cm    numeric(5, 1),
  hips_cm     numeric(5, 1),
  arm_cm      numeric(5, 1),
  thigh_cm    numeric(5, 1),
  archived    boolean not null default false,
  updated_at  timestamptz not null default now()
);

-- Trenér a komunikace -------------------------------------------------------

create table if not exists comments (
  id          uuid primary key,
  client_id   uuid not null references profiles (id), -- čí data se komentují
  author_id   uuid not null references profiles (id),
  target_type text not null check (target_type in ('session', 'logged_set', 'workout')),
  target_id   uuid not null,
  text        text not null,
  created_at  timestamptz not null default now(),
  archived    boolean not null default false,
  updated_at  timestamptz not null default now()
);

create table if not exists import_mappings (
  id             uuid primary key,
  owner_id       uuid not null references profiles (id),
  spreadsheet_id text not null,
  mapping        jsonb not null,
  layout         jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now(),
  unique (owner_id, spreadsheet_id)
);

create table if not exists share_links (
  id          uuid primary key,
  owner_id    uuid not null references profiles (id),
  session_id  uuid references sessions (id),
  program_id  uuid references programs (id),
  token       text not null unique,
  expires_at  timestamptz,
  archived    boolean not null default false,
  updated_at  timestamptz not null default now(),
  check ((session_id is null) <> (program_id is null))
);

-- Integrace (jen server) ------------------------------------------------------

create table if not exists integration_tokens (
  user_id     uuid not null references profiles (id),
  provider    text not null check (provider in ('google', 'strava', 'garmin')),
  data_enc    text not null,                    -- AES-GCM, klíč jen na serveru
  updated_at  timestamptz not null default now(),
  primary key (user_id, provider)
);

create table if not exists push_subscriptions (
  id          uuid primary key,
  user_id     uuid not null references profiles (id),
  endpoint    text not null unique,
  keys        jsonb not null,
  created_at  timestamptz not null default now()
);

-- Indexy ------------------------------------------------------------------------

create index if not exists plan_weeks_program on plan_weeks (program_id);
create index if not exists workouts_week on workouts (week_id);
create index if not exists planned_exercises_workout on planned_exercises (workout_id);
create index if not exists planned_sets_pe on planned_sets (planned_exercise_id);
create index if not exists sessions_user on sessions (user_id, started_at);
create index if not exists logged_sets_session on logged_sets (session_id);
create index if not exists logged_sets_exercise on logged_sets (exercise_id);
create index if not exists comments_target on comments (target_type, target_id);
create index if not exists programs_client on programs (client_id);

-- updated_at ----------------------------------------------------------------------

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'exercises', 'exercise_aliases', 'programs', 'plan_weeks',
    'workouts', 'planned_exercises', 'planned_sets', 'sessions', 'logged_sets', 'session_notes',
    'measurements', 'comments', 'import_mappings', 'share_links', 'integration_tokens']
  loop
    execute format('drop trigger if exists touch on %I', t);
    execute format('create trigger touch before update on %I for each row execute function touch_updated_at()', t);
  end loop;
end $$;

-- Profil vznikne s účtem ------------------------------------------------------------

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
