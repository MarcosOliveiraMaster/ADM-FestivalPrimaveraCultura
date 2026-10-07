-- Convite da equipe com link único (token) válido por 1 hora.
-- Só o hash do token fica no banco. O acesso de equipe passa a ser criado
-- exclusivamente pela Edge Function "aceitar-convite" (com o token válido).
-- (Aplicado no projeto como convite_token_1..4.)
alter table public.staff_invites
  add column if not exists token_hash text unique,
  add column if not exists token_expires_at timestamptz;

create or replace function public.invite_lookup(p_token text)
returns table (email text, role public.app_role, expired boolean)
language sql stable security definer set search_path = '' as $fn$
  select i.email, i.role, coalesce(i.token_expires_at < now(), true)
    from public.staff_invites i
   where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
$fn$;
grant execute on function public.invite_lookup(text) to anon, authenticated;

-- Os gatilhos antigos davam acesso de equipe a qualquer conta confirmada com e-mail convidado
-- (inclusive criada pelo site público). Agora não fazem nada: o acesso exige o token.
create or replace function private.handle_confirmed_user()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  return new;
end $fn$;

create or replace function private.handle_new_invite()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  return new;
end $fn$;

-- Usado só pela Edge Function (service_role) para achar conta já existente.
create or replace function public.staff_user_id(p_email text)
returns uuid language sql stable security definer set search_path = '' as $fn$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$fn$;
revoke execute on function public.staff_user_id(text) from public, anon, authenticated;
grant execute on function public.staff_user_id(text) to service_role;
