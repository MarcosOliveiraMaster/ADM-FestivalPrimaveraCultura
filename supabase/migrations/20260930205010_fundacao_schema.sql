-- ===== Tipos =====
create type public.app_role as enum ('admin', 'editor');
create type public.page_kind as enum ('home', 'evento', 'institucional');
create type public.page_status as enum ('draft', 'published', 'scheduled');
create type public.submission_status as enum ('novo', 'contatado', 'confirmado', 'descartado');

-- ===== Utilidades =====
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ===== Equipe =====
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role public.app_role not null default 'editor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_invites (
  email text primary key check (email = lower(email)),
  role public.app_role not null default 'editor',
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()))
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
$$;

-- Cria o perfil quando um usuário convidado confirma o e-mail
create or replace function public.handle_confirmed_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  inv public.staff_invites;
begin
  if new.email_confirmed_at is null then
    return new;
  end if;
  select * into inv from public.staff_invites where email = lower(new.email);
  if found then
    insert into public.profiles (id, email, full_name, role)
    values (new.id, lower(new.email), new.raw_user_meta_data ->> 'full_name', inv.role)
    on conflict (id) do nothing;
    delete from public.staff_invites where email = inv.email;
  end if;
  return new;
end $$;

create trigger on_auth_user_confirmed
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.handle_confirmed_user();

-- Convite para quem já tem conta confirmada vira perfil na hora
create or replace function public.handle_new_invite()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  u auth.users;
begin
  select * into u from auth.users
   where lower(email) = new.email and email_confirmed_at is not null;
  if found then
    insert into public.profiles (id, email, full_name, role)
    values (u.id, new.email, u.raw_user_meta_data ->> 'full_name', new.role)
    on conflict (id) do update set role = excluded.role;
    return null; -- não guarda o convite
  end if;
  return new;
end $$;

create trigger on_staff_invite
  before insert on public.staff_invites
  for each row execute function public.handle_new_invite();

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ===== Configurações do site (registro único) =====
create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  festival_name text not null default 'Festival da Primavera',
  tagline text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  schedule_text text,
  brand jsonb not null default '{}'::jsonb,   -- logo_url, logo_light_url, favicon_url, og_image_url, hero_cover_url, event_cover_url
  theme jsonb not null default '{}'::jsonb,   -- cores e fontes
  nav jsonb not null default '[]'::jsonb,
  footer jsonb not null default '{}'::jsonb,
  social jsonb not null default '{}'::jsonb,
  privacy_text text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
insert into public.site_settings (id, nav) values (1,
  '[{"label":"Início","href":"/","visible":true},
    {"label":"Sobre","href":"/#sobre","visible":true},
    {"label":"Eventos","href":"/eventos","visible":true,"auto":"eventos"},
    {"label":"Contato","href":"/#contato","visible":true}]'::jsonb);

create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ===== Páginas =====
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  kind public.page_kind not null default 'evento',
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  status public.page_status not null default 'draft',
  publish_at timestamptz,
  category text,
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  cover_url text,
  show_in_nav boolean not null default true,
  sort_order integer not null default 0,
  seo jsonb not null default '{}'::jsonb,
  content jsonb not null default '{"sections":[]}'::jsonb, -- versão publicada
  published_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index pages_single_home on public.pages (kind) where kind = 'home';
create index pages_public_idx on public.pages (status, kind, sort_order);

create trigger pages_updated_at before update on public.pages
  for each row execute function public.set_updated_at();

-- Rascunhos ficam separados para nunca vazarem ao público
create table public.page_drafts (
  page_id uuid primary key references public.pages (id) on delete cascade,
  content jsonb not null default '{"sections":[]}'::jsonb,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger page_drafts_updated_at before update on public.page_drafts
  for each row execute function public.set_updated_at();

create table public.page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  content jsonb not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index page_versions_page_idx on public.page_versions (page_id, created_at desc);

-- ===== Mídia =====
create table public.media (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  url text not null,
  mime text,
  size_bytes bigint,
  width integer,
  height integer,
  alt text,
  folder text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ===== Formulários =====
create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.pages (id) on delete set null,
  name text not null check (char_length(name) between 1 and 200),
  email text check (char_length(email) <= 320),
  phone text check (char_length(phone) <= 40),
  city text check (char_length(city) <= 120),
  interests text[] not null default '{}',
  heard_from text check (char_length(heard_from) <= 200),
  message text check (char_length(message) <= 5000),
  consent boolean not null,
  newsletter boolean not null default false,
  extra jsonb not null default '{}'::jsonb,
  utm jsonb not null default '{}'::jsonb,
  referrer text,
  status public.submission_status not null default 'novo',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index form_submissions_created_idx on public.form_submissions (created_at desc);
create index form_submissions_page_idx on public.form_submissions (page_id);
create trigger form_submissions_updated_at before update on public.form_submissions
  for each row execute function public.set_updated_at();

-- ===== Métricas =====
create table public.page_views (
  id bigint generated always as identity primary key,
  page_id uuid references public.pages (id) on delete set null,
  path text not null check (char_length(path) <= 500),
  referrer text check (char_length(referrer) <= 1000),
  utm_source text, utm_medium text, utm_campaign text,
  device text check (device in ('mobile', 'tablet', 'desktop')),
  session_hash text,
  created_at timestamptz not null default now()
);
create index page_views_created_idx on public.page_views (created_at desc);
create index page_views_page_idx on public.page_views (page_id, created_at desc);

create table public.click_events (
  id bigint generated always as identity primary key,
  page_id uuid references public.pages (id) on delete set null,
  target text not null check (char_length(target) <= 500),
  label text check (char_length(label) <= 200),
  path text check (char_length(path) <= 500),
  session_hash text,
  created_at timestamptz not null default now()
);
create index click_events_created_idx on public.click_events (created_at desc);
create index click_events_page_idx on public.click_events (page_id, created_at desc);

-- ===== RLS =====
alter table public.profiles enable row level security;
alter table public.staff_invites enable row level security;
alter table public.site_settings enable row level security;
alter table public.pages enable row level security;
alter table public.page_drafts enable row level security;
alter table public.page_versions enable row level security;
alter table public.media enable row level security;
alter table public.form_submissions enable row level security;
alter table public.page_views enable row level security;
alter table public.click_events enable row level security;

-- profiles
create policy "equipe vê equipe" on public.profiles for select to authenticated using ((select public.is_staff()));
create policy "usuário edita o próprio nome" on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role = (select public.current_app_role()));
create policy "admin muda papel de outros" on public.profiles for update to authenticated
  using ((select public.is_admin()) and id <> (select auth.uid()))
  with check ((select public.is_admin()));
create policy "admin remove outros" on public.profiles for delete to authenticated
  using ((select public.is_admin()) and id <> (select auth.uid()));

-- staff_invites
create policy "admin gerencia convites" on public.staff_invites for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- site_settings
create policy "todos leem configurações" on public.site_settings for select to anon, authenticated using (true);
create policy "admin edita configurações" on public.site_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- pages
create policy "público lê páginas publicadas" on public.pages for select to anon, authenticated
  using (status = 'published' or (status = 'scheduled' and publish_at <= now()) or (select public.is_staff()));
create policy "equipe cria páginas" on public.pages for insert to authenticated with check ((select public.is_staff()));
create policy "equipe edita páginas" on public.pages for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "admin exclui páginas" on public.pages for delete to authenticated using ((select public.is_admin()));

-- page_drafts / page_versions
create policy "equipe gerencia rascunhos" on public.page_drafts for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "equipe lê versões" on public.page_versions for select to authenticated using ((select public.is_staff()));
create policy "equipe cria versões" on public.page_versions for insert to authenticated with check ((select public.is_staff()));

-- media
create policy "todos leem mídia" on public.media for select to anon, authenticated using (true);
create policy "equipe gerencia mídia" on public.media for insert to authenticated with check ((select public.is_staff()));
create policy "equipe edita mídia" on public.media for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "equipe remove mídia" on public.media for delete to authenticated using ((select public.is_staff()));

-- form_submissions: público só envia; admin vê e gerencia
create policy "público envia formulário" on public.form_submissions for insert to anon, authenticated
  with check (consent = true and status = 'novo' and notes is null);
create policy "admin lê formulários" on public.form_submissions for select to authenticated using ((select public.is_admin()));
create policy "admin atualiza formulários" on public.form_submissions for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin exclui formulários" on public.form_submissions for delete to authenticated using ((select public.is_admin()));

-- métricas: público registra; admin lê
create policy "público registra visita" on public.page_views for insert to anon, authenticated with check (true);
create policy "admin lê visitas" on public.page_views for select to authenticated using ((select public.is_admin()));
create policy "público registra clique" on public.click_events for insert to anon, authenticated with check (true);
create policy "admin lê cliques" on public.click_events for select to authenticated using ((select public.is_admin()));

-- ===== Storage =====
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800,
  array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','image/avif',
        'video/mp4','video/webm','application/pdf','font/woff2','font/woff','font/ttf','font/otf']);

create policy "equipe envia arquivos" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_staff()));
create policy "equipe edita arquivos" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (select public.is_staff()));
create policy "equipe remove arquivos" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (select public.is_staff()));

-- ===== Primeiro admin =====
insert into public.staff_invites (email, role) values ('marcos.lucas.ti@gmail.com', 'admin');
