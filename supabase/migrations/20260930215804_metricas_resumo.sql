-- Resumo de métricas (respeita RLS: só admin enxerga dados)
create or replace function public.metrics_overview(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with v as (
  select pv.*,
    (pv.created_at at time zone 'America/Sao_Paulo')::date as d,
    case
      when pv.utm_source is not null and pv.utm_source <> '' then initcap(pv.utm_source)
      when pv.referrer is null or pv.referrer = '' then 'Direto'
      when pv.referrer ~* 'instagram' then 'Instagram'
      when pv.referrer ~* '(facebook|fb\.)' then 'Facebook'
      when pv.referrer ~* '(whatsapp|wa\.me)' then 'WhatsApp'
      when pv.referrer ~* 'google' then 'Google'
      when pv.referrer ~* '(t\.co|twitter|x\.com)' then 'X / Twitter'
      when pv.referrer ~* 'tiktok' then 'TikTok'
      when pv.referrer ~* 'youtube' then 'YouTube'
      else 'Outros sites'
    end as source
  from public.page_views pv
  where pv.created_at >= p_from and pv.created_at < p_to
),
s as (
  select fs.*, (fs.created_at at time zone 'America/Sao_Paulo')::date as d
  from public.form_submissions fs
  where fs.created_at >= p_from and fs.created_at < p_to
),
c as (
  select ce.* from public.click_events ce
  where ce.created_at >= p_from and ce.created_at < p_to
),
days as (
  select gs::date as d
  from generate_series((p_from at time zone 'America/Sao_Paulo')::date, ((p_to - interval '1 second') at time zone 'America/Sao_Paulo')::date, interval '1 day') gs
)
select jsonb_build_object(
  'totals', jsonb_build_object(
    'views', (select count(*) from v),
    'visitors', (select count(distinct session_hash) from v),
    'submissions', (select count(*) from s),
    'clicks', (select count(*) from c)
  ),
  'daily', coalesce((
    select jsonb_agg(jsonb_build_object(
      'date', days.d,
      'views', (select count(*) from v where v.d = days.d),
      'visitors', (select count(distinct session_hash) from v where v.d = days.d),
      'submissions', (select count(*) from s where s.d = days.d)
    ) order by days.d) from days
  ), '[]'::jsonb),
  'pages', coalesce((
    select jsonb_agg(row_to_json(t) order by t.views desc) from (
      select v.page_id, max(v.path) as path, p.title, count(*) as views, count(distinct v.session_hash) as visitors,
        (select count(*) from s where s.page_id is not distinct from v.page_id) as submissions
      from v left join public.pages p on p.id = v.page_id
      group by v.page_id, p.title
      order by count(*) desc limit 20
    ) t
  ), '[]'::jsonb),
  'clicks', coalesce((
    select jsonb_agg(row_to_json(t) order by t.clicks desc) from (
      select c.target, max(c.label) as label, count(*) as clicks, count(distinct c.session_hash) as people
      from c group by c.target order by count(*) desc limit 20
    ) t
  ), '[]'::jsonb),
  'sources', coalesce((
    select jsonb_agg(row_to_json(t) order by t.visitors desc) from (
      select source, count(distinct session_hash) as visitors, count(*) as views from v group by source
    ) t
  ), '[]'::jsonb),
  'devices', coalesce((
    select jsonb_agg(row_to_json(t) order by t.visitors desc) from (
      select coalesce(device, 'desktop') as device, count(distinct session_hash) as visitors from v group by 1
    ) t
  ), '[]'::jsonb),
  'cities', coalesce((
    select jsonb_agg(row_to_json(t) order by t.n desc) from (
      select initcap(trim(city)) as city, count(*) as n from s where coalesce(trim(city), '') <> '' group by 1 order by 2 desc limit 10
    ) t
  ), '[]'::jsonb),
  'heard', coalesce((
    select jsonb_agg(row_to_json(t) order by t.n desc) from (
      select heard_from as label, count(*) as n from s where coalesce(heard_from, '') <> '' group by 1 order by 2 desc limit 10
    ) t
  ), '[]'::jsonb)
);
$$;

revoke execute on function public.metrics_overview(timestamptz, timestamptz) from public, anon;
grant execute on function public.metrics_overview(timestamptz, timestamptz) to authenticated;
