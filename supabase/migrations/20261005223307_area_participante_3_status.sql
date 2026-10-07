-- Área do participante: inscrições em eventos, presença e certificados.
-- Vagas restantes de um evento (sem expor quem se inscreveu).
create or replace function public.registration_status(p_page uuid)
returns table (registered integer, capacity integer, open boolean)
language sql stable security definer set search_path = '' as $$
  select (select count(*)::integer from public.registrations r where r.page_id = p.id),
         p.capacity,
         p.registration_enabled
    from public.pages p
   where p.id = p_page and p.kind = 'evento'
     and (p.status = 'published' or (p.status = 'scheduled' and p.publish_at <= now()));
$$;
grant execute on function public.registration_status(uuid) to anon, authenticated;
