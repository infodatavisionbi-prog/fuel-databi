-- ════════════════════════════════════════════════════════════
--  FUEL · DataVision BI  —  Supabase Schema
--  Ejecutar en el SQL Editor de Supabase
-- ════════════════════════════════════════════════════════════

-- ── PROFILES ──────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  email         text,
  full_name     text,
  company_name  text not null,
  role          text not null default 'user' check (role in ('user', 'admin')),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz
);

-- ── DASHBOARDS ────────────────────────────────────────────
create table if not exists public.dashboards (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  embed_url   text not null,
  created_by  uuid references auth.users on delete set null,
  created_at  timestamptz not null default now()
);

-- ── USER ↔ DASHBOARD ASSIGNMENTS ─────────────────────────
create table if not exists public.user_dashboards (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  dashboard_id uuid not null references public.dashboards on delete cascade,
  assigned_at  timestamptz not null default now(),
  assigned_by  uuid references auth.users on delete set null,
  unique (user_id, dashboard_id)
);

-- ════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════
alter table public.profiles       enable row level security;
alter table public.dashboards      enable row level security;
alter table public.user_dashboards enable row level security;

-- ── PROFILES policies ─────────────────────────────────────
create policy "profiles: own read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: admin read all"
  on public.profiles for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "profiles: own insert"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: own update"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles: admin update"
  on public.profiles for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ── DASHBOARDS policies ───────────────────────────────────
create policy "dashboards: admin full"
  on public.dashboards for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "dashboards: user read assigned"
  on public.dashboards for select
  using (
    exists (
      select 1 from public.user_dashboards
      where user_id = auth.uid() and dashboard_id = dashboards.id
    )
  );

-- ── USER_DASHBOARDS policies ──────────────────────────────
create policy "user_dashboards: admin full"
  on public.user_dashboards for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "user_dashboards: own read"
  on public.user_dashboards for select
  using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════
--  INDICES
-- ════════════════════════════════════════════════════════════
create index if not exists idx_user_dashboards_user  on public.user_dashboards (user_id);
create index if not exists idx_user_dashboards_board on public.user_dashboards (dashboard_id);
create index if not exists idx_profiles_role         on public.profiles (role);

-- ════════════════════════════════════════════════════════════
--  PRIMER ADMIN — ejecutar despues del primer registro:
--    update public.profiles set role = 'admin' where email = 'admin@tuempresa.com';
-- ════════════════════════════════════════════════════════════
