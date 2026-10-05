-- Área do participante: inscrições em eventos, presença e certificados.
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 200),
  email text not null check (char_length(email) <= 320),
  attended boolean not null default false,
  certificate_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (page_id, user_id)
);
create index if not exists registrations_user_idx on public.registrations (user_id);

alter table public.registrations enable row level security;

-- Participante vê e cancela as próprias inscrições (até a presença ser confirmada);
-- a equipe vê todas e marca presença; admin pode excluir.
create policy "participante e equipe leem inscrições" on public.registrations for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));
create policy "participante se inscreve" on public.registrations for insert to authenticated
  with check (user_id = (select auth.uid()) or (select private.is_staff()));
create policy "equipe marca presença" on public.registrations for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "participante cancela ou admin exclui" on public.registrations for delete to authenticated
  using ((user_id = (select auth.uid()) and attended = false) or (select private.is_admin()));
