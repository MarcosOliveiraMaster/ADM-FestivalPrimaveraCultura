-- Novos tipos de página (Cortejos e Capacitações) e inscrição em capacitação sem login.
-- (Aplicado no projeto como cortejos_capacitacoes_1..3.)
alter type public.page_kind add value if not exists 'cortejo';
alter type public.page_kind add value if not exists 'capacitacao';

create table if not exists public.training_registrations (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 200),
  email text not null check (char_length(email) <= 320 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  phone text check (phone is null or char_length(phone) <= 40),
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (page_id, email)
);
create index if not exists training_registrations_page_idx on public.training_registrations (page_id);
alter table public.training_registrations enable row level security;

create policy "equipe vê inscrições de capacitação" on public.training_registrations for select to authenticated
  using ((select private.is_staff()));
create policy "equipe edita inscrições de capacitação" on public.training_registrations for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "admin exclui inscrições de capacitação" on public.training_registrations for delete to authenticated
  using ((select private.is_admin()));

-- Inscrição pública: confere tipo, publicação, inscrições abertas e vagas.
create or replace function public.register_training(p_page uuid, p_name text, p_email text, p_phone text)
returns uuid
language plpgsql security definer set search_path = '' as $fn$
declare
  pg public.pages;
  total integer;
  new_id uuid;
begin
  select * into pg from public.pages where id = p_page for update;
  if not found or pg.kind <> 'capacitacao'
     or not (pg.status = 'published' or (pg.status = 'scheduled' and pg.publish_at <= now())) then
    raise exception 'Capacitação não encontrada.' using errcode = 'P0002';
  end if;
  if not pg.registration_enabled then
    raise exception 'As inscrições para esta capacitação não estão abertas.' using errcode = 'P0001';
  end if;
  if pg.capacity is not null then
    select count(*) into total from public.training_registrations where page_id = pg.id;
    if total >= pg.capacity then
      raise exception 'As vagas para esta capacitação esgotaram.' using errcode = 'P0001';
    end if;
  end if;
  insert into public.training_registrations (page_id, name, email, phone)
  values (pg.id, trim(p_name), lower(trim(p_email)), nullif(trim(coalesce(p_phone, '')), ''))
  returning id into new_id;
  return new_id;
exception when unique_violation then
  raise exception 'Este e-mail já está inscrito nesta capacitação.' using errcode = 'P0001';
end $fn$;
grant execute on function public.register_training(uuid, text, text, text) to anon, authenticated;

create or replace function public.training_status(p_page uuid)
returns table (registered integer, capacity integer, open boolean)
language sql stable security definer set search_path = '' as $fn$
  select (select count(*)::integer from public.training_registrations r where r.page_id = p.id),
         p.capacity, p.registration_enabled
    from public.pages p
   where p.id = p_page and p.kind = 'capacitacao'
     and (p.status = 'published' or (p.status = 'scheduled' and p.publish_at <= now()));
$fn$;
grant execute on function public.training_status(uuid) to anon, authenticated;
