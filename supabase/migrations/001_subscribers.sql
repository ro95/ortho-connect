-- Table des inscrits à la newsletter Ortho-Connect
create table if not exists public.subscribers (
  id bigint generated always as identity primary key,
  email text not null unique,
  subscribed_at timestamptz not null default now()
);

create index if not exists idx_subscribers_subscribed_at
  on public.subscribers (subscribed_at desc);

-- RLS désactivé (accès via service_role uniquement côté serveur)
alter table public.subscribers enable row level security;

-- Aucune policy = aucun accès public anon/authenticated
-- Seule la SERVICE_ROLE_KEY (serveur) contourne RLS
