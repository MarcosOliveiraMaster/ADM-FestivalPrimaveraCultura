-- Certificados por e-mail (eventos e capacitações) e presença/certificado nas capacitações.

-- Eventos: quando o certificado foi enviado por e-mail.
alter table public.registrations add column if not exists certificate_sent_at timestamptz;

-- Capacitações: presença, código do certificado e envio por e-mail (mesma dinâmica dos eventos).
alter table public.training_registrations
  add column if not exists attended boolean not null default false,
  add column if not exists certificate_code text not null default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  add column if not exists certificate_sent_at timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'training_registrations_certificate_code_key') then
    alter table public.training_registrations add constraint training_registrations_certificate_code_key unique (certificate_code);
  end if;
end $$;

-- Validação pública pelo código: vale para eventos e capacitações (só com presença confirmada).
create or replace function public.verify_certificate(p_code text)
returns table (full_name text, event_title text, starts_at timestamptz, ends_at timestamptz, location text, hours numeric)
language sql stable security definer set search_path = '' as $$
  select r.full_name, p.title, p.starts_at, p.ends_at, p.location, p.certificate_hours
    from public.registrations r
    join public.pages p on p.id = r.page_id
   where r.certificate_code = upper(trim(p_code)) and r.attended
  union all
  select t.name, p.title, p.starts_at, p.ends_at, p.location, p.certificate_hours
    from public.training_registrations t
    join public.pages p on p.id = t.page_id
   where t.certificate_code = upper(trim(p_code)) and t.attended
  limit 1;
$$;
grant execute on function public.verify_certificate(text) to anon, authenticated;
