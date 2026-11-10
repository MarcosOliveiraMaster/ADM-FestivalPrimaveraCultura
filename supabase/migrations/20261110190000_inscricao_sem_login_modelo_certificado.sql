-- Inscrição sem login para eventos, cortejos e capacitações (tabela training_registrations),
-- CPF opcional e modelo de certificado editável (padrão do festival + por página).

-- CPF (só dígitos, opcional)
alter table public.training_registrations add column if not exists cpf text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'training_registrations_cpf_check') then
    alter table public.training_registrations add constraint training_registrations_cpf_check check (cpf is null or cpf ~ '^[0-9]{11}$');
  end if;
end $$;

-- Modelos de certificado (JSON do editor visual). Página sem modelo usa o padrão do festival.
alter table public.site_settings add column if not exists certificate_template jsonb;
alter table public.pages add column if not exists certificate_template jsonb;

-- Inscrição pública: qualquer área (evento, cortejo, capacitação) publicada e com inscrições abertas.
drop function if exists public.register_training(uuid, text, text, text);
create or replace function public.register_training(p_page uuid, p_name text, p_email text, p_phone text, p_cpf text default null)
returns uuid
language plpgsql security definer set search_path = '' as $fn$
declare
  pg public.pages;
  total integer;
  new_id uuid;
  doc text := nullif(regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g'), '');
begin
  select * into pg from public.pages where id = p_page for update;
  if not found or pg.kind not in ('evento', 'cortejo', 'capacitacao')
     or not (pg.status = 'published' or (pg.status = 'scheduled' and pg.publish_at <= now())) then
    raise exception 'Página não encontrada.' using errcode = 'P0002';
  end if;
  if not pg.registration_enabled then
    raise exception 'As inscrições não estão abertas.' using errcode = 'P0001';
  end if;
  if doc is not null and doc !~ '^[0-9]{11}$' then
    raise exception 'CPF inválido.' using errcode = 'P0001';
  end if;
  if pg.capacity is not null then
    select count(*) into total from public.training_registrations where page_id = pg.id;
    if total >= pg.capacity then
      raise exception 'As vagas esgotaram.' using errcode = 'P0001';
    end if;
  end if;
  insert into public.training_registrations (page_id, name, email, phone, cpf)
  values (pg.id, trim(p_name), lower(trim(p_email)), nullif(trim(coalesce(p_phone, '')), ''), doc)
  returning id into new_id;
  return new_id;
exception when unique_violation then
  raise exception 'Este e-mail já está inscrito.' using errcode = 'P0001';
end $fn$;
grant execute on function public.register_training(uuid, text, text, text, text) to anon, authenticated;

create or replace function public.training_status(p_page uuid)
returns table (registered integer, capacity integer, open boolean)
language sql stable security definer set search_path = '' as $fn$
  select (select count(*)::integer from public.training_registrations r where r.page_id = p.id),
         p.capacity, p.registration_enabled
    from public.pages p
   where p.id = p_page and p.kind in ('evento', 'cortejo', 'capacitacao')
     and (p.status = 'published' or (p.status = 'scheduled' and p.publish_at <= now()));
$fn$;
grant execute on function public.training_status(uuid) to anon, authenticated;

-- Dados para montar o certificado pelo código (página pública /certificado/<código>, validação por QR).
-- Só com presença confirmada. CPF, e-mail e telefone só saem se o modelo usar essas variáveis.
create or replace function public.certificate_data(p_code text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $fn$
declare
  r public.training_registrations;
  pg public.pages;
  st public.site_settings;
  tpl jsonb;
  txt text;
begin
  select * into r from public.training_registrations where certificate_code = upper(trim(p_code)) and attended;
  if not found then
    return null;
  end if;
  select * into pg from public.pages where id = r.page_id;
  select * into st from public.site_settings where id = 1;
  tpl := coalesce(pg.certificate_template, st.certificate_template);
  txt := coalesce(tpl::text, '');
  return jsonb_build_object(
    'template', tpl,
    'festival', st.festival_name,
    'theme', st.theme,
    'name', r.name,
    'cpf', case when tpl is null or txt like '%{{cpf}}%' then r.cpf end, -- o modelo padrão usa o CPF
    'email', case when txt like '%{{email}}%' then r.email end,
    'phone', case when txt like '%{{telefone}}%' then r.phone end,
    'code', r.certificate_code,
    'title', pg.title,
    'kind', pg.kind,
    'starts_at', pg.starts_at,
    'ends_at', pg.ends_at,
    'location', pg.location,
    'hours', pg.certificate_hours
  );
end $fn$;
revoke execute on function public.certificate_data(text) from public;
grant execute on function public.certificate_data(text) to anon, authenticated;

-- Validação antiga (texto) passa a olhar só a tabela única de inscrições.
create or replace function public.verify_certificate(p_code text)
returns table (full_name text, event_title text, starts_at timestamptz, ends_at timestamptz, location text, hours numeric)
language sql stable security definer set search_path = '' as $$
  select t.name, p.title, p.starts_at, p.ends_at, p.location, p.certificate_hours
    from public.training_registrations t
    join public.pages p on p.id = t.page_id
   where t.certificate_code = upper(trim(p_code)) and t.attended
  limit 1;
$$;
grant execute on function public.verify_certificate(text) to anon, authenticated;
