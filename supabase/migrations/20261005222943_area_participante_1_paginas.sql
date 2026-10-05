-- Área do participante: inscrições em eventos, presença e certificados.
alter table public.pages
  add column if not exists registration_enabled boolean not null default false,
  add column if not exists capacity integer check (capacity is null or capacity > 0),
  add column if not exists certificate_hours numeric(6,2) check (certificate_hours is null or certificate_hours > 0),
  add column if not exists color text check (color is null or color ~ '^#[0-9a-fA-F]{6}$');
