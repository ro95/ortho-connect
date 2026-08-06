-- Bootstrap du nouveau projet Supabase Ortho-Connect
-- À exécuter dans le SQL Editor du NOUVEAU projet.
-- Idempotent : peut être relancé sans casse.

create table if not exists public.subscribers (
  id bigint generated always as identity primary key,
  email text not null unique,
  subscribed_at timestamptz not null default now()
);

create index if not exists idx_subscribers_subscribed_at
  on public.subscribers (subscribed_at desc);

-- RLS activé sans aucune policy : seul le service_role (serveur) accède aux données.
-- Les clés anon/publishable ne peuvent ni lire ni écrire.
alter table public.subscribers enable row level security;

-- Vérification
select count(*) as total from public.subscribers;
