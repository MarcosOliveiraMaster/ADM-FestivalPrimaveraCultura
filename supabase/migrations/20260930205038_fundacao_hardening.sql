-- Funções internas saem do schema exposto pela API
create schema if not exists private;
grant usage on schema private to anon, authenticated;

alter function public.current_app_role() set schema private;
alter function public.is_staff() set schema private;
alter function public.is_admin() set schema private;
alter function public.handle_confirmed_user() set schema private;
alter function public.handle_new_invite() set schema private;
alter function public.set_updated_at() set schema private;

revoke execute on function private.handle_confirmed_user() from public, anon, authenticated;
revoke execute on function private.handle_new_invite() from public, anon, authenticated;

-- Política única de atualização de perfis
drop policy "usuário edita o próprio nome" on public.profiles;
drop policy "admin muda papel de outros" on public.profiles;
create policy "atualizar perfis" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (
    (id = (select auth.uid()) and role = (select private.current_app_role()))
    or ((select private.is_admin()) and id <> (select auth.uid()))
  );

-- Índices de chaves estrangeiras
create index on public.media (created_by);
create index on public.page_drafts (updated_by);
create index on public.page_versions (created_by);
create index on public.pages (created_by);
create index on public.pages (updated_by);
create index on public.site_settings (updated_by);
create index on public.staff_invites (invited_by);
