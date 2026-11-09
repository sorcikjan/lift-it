-- Trénink s trenérem bez plánu v appce (záznam ze Stravy nebo ručně) a potvrzení zaplacení

alter table sessions drop constraint if exists sessions_source_check;
alter table sessions add constraint sessions_source_check check (source in ('app', 'baseline', 'coach'));
-- null = netýká se (vlastní trénink), false/true = trénink s trenérem nezaplacen / zaplacen
alter table sessions add column if not exists paid boolean;
