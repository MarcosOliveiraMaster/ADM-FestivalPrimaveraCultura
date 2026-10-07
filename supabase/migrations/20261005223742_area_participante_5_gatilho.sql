-- Área do participante: inscrições em eventos, presença e certificados.
-- Na inscrição feita pelo participante, identidade e situação vêm do banco, não do navegador.
create or replace function private.before_registration()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  pg public.pages;
  u auth.users;
  total integer;
begin
  if (select private.is_staff()) then
    return new;
  end if;

  select * into pg from public.pages where id = new.page_id for update; -- serializa a checagem de vagas
  if not found or pg.kind <> 'evento'
     or not (pg.status = 'published' or (pg.status = 'scheduled' and pg.publish_at <= now())) then
    raise exception 'Evento não encontrado.' using errcode = 'P0002';
  end if;
  if not pg.registration_enabled then
    raise exception 'As inscrições para este evento não estão abertas.' using errcode = 'P0001';
  end if;
  if pg.capacity is not null then
    select count(*) into total from public.registrations where page_id = pg.id;
    if total >= pg.capacity then
      raise exception 'As vagas para este evento esgotaram.' using errcode = 'P0001';
    end if;
  end if;

  select * into u from auth.users where id = (select auth.uid());
  new.user_id := u.id;
  new.email := lower(u.email);
  new.full_name := coalesce(nullif(trim(new.full_name), ''), u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', u.email);
  new.attended := false;
  new.email_sent_at := null;
  new.certificate_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  return new;
end $$;
revoke execute on function private.before_registration() from public, anon, authenticated;

create trigger registrations_before_insert
  before insert on public.registrations
  for each row execute function private.before_registration();
