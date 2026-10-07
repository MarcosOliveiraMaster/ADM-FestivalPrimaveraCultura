-- Área do participante: inscrições em eventos, presença e certificados.
-- Validação pública de certificado pelo código impresso.
create or replace function public.verify_certificate(p_code text)
returns table (full_name text, event_title text, starts_at timestamptz, ends_at timestamptz, location text, hours numeric)
language sql stable security definer set search_path = '' as $$
  select r.full_name, p.title, p.starts_at, p.ends_at, p.location, p.certificate_hours
    from public.registrations r
    join public.pages p on p.id = r.page_id
   where r.certificate_code = upper(trim(p_code)) and r.attended;
$$;
grant execute on function public.verify_certificate(text) to anon, authenticated;
