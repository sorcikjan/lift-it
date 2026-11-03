-- Row Level Security od začátku. Pravidla:
--   cvičenec vidí a mění jen svoje data,
--   trenér vidí a plánuje jen pro svoje aktivní klienty,
--   sdílený odkaz (ShareLink) dává jen čtení přes funkci get_shared_session.
-- Pomocné funkce jsou security definer, aby se politiky nezacyklily.

create or replace function is_coach_of(client uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from coach_clients
    where coach_id = auth.uid() and client_id = client and status = 'active'
  )
$$;

create or replace function can_access_user(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select uid = auth.uid() or is_coach_of(uid)
$$;

create or replace function program_client(pid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select client_id from programs where id = pid
$$;

create or replace function week_client(wid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select p.client_id from plan_weeks w join programs p on p.id = w.program_id where w.id = wid
$$;

create or replace function workout_client(wid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select p.client_id from workouts wo
  join plan_weeks w on w.id = wo.week_id
  join programs p on p.id = w.program_id
  where wo.id = wid
$$;

create or replace function pe_client(peid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select workout_client(workout_id) from planned_exercises where id = peid
$$;

create or replace function session_user_id(sid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select user_id from sessions where id = sid
$$;

-- Plán psaný trenérem jako koncept (published = false) klient nevidí.
create or replace function week_visible(wid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select w.published or is_coach_of(p.client_id)
    from plan_weeks w join programs p on p.id = w.program_id where w.id = wid
  ), true)
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'coach_clients', 'coach_invites', 'exercises', 'exercise_aliases',
    'programs', 'plan_weeks', 'workouts', 'planned_exercises', 'planned_sets', 'sessions', 'logged_sets',
    'session_notes', 'measurements', 'comments', 'import_mappings', 'share_links', 'integration_tokens',
    'push_subscriptions']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- profiles: svůj profil, profily klientů (trenér) a profil svého trenéra (klient)
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select using (
  id = auth.uid() or is_coach_of(id)
  or exists (select 1 from coach_clients cc where cc.client_id = auth.uid() and cc.coach_id = profiles.id)
);
drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- coach_clients: obě strany vztahu čtou; vzniká přes accept_invite, ukončit může kterákoli strana
drop policy if exists cc_select on coach_clients;
create policy cc_select on coach_clients for select using (coach_id = auth.uid() or client_id = auth.uid());
drop policy if exists cc_update on coach_clients;
create policy cc_update on coach_clients for update using (coach_id = auth.uid() or client_id = auth.uid());

drop policy if exists invites_all on coach_invites;
create policy invites_all on coach_invites for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- exercises: globální čte každý přihlášený; vlastní cviky vidí autor, jeho trenér a jeho klienti
drop policy if exists exercises_select on exercises;
create policy exercises_select on exercises for select using (
  owner_id is null or owner_id = auth.uid() or is_coach_of(owner_id)
  or exists (select 1 from coach_clients cc where cc.client_id = auth.uid() and cc.coach_id = exercises.owner_id and cc.status = 'active')
);
drop policy if exists exercises_insert on exercises;
create policy exercises_insert on exercises for insert with check (owner_id = auth.uid());
drop policy if exists exercises_update on exercises;
create policy exercises_update on exercises for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists aliases_select on exercise_aliases;
create policy aliases_select on exercise_aliases for select using (owner_id is null or owner_id = auth.uid());
drop policy if exists aliases_write on exercise_aliases;
create policy aliases_write on exercise_aliases for insert with check (owner_id = auth.uid());
drop policy if exists aliases_update on exercise_aliases;
create policy aliases_update on exercise_aliases for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- programs a celý strom plánu: klient a jeho trenér
drop policy if exists programs_all on programs;
create policy programs_all on programs for all
  using (can_access_user(client_id)) with check (can_access_user(client_id));

drop policy if exists weeks_all on plan_weeks;
create policy weeks_all on plan_weeks for all
  using (can_access_user(program_client(program_id)) and week_visible(id))
  with check (can_access_user(program_client(program_id)));

drop policy if exists workouts_all on workouts;
create policy workouts_all on workouts for all
  using (can_access_user(week_client(week_id)) and week_visible(week_id))
  with check (can_access_user(week_client(week_id)));

drop policy if exists pe_all on planned_exercises;
create policy pe_all on planned_exercises for all
  using (can_access_user(workout_client(workout_id)))
  with check (can_access_user(workout_client(workout_id)));

drop policy if exists ps_all on planned_sets;
create policy ps_all on planned_sets for all
  using (can_access_user(pe_client(planned_exercise_id)))
  with check (can_access_user(pe_client(planned_exercise_id)));

-- skutečnost: zapisuje jen cvičenec, trenér čte
drop policy if exists sessions_select on sessions;
create policy sessions_select on sessions for select using (can_access_user(user_id));
drop policy if exists sessions_insert on sessions;
create policy sessions_insert on sessions for insert with check (user_id = auth.uid());
drop policy if exists sessions_update on sessions;
create policy sessions_update on sessions for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists sets_select on logged_sets;
create policy sets_select on logged_sets for select using (can_access_user(session_user_id(session_id)));
drop policy if exists sets_insert on logged_sets;
create policy sets_insert on logged_sets for insert with check (session_user_id(session_id) = auth.uid());
drop policy if exists sets_update on logged_sets;
create policy sets_update on logged_sets for update
  using (session_user_id(session_id) = auth.uid()) with check (session_user_id(session_id) = auth.uid());

drop policy if exists notes_select on session_notes;
create policy notes_select on session_notes for select using (can_access_user(session_user_id(session_id)));
drop policy if exists notes_insert on session_notes;
create policy notes_insert on session_notes for insert with check (session_user_id(session_id) = auth.uid());
drop policy if exists notes_update on session_notes;
create policy notes_update on session_notes for update
  using (session_user_id(session_id) = auth.uid()) with check (session_user_id(session_id) = auth.uid());

drop policy if exists meas_select on measurements;
create policy meas_select on measurements for select using (can_access_user(user_id));
drop policy if exists meas_insert on measurements;
create policy meas_insert on measurements for insert with check (user_id = auth.uid());
drop policy if exists meas_update on measurements;
create policy meas_update on measurements for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- komentáře: klient a jeho trenér; zapisuje se pod svým jménem
drop policy if exists comments_select on comments;
create policy comments_select on comments for select using (can_access_user(client_id));
drop policy if exists comments_insert on comments;
create policy comments_insert on comments for insert with check (author_id = auth.uid() and can_access_user(client_id));
drop policy if exists comments_update on comments;
create policy comments_update on comments for update using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists mappings_all on import_mappings;
create policy mappings_all on import_mappings for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- share_links: spravuje vlastník; anonym tabulku nevidí, čte jen přes get_shared_session
drop policy if exists share_all on share_links;
create policy share_all on share_links for all using (owner_id = auth.uid()) with check (
  owner_id = auth.uid() and (session_id is null or session_user_id(session_id) = auth.uid())
);

-- integration_tokens: žádná politika = přístup jen pro server (service_role)

drop policy if exists push_all on push_subscriptions;
create policy push_all on push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Sdílené shrnutí tréninku bez přihlášení (E1). Jen čtení, jen jeden trénink.
create or replace function get_shared_session(share_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  link share_links;
  result jsonb;
begin
  select * into link from share_links
  where token = share_token and not archived and (expires_at is null or expires_at > now())
    and session_id is not null;
  if not found then return null; end if;

  select jsonb_build_object(
    'session', to_jsonb(s) - 'user_id' - 'strava_activity_id' - 'garmin_activity_id',
    'athlete', (select name from profiles where id = s.user_id),
    'workout', (select label from workouts where id = s.workout_id),
    'sets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'exercise_id', ls.exercise_id,
        'name', coalesce(nullif(e.name_cs, ''), e.name_en),
        'number', ls.number, 'reps', ls.reps, 'weight_kg', ls.weight_kg, 'time_s', ls.time_s,
        'skipped', ls.skipped, 'extra', ls.extra, 'kind', ls.kind,
        'planned_reps', ps.reps_max, 'planned_weight_kg', ps.weight_kg, 'planned_time_s', ps.time_s,
        'logged_at', ls.logged_at
      ) order by ls.logged_at)
      from logged_sets ls
      join exercises e on e.id = ls.exercise_id
      left join planned_sets ps on ps.id = ls.planned_set_id
      where ls.session_id = s.id and not ls.archived
    ), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object('exercise_id', n.exercise_id, 'text', n.text))
      from session_notes n where n.session_id = s.id and not n.archived
    ), '[]'::jsonb)
  ) into result
  from sessions s where s.id = link.session_id;

  return result;
end $$;

revoke all on function get_shared_session(text) from public;
grant execute on function get_shared_session(text) to anon, authenticated;

-- Přijetí pozvánky od trenéra (E2)
create or replace function accept_invite(invite_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv coach_invites;
begin
  select * into inv from coach_invites
  where token = invite_token and accepted_by is null and expires_at > now();
  if not found then raise exception 'invite_invalid'; end if;
  if inv.coach_id = auth.uid() then raise exception 'invite_self'; end if;
  insert into coach_clients (coach_id, client_id, status) values (inv.coach_id, auth.uid(), 'active')
    on conflict (coach_id, client_id) do update set status = 'active';
  update coach_invites set accepted_by = auth.uid() where token = invite_token;
  update profiles set roles = array(select distinct unnest(roles || array['coach'])) where id = inv.coach_id;
  return inv.coach_id;
end $$;

revoke all on function accept_invite(text) from public;
grant execute on function accept_invite(text) to authenticated;

-- Stát se trenérem (E2): role coach si uživatel zapne sám
create or replace function become_coach() returns void
language sql security definer set search_path = public as $$
  update profiles set roles = array(select distinct unnest(roles || array['coach'])) where id = auth.uid()
$$;
revoke all on function become_coach() from public;
grant execute on function become_coach() to authenticated;

-- Role si uživatel nemůže změnit přímo (jen přes become_coach / accept_invite)
create or replace function guard_profile_roles() returns trigger language plpgsql as $$
begin
  if new.roles is distinct from old.roles and current_user in ('authenticated', 'anon') then
    raise exception 'roles_readonly';
  end if;
  return new;
end $$;
drop trigger if exists guard_roles on profiles;
create trigger guard_roles before update on profiles for each row execute function guard_profile_roles();
