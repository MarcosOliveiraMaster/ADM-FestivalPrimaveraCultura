-- Varredura completa do Google Drive: pasta principal + todas as subpastas, em árvore.
--   parent_id  → pasta imediatamente acima (null na pasta principal)
--   root_id    → pasta principal da árvore (null na própria principal)
--   recursive  → a principal foi adicionada com "varredura completa"
--   file_count → arquivos (imagens/PDFs) só desta pasta
--   total_count / last_upload_at → somando esta pasta e todas as de dentro
alter table public.drive_folders
  add column if not exists parent_id uuid references public.drive_folders (id) on delete cascade,
  add column if not exists root_id uuid references public.drive_folders (id) on delete cascade,
  add column if not exists recursive boolean not null default false,
  add column if not exists total_count int not null default 0;

update public.drive_folders set total_count = file_count where total_count = 0;

-- A mesma pasta do Drive pode existir como principal e também dentro de outra árvore.
alter table public.drive_folders drop constraint if exists drive_folders_drive_id_key;
create unique index if not exists drive_folders_root_drive_uniq on public.drive_folders (drive_id) where parent_id is null;
create unique index if not exists drive_folders_tree_drive_uniq on public.drive_folders (root_id, drive_id) where root_id is not null;
create index if not exists drive_folders_parent_idx on public.drive_folders (parent_id);

-- Recalcula contagens e "último envio" de todas as pastas de uma árvore (chamada após cada varredura).
create or replace function public.drive_recount(p_root uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  with recursive pairs (anc, des) as (
    select id, id from public.drive_folders where id = p_root or root_id = p_root
    union all
    select p.anc, c.id from pairs p join public.drive_folders c on c.parent_id = p.des
  ),
  own as (
    select folder_id, count(*)::int as n, max(drive_created_at) as last
    from public.drive_files
    where folder_id in (select des from pairs)
    group by folder_id
  ),
  agg as (
    select p.anc, coalesce(sum(o.n), 0)::int as total, max(o.last) as last
    from pairs p left join own o on o.folder_id = p.des
    group by p.anc
  )
  update public.drive_folders f
     set total_count = agg.total,
         last_upload_at = agg.last,
         file_count = coalesce((select n from own where own.folder_id = f.id), 0)
    from agg
   where f.id = agg.anc;
$$;

revoke execute on function public.drive_recount(uuid) from public, anon;
grant execute on function public.drive_recount(uuid) to authenticated;
