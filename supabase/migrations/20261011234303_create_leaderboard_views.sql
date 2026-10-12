-- SPEC 06: best score per name and per-game stats. security_invoker keeps table RLS in force.

-- Best mark per (game, name). Ties go to whoever reached the score first.
create view public.leaderboard with (security_invoker = true) as
select
  game_id,
  name,
  score,
  created_at,
  row_number() over (partition by game_id order by score desc, created_at asc) as rank
from (
  select distinct on (game_id, name) game_id, name, score, created_at
  from public.scores
  order by game_id, name, score desc, created_at asc
) best;

-- Games without plays: best null, plays 0.
create view public.game_stats with (security_invoker = true) as
select
  g.id as game_id,
  max(s.score) as best,
  count(s.id)::int as plays
from public.games g
left join public.scores s on s.game_id = g.id
group by g.id;

grant select on public.leaderboard to anon, authenticated;
grant select on public.game_stats to anon, authenticated;
