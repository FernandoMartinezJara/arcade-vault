-- SPEC 06: real scores. Inserted anonymously until Auth lands (see spec risks).

create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games (id) on delete cascade,
  name        text not null check (name ~ '^[A-Z0-9_ ]{1,10}$' and name = btrim(name)),
  score       int not null check (score between 0 and 9999999),
  created_at  timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc, created_at);

alter table public.scores enable row level security;

create policy "scores are readable by everyone"
  on public.scores for select
  to anon, authenticated
  using (true);

-- Only real (playable) games accept scores; demo games simulate theirs.
create policy "scores can be inserted for playable games"
  on public.scores for insert
  to anon, authenticated
  with check (
    exists (select 1 from public.games g where g.id = game_id and g.playable)
  );
