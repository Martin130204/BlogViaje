-- ============================================================================
--  schema.sql — Estructura de la base de datos en Supabase para "Viaje Asia".
--  Cómo usarlo: Supabase → SQL Editor → New query → pega TODO esto → Run.
--  Luego crea los buckets de Storage (ver el bloque STORAGE al final).
-- ============================================================================

-- ── PERFILES (usuarios) ─────────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  username     text unique,
  display_name text,
  bio          text,
  avatar_url   text,
  role         text not null default 'viewer',   -- 'viewer' | 'editor'
  updated_at   timestamptz default now()
);

-- Crea automáticamente la fila de perfil al registrarse (usa metadata del signUp)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, username, role)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'username', ''),
    coalesce(new.raw_user_meta_data->>'role', 'viewer')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ── DIARIO ───────────────────────────────────────────────────────────────────
create table if not exists public.diario (
  id         uuid primary key default gen_random_uuid(),
  author     text,
  author_uid uuid references auth.users(id) on delete set null,
  date       text,
  place      text,
  country    text,
  title      text,
  body       text,
  photos     text[] default '{}',
  created_at timestamptz default now()
);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  entry_id   uuid references public.diario(id) on delete cascade,
  author     text,
  uid        uuid references auth.users(id) on delete set null,
  body       text,
  created_at timestamptz default now()
);

create table if not exists public.reactions (
  id         uuid primary key default gen_random_uuid(),
  entry_id   uuid references public.diario(id) on delete cascade,
  emoji      text,
  uid        uuid references auth.users(id) on delete cascade,
  name       text,
  created_at timestamptz default now(),
  unique (entry_id, emoji, uid)
);

-- ── PUNTUACIONES ──────────────────────────────────────────────────────────────
create table if not exists public.ratings (
  uid        uuid references auth.users(id) on delete cascade,
  place      text,
  value      numeric,
  name       text,
  updated_at timestamptz default now(),
  primary key (uid, place)
);

-- ── CHECKLIST (preparación) ─────────────────────────────────────────────────────
create table if not exists public.checklist (
  id         text primary key,
  done       boolean,
  updated_at timestamptz default now()
);

-- ── MENSAJES PRIVADOS ──────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id           text primary key,          -- "uid1_uid2" (uids ordenados)
  participants text[] not null,
  last_msg     text,
  last_from    uuid,
  last_ts      timestamptz
);
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  conv_id    text references public.conversations(id) on delete cascade,
  from_uid   uuid references auth.users(id) on delete set null,
  body       text,
  created_at timestamptz default now()
);

-- ============================================================================
--  ROW LEVEL SECURITY — lectura pública, escritura sólo del dueño (o editor).
-- ============================================================================
alter table public.profiles      enable row level security;
alter table public.diario        enable row level security;
alter table public.comments      enable row level security;
alter table public.reactions     enable row level security;
alter table public.ratings       enable row level security;
alter table public.checklist     enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;

-- Helper: ¿el usuario actual es editor?
create or replace function public.is_editor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'editor');
$$;

-- PROFILES: todos leen; cada quien edita su fila
create policy "profiles read"        on public.profiles for select using (true);
create policy "profiles insert self" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles update self" on public.profiles for update using (auth.uid() = id);

-- DIARIO: todos leen; autor inserta; autor o editor edita/borra
create policy "diario read"   on public.diario for select using (true);
create policy "diario insert" on public.diario for insert with check (auth.uid() = author_uid);
create policy "diario update" on public.diario for update using (auth.uid() = author_uid or public.is_editor());
create policy "diario delete" on public.diario for delete using (auth.uid() = author_uid or public.is_editor());

-- COMMENTS: todos leen; autor inserta; autor o editor borra
create policy "comments read"   on public.comments for select using (true);
create policy "comments insert" on public.comments for insert with check (auth.uid() = uid);
create policy "comments delete" on public.comments for delete using (auth.uid() = uid or public.is_editor());

-- REACTIONS: todos leen; dueño inserta/borra
create policy "reactions read"   on public.reactions for select using (true);
create policy "reactions insert" on public.reactions for insert with check (auth.uid() = uid);
create policy "reactions delete" on public.reactions for delete using (auth.uid() = uid);

-- RATINGS: todos leen; SÓLO el grupo viajero (editor) puntúa
create policy "ratings read"   on public.ratings for select using (true);
create policy "ratings write"  on public.ratings for insert with check (auth.uid() = uid and public.is_editor());
create policy "ratings update" on public.ratings for update using (auth.uid() = uid and public.is_editor());
create policy "ratings delete" on public.ratings for delete using (auth.uid() = uid);

-- CHECKLIST: todos leen; cualquier usuario autenticado escribe
create policy "checklist read"  on public.checklist for select using (true);
create policy "checklist write" on public.checklist for insert with check (auth.uid() is not null);
create policy "checklist upd"   on public.checklist for update using (auth.uid() is not null);

-- CONVERSATIONS / MESSAGES: sólo los participantes
create policy "conv read"   on public.conversations for select using (auth.uid()::text = any(participants));
create policy "conv write"  on public.conversations for insert with check (auth.uid()::text = any(participants));
create policy "conv update" on public.conversations for update using (auth.uid()::text = any(participants));
create policy "msg read"    on public.messages for select using (auth.uid()::text = any(string_to_array(conv_id, '_')));
create policy "msg write"   on public.messages for insert with check (auth.uid() = from_uid);

-- ── REALTIME: publica las tablas para suscripciones en vivo ──────────────────
alter publication supabase_realtime add table
  public.diario, public.comments, public.reactions, public.ratings,
  public.checklist, public.profiles, public.conversations, public.messages;

-- ============================================================================
--  STORAGE — crea dos buckets PÚBLICOS desde el panel (Storage → New bucket):
--    1) "avatars"  (Public bucket: ON)
--    2) "diario"   (Public bucket: ON)
--  Luego pega estas políticas para permitir subir a usuarios autenticados:
-- ============================================================================
create policy "avatars public read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars auth write"  on storage.objects for insert to authenticated with check (bucket_id = 'avatars');
create policy "avatars auth update" on storage.objects for update to authenticated using (bucket_id = 'avatars');
create policy "diario public read"  on storage.objects for select using (bucket_id = 'diario');
create policy "diario auth write"   on storage.objects for insert to authenticated with check (bucket_id = 'diario');
