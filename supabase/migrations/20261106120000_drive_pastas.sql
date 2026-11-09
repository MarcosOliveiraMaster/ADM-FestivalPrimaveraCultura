-- Pastas do Google Drive vinculadas à biblioteca de mídia.
-- Nada é copiado para o armazenamento: guardamos só os dados de cada arquivo (id, nome, tipo)
-- e o site exibe direto do Drive. As pastas precisam estar como "Qualquer pessoa com o link".
create table if not exists public.drive_folders (
  id uuid primary key default gen_random_uuid(),
  drive_id text not null unique,
  name text not null,
  url text not null,
  file_count int not null default 0,
  last_upload_at timestamptz,          -- data do arquivo mais recente da pasta no Drive
  synced_at timestamptz,               -- última vez que clicamos em "Atualizar"
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.drive_files (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.drive_folders (id) on delete cascade,
  drive_id text not null,
  name text not null,
  mime text not null,
  size_bytes bigint,
  width int,
  height int,
  drive_created_at timestamptz,
  unique (folder_id, drive_id)
);
create index if not exists drive_files_folder_idx on public.drive_files (folder_id, name);
create index if not exists drive_folders_created_by_idx on public.drive_folders (created_by);

alter table public.drive_folders enable row level security;
alter table public.drive_files enable row level security;

create policy "equipe lê pastas do drive" on public.drive_folders for select to authenticated using ((select private.is_staff()));
create policy "equipe cria pastas do drive" on public.drive_folders for insert to authenticated with check ((select private.is_staff()));
create policy "equipe edita pastas do drive" on public.drive_folders for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "equipe remove pastas do drive" on public.drive_folders for delete to authenticated using ((select private.is_staff()));

create policy "equipe lê arquivos do drive" on public.drive_files for select to authenticated using ((select private.is_staff()));
create policy "equipe cria arquivos do drive" on public.drive_files for insert to authenticated with check ((select private.is_staff()));
create policy "equipe edita arquivos do drive" on public.drive_files for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "equipe remove arquivos do drive" on public.drive_files for delete to authenticated using ((select private.is_staff()));
