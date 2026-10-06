-- Relatório de consumo (armazenamento de mídia e banco de dados) para o painel. Só administradores.
create or replace function public.admin_storage_report()
returns jsonb
language plpgsql stable security definer set search_path = '' as $fn$
declare
  result jsonb;
begin
  if not (select private.is_admin()) then
    raise exception 'Apenas administradores.' using errcode = '42501';
  end if;
  with objs as (
    select o.bucket_id, o.name, coalesce((o.metadata ->> 'size')::bigint, 0) as bytes,
           coalesce(o.metadata ->> 'mimetype', '') as mime, o.created_at
      from storage.objects o
  )
  select jsonb_build_object(
    'database_bytes', pg_database_size(current_database()),
    'storage_bytes', (select coalesce(sum(bytes), 0) from objs),
    'storage_files', (select count(*) from objs),
    'by_type', (select coalesce(jsonb_agg(t order by t.bytes desc), '[]') from (
        select case when mime like 'image/%' then 'Imagens' when mime like 'video/%' then 'Vídeos'
                    when mime = 'application/pdf' then 'PDFs' when mime like 'font/%' then 'Fontes' else 'Outros' end as type,
               count(*) as files, sum(bytes) as bytes
          from objs group by 1) t),
    'by_folder', (select coalesce(jsonb_agg(f order by f.bytes desc), '[]') from (
        select split_part(name, '/', 1) as folder, count(*) as files, sum(bytes) as bytes
          from objs group by 1) f),
    'orphans', (select jsonb_build_object('files', count(*), 'bytes', coalesce(sum(bytes), 0)) from objs
                 where bucket_id = 'media' and not exists (select 1 from public.media m where m.path = objs.name)),
    'tables', (select coalesce(jsonb_agg(x order by x.bytes desc), '[]') from (
        select c.relname as "table", greatest(c.reltuples, 0)::bigint as rows, pg_total_relation_size(c.oid) as bytes
          from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relkind = 'r') x)
  ) into result;
  return result;
end $fn$;
revoke execute on function public.admin_storage_report() from public, anon;
grant execute on function public.admin_storage_report() to authenticated;
