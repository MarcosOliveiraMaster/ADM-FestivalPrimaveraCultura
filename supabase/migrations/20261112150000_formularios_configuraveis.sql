-- Formulário de inscrição configurável (campos padrão + extras), inscrições sempre abertas,
-- respostas por formulário e conversão da "Oficina com o Palhaço Biribinha" em capacitação.

-- 1) Respostas guardadas por inscrição
alter table public.training_registrations
  add column if not exists form_id text,
  add column if not exists answers jsonb not null default '{}'::jsonb,
  add column if not exists address jsonb;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'training_registrations_answers_size') then
    alter table public.training_registrations add constraint training_registrations_answers_size
      check (pg_column_size(answers) < 20000 and (address is null or pg_column_size(address) < 4000));
  end if;
end $$;

-- 2) Inscrição sempre aberta (sem "fechada" e sem limite de vagas). Mesmo e-mail na mesma página
--    atualiza a inscrição (enquanto a presença não foi confirmada); em páginas diferentes, inscrições separadas.
drop function if exists public.register_training(uuid, text, text, text, text);
create or replace function public.register_training(
  p_page uuid, p_name text, p_email text, p_phone text default null, p_cpf text default null,
  p_form text default null, p_answers jsonb default '{}'::jsonb, p_address jsonb default null)
returns uuid
language plpgsql security definer set search_path = '' as $fn$
declare
  pg public.pages;
  doc text := nullif(regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g'), '');
  rid uuid;
begin
  select * into pg from public.pages where id = p_page;
  if not found or pg.kind not in ('evento', 'cortejo', 'capacitacao')
     or not (pg.status = 'published' or (pg.status = 'scheduled' and pg.publish_at <= now())) then
    raise exception 'Página não encontrada.' using errcode = 'P0002';
  end if;
  if doc is not null and doc !~ '^[0-9]{11}$' then
    raise exception 'CPF inválido.' using errcode = 'P0001';
  end if;
  insert into public.training_registrations as tr (page_id, form_id, name, email, phone, cpf, answers, address)
  values (pg.id, left(p_form, 64), trim(p_name), lower(trim(p_email)), nullif(trim(coalesce(p_phone, '')), ''), doc,
          coalesce(p_answers, '{}'::jsonb), p_address)
  on conflict (page_id, email) do update
     set name = excluded.name,
         form_id = coalesce(excluded.form_id, tr.form_id),
         phone = coalesce(excluded.phone, tr.phone),
         cpf = coalesce(excluded.cpf, tr.cpf),
         answers = tr.answers || excluded.answers,
         address = coalesce(excluded.address, tr.address)
   where not tr.attended
  returning id into rid;
  if rid is null then
    -- Presença já confirmada: mantém os dados do certificado como estão.
    select id into rid from public.training_registrations where page_id = pg.id and email = lower(trim(p_email));
  end if;
  return rid;
end $fn$;
grant execute on function public.register_training(uuid, text, text, text, text, text, jsonb, jsonb) to anon, authenticated;

create or replace function public.training_status(p_page uuid)
returns table (registered integer, capacity integer, open boolean)
language sql stable security definer set search_path = '' as $fn$
  select (select count(*)::integer from public.training_registrations r where r.page_id = p.id), null::integer, true
    from public.pages p
   where p.id = p_page and p.kind in ('evento', 'cortejo', 'capacitacao')
     and (p.status = 'published' or (p.status = 'scheduled' and p.publish_at <= now()));
$fn$;

-- 3) Certificado: respostas extras e endereço só saem se o modelo usar essas variáveis.
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
    'cpf', case when tpl is null or txt like '%{{cpf}}%' then r.cpf end,
    'email', case when txt like '%{{email}}%' then r.email end,
    'phone', case when txt like '%{{telefone}}%' then r.phone end,
    'address', case when txt ~ '\{\{(endereco|cidade|uf|cep)\}\}' then r.address end,
    'answers', (select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from jsonb_each(r.answers) as a(k, v) where txt like '%{{' || k || '}}%'),
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

-- 4) Oficina com o Palhaço Biribinha: vira capacitação; o formulário de interesse vira formulário
--    de inscrição (mantém a pergunta de atuação como campo extra) e a inscrição já recebida é copiada.
create or replace function private.tmp_form_to_training(b jsonb) returns jsonb language sql immutable as $$
  select b || jsonb_build_object('type', 'training', 'props', jsonb_build_object(
    'title', b->'props'->'title',
    'intro', b->'props'->'intro',
    'buttonLabel', b->'props'->'buttonLabel',
    'successMessage', b->'props'->'successMessage',
    'fields', jsonb_build_object(
      'cpf', jsonb_build_object('on', true, 'required', false),
      'phone', jsonb_build_object('on', coalesce((b->'props'->'fields'->>'phone')::boolean, false), 'required', false),
      'address', jsonb_build_object('on', false, 'required', false)),
    'custom', case when coalesce((b->'props'->'fields'->>'interests')::boolean, false) then jsonb_build_array(jsonb_build_object(
      'key', 'atuacao', 'label', 'Interesse em (atuação na cultura)', 'type', 'checkbox',
      'options', coalesce(b->'props'->'interestOptions', '[]'::jsonb), 'required', false, 'keyLocked', true)) else '[]'::jsonb end))
$$;
create or replace function private.tmp_convert_content(c jsonb) returns jsonb language sql immutable as $$
  select jsonb_set(c, '{sections}', coalesce((
    select jsonb_agg(jsonb_set(s, '{columns}', coalesce((
      select jsonb_agg(coalesce((
        select jsonb_agg(case when b->>'type' = 'form' then private.tmp_form_to_training(b) else b end order by bo)
          from jsonb_array_elements(col) with ordinality x(b, bo)), '[]'::jsonb) order by co)
        from jsonb_array_elements(s->'columns') with ordinality y(col, co)), '[]'::jsonb)) order by so)
      from jsonb_array_elements(c->'sections') with ordinality z(s, so)), '[]'::jsonb))
$$;

update public.pages set content = private.tmp_convert_content(content), kind = 'capacitacao'
 where id = 'fc555666-9382-4183-af09-836eea20f38e';
update public.page_drafts set content = private.tmp_convert_content(content)
 where page_id = 'fc555666-9382-4183-af09-836eea20f38e';

insert into public.training_registrations (page_id, form_id, name, email, phone, answers, created_at)
select f.page_id, 'bir3f0000001', f.name, lower(f.email), f.phone,
       case when coalesce(array_length(f.interests, 1), 0) > 0 then jsonb_build_object('atuacao', to_jsonb(f.interests)) else '{}'::jsonb end,
       f.created_at
  from public.form_submissions f
 where f.page_id = 'fc555666-9382-4183-af09-836eea20f38e' and f.email is not null and f.name is not null
on conflict (page_id, email) do nothing;

drop function private.tmp_convert_content(jsonb);
drop function private.tmp_form_to_training(jsonb);
