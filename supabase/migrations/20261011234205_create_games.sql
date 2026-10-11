-- SPEC 06: game catalog, ported from the former GAMES array in lib/games.ts.

create table public.games (
  id          text primary key,
  title       text not null,
  short       text not null,
  long        text not null,
  cat         text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover       text not null,
  color       text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  playable    boolean not null default false,
  sort_order  int not null unique,
  created_at  timestamptz not null default now()
);

alter table public.games enable row level security;

-- Read-only catalog: no insert/update/delete policies, so anon writes are denied.
create policy "games are readable by everyone"
  on public.games for select
  to anon, authenticated
  using (true);

insert into public.games (id, title, short, long, cat, cover, color, playable, sort_order) values
  ('asteroides', 'ASTEROIDES',
   'Rota, acelera y parte rocas en un campo sin bordes.',
   'Tu nave flota en un campo de asteroides donde salir por un borde te devuelve por el opuesto. Cada roca grande se parte en dos medianas y cada mediana en dos pequeñas. Atrapa el power-up de triple disparo y limpia el campo antes de que te rodeen.',
   'SHOOTER', 'cover-asteroides', 'cyan', true, 1),
  ('bloque-buster', 'BLOQUE BUSTER',
   'Rebota la pelota y destruye muros de neón.',
   'Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?',
   'ARCADE', 'cover-bricks', 'cyan', false, 2),
  ('caida', 'CAÍDA',
   'Encaja las piezas antes de que el techo te aplaste.',
   'Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.',
   'PUZZLE', 'cover-tetro', 'magenta', false, 3),
  ('serpentina', 'SERPENTINA',
   'Crece sin morder tu propia cola.',
   'Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.',
   'ARCADE', 'cover-snake', 'green', false, 4),
  ('gloton', 'GLOTÓN',
   'Devora puntos y escapa de los fantasmas.',
   'Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.',
   'ARCADE', 'cover-glot', 'yellow', false, 5),
  ('invasores', 'INVASORES',
   'Defiende el planeta de filas alienígenas.',
   'Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.',
   'SHOOTER', 'cover-invaders', 'green', false, 6),
  ('rocas', 'ROCAS',
   'Pulveriza asteroides en gravedad cero.',
   'Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte.',
   'SHOOTER', 'cover-rocas', 'yellow', false, 7),
  ('ranaria', 'RANARIA',
   'Cruza la autopista de pixeles.',
   'Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.',
   'ARCADE', 'cover-rana', 'green', false, 8),
  ('duelo-pixel', 'DUELO PIXEL',
   'Dos paletas. Una pelota. Reflejos máximos.',
   'El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.',
   'VERSUS', 'cover-duelo', 'cyan', false, 9);
