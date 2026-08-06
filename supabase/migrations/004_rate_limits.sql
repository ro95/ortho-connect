-- Compteurs de quota pour les endpoints publics (inscription newsletter).
--
-- Pourquoi en base : les routes Next tournent en serverless, la mémoire du
-- process ne survit pas d'une invocation à l'autre. Un compteur en RAM ne
-- limiterait donc rien du tout.
--
-- Le comptage se fait par fenêtre glissante grossière : une fenêtre démarre au
-- premier appel et dure `p_fenetre_secondes`. C'est moins précis qu'un sliding
-- window exact, mais ça tient en un seul UPSERT atomique — donc pas de course
-- entre deux requêtes concurrentes, ce qui est le seul point qui compte ici.
--
-- Idempotent : peut être relancé sans casse.

create table if not exists public.rate_limits (
  -- Clé applicative : « subscribe:ip:1.2.3.4 », « subscribe:notif:global »…
  cle text primary key,
  compteur int not null default 0,
  fenetre_debut timestamptz not null default now()
);

-- Sert uniquement à la purge des fenêtres périmées.
create index if not exists idx_rate_limits_fenetre
  on public.rate_limits (fenetre_debut);

-- RLS actif sans policy : seul le service_role (serveur) accède, comme
-- public.subscribers (migration 001).
alter table public.rate_limits enable row level security;

-- ---------------------------------------------------------------------------
-- Consommation d'un jeton de quota.
--
-- Retourne true si l'appel est autorisé, false s'il dépasse la limite.
-- L'incrément et la lecture ont lieu dans le même UPSERT : deux requêtes
-- simultanées ne peuvent pas lire le même compteur avant de l'incrémenter.
-- ---------------------------------------------------------------------------

create or replace function public.consomme_quota(
  p_cle text,
  p_limite int,
  p_fenetre_secondes int
) returns boolean
language plpgsql
-- search_path vide : la fonction ne résout que des noms pleinement qualifiés,
-- pour qu'un schéma pirate ne puisse pas détourner le comptage.
set search_path = ''
as $$
declare
  v_compteur int;
  v_perimee boolean;
begin
  insert into public.rate_limits as r (cle, compteur, fenetre_debut)
  values (p_cle, 1, now())
  on conflict (cle) do update
    set
      -- Fenêtre expirée : on repart de 1 au lieu de cumuler.
      compteur = case
        when r.fenetre_debut < now() - make_interval(secs => p_fenetre_secondes)
        then 1
        else r.compteur + 1
      end,
      fenetre_debut = case
        when r.fenetre_debut < now() - make_interval(secs => p_fenetre_secondes)
        then now()
        else r.fenetre_debut
      end
  returning r.compteur, r.compteur = 1 into v_compteur, v_perimee;

  -- Purge opportuniste : uniquement quand une fenêtre vient de (re)démarrer,
  -- donc au plus une fois par clé et par fenêtre. La table reste bornée sans
  -- dépendre de pg_cron.
  if v_perimee then
    delete from public.rate_limits
    where fenetre_debut < now() - interval '1 day';
  end if;

  return v_compteur <= p_limite;
end $$;

-- Le serveur appelle via la service_role key ; personne d'autre n'a besoin
-- d'exécuter la fonction.
revoke all on function public.consomme_quota(text, int, int) from public;
revoke all on function public.consomme_quota(text, int, int) from anon;
revoke all on function public.consomme_quota(text, int, int) from authenticated;
