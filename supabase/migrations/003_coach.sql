-- Fáze 4: trenér v appce (E2)

-- Stránka pozvánky ukáže jméno trenéra ještě před přihlášením; token ani nic jiného neprozradí.
create or replace function invite_info(invite_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'coach_name', coalesce(nullif(p.name, ''), split_part(p.email, '@', 1)),
    'valid', i.accepted_by is null and i.expires_at > now()
  )
  from coach_invites i join profiles p on p.id = i.coach_id
  where i.token = invite_token
$$;
revoke all on function invite_info(text) from public;
grant execute on function invite_info(text) to anon, authenticated;

-- Trenéři klienta (pro upozornění na komentář od klienta). Jen vlastní vztahy.
create index if not exists coach_clients_client on coach_clients (client_id);
create index if not exists comments_client on comments (client_id, created_at);
