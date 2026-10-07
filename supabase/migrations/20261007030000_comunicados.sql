-- Histórico de comunicados (e-mails em massa enviados pela função enviar-mensagem). Só administradores leem.
create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body text not null,
  audience jsonb not null,
  audience_label text,
  recipients int not null default 0,
  sent int not null default 0,
  failed int not null default 0,
  status text not null default 'sending' check (status in ('sending','sent','partial','failed')),
  error text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
alter table public.email_campaigns enable row level security;
create policy "admins leem comunicados" on public.email_campaigns for select to authenticated using ((select private.is_admin()));
create index if not exists email_campaigns_created_at_idx on public.email_campaigns (created_at desc);
