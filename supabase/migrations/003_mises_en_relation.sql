-- Mises en relation Ortho-Connect : traçabilité et opposabilité des honoraires.
--
-- Objectif : chaque euro facturé doit être défendable. Le schéma horodate donc
-- trois faits, dans cet ordre imposé :
--   1. l'entreprise a accepté les CGV       -> mandats.cgv_acceptees_at
--   2. un profil lui a été divulgué          -> presentations.profil_divulgue_at
--   3. un contrat a été signé                -> presentations.contrat_signe_at
-- Sans (1) avant (2), la clause de présentation est inopposable : le trigger
-- trg_anteriorite_cgv rend ce cas impossible à enregistrer.
--
-- Idempotent : peut être relancé sans casse.

-- ---------------------------------------------------------------------------
-- Énumérations
-- ---------------------------------------------------------------------------

do $$ begin
  create type statut_presentation as enum (
    'presente',   -- profil transmis, protection en cours
    'entretien',
    'offre',
    'signe',      -- déclencheur des honoraires
    'refuse',
    'expire'      -- protection échue sans embauche
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type modele_facturation as enum (
    'forfait',            -- one-shot à la signature
    'pourcentage_tjm',    -- marge d'intermédiation récurrente
    'pourcentage_salaire' -- % du brut annuel
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Parties
-- ---------------------------------------------------------------------------

create table if not exists public.entreprises (
  id uuid primary key default gen_random_uuid(),
  raison_sociale text not null,
  siret text unique,
  ville text,
  code_dept text,
  contact_nom text,
  contact_email text,
  contact_telephone text,
  cree_le timestamptz not null default now()
);

create table if not exists public.professionnels (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  prenom text not null,
  email text not null unique,
  telephone text,
  -- Numéro ADELI/RPPS : sert à vérifier que le professionnel est bien inscrit.
  numero_adeli text,
  ville text,
  code_dept text,
  -- Ce que le professionnel cherche, aligné sur les types de src/lib/missions.ts.
  types_recherches text[] not null default '{}',
  tjm_souhaite numeric(8, 2),
  disponible_a_partir_de date,
  cree_le timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Mandat : le contrat-cadre avec l'entreprise. Porte les clauses.
-- ---------------------------------------------------------------------------

create table if not exists public.mandats (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises (id) on delete restrict,

  -- Preuve d'acceptation des CGV. Sans ces colonnes, aucune clause n'est opposable.
  cgv_version text not null,
  cgv_acceptees_at timestamptz not null,
  cgv_acceptees_par_nom text not null,
  cgv_acceptees_par_email text not null,
  cgv_acceptees_ip inet,

  -- Clause de présentation : durée pendant laquelle une embauche déclenche les honoraires.
  clause_duree_mois smallint not null default 12 check (clause_duree_mois between 1 and 36),
  -- Garantie de remplacement : profil représenté gratuitement si départ avant ce délai.
  garantie_jours smallint not null default 90 check (garantie_jours >= 0),

  modele modele_facturation not null,
  -- Renseigner selon le modèle : montant pour 'forfait', taux pour les deux autres.
  montant_forfait numeric(10, 2),
  taux numeric(5, 4) check (taux > 0 and taux < 1),

  actif boolean not null default true,
  cree_le timestamptz not null default now(),

  constraint chk_tarif_coherent check (
    case modele
      when 'forfait' then montant_forfait is not null and taux is null
      else taux is not null and montant_forfait is null
    end
  )
);

create index if not exists idx_mandats_entreprise on public.mandats (entreprise_id) where actif;

-- ---------------------------------------------------------------------------
-- Présentation : l'acte générateur. C'est LA table de preuve.
-- ---------------------------------------------------------------------------

create table if not exists public.presentations (
  id uuid primary key default gen_random_uuid(),
  mandat_id uuid not null references public.mandats (id) on delete restrict,
  entreprise_id uuid not null references public.entreprises (id) on delete restrict,
  professionnel_id uuid not null references public.professionnels (id) on delete restrict,

  -- Horodatage de la présentation : point de départ de la protection contractuelle.
  presente_at timestamptz not null default now(),
  -- Moment où l'identité du professionnel a été communiquée à l'entreprise.
  profil_divulgue_at timestamptz,

  statut statut_presentation not null default 'presente',
  contrat_signe_at timestamptz,
  -- Renseigné si le professionnel quitte le poste : arme la garantie de remplacement.
  depart_at timestamptz,

  -- Base de calcul figée au moment de la signature, pour que le montant dû ne
  -- bouge plus si les tarifs du mandat changent ensuite.
  salaire_brut_annuel numeric(10, 2),
  tjm numeric(8, 2),
  jours_par_mois numeric(4, 1),

  notes text,
  cree_le timestamptz not null default now(),

  -- Un même professionnel n'est présenté qu'une fois à la même entreprise.
  constraint uq_presentation unique (entreprise_id, professionnel_id),
  -- La divulgation ne peut pas précéder la présentation (l'antériorité des CGV,
  -- elle, est vérifiée par le trigger trg_anteriorite_cgv plus bas).
  constraint chk_divulgation_apres_presentation check (profil_divulgue_at is null or profil_divulgue_at >= presente_at),
  constraint chk_signature_coherente check (statut <> 'signe' or contrat_signe_at is not null)
);

create index if not exists idx_presentations_statut on public.presentations (statut, presente_at desc);
create index if not exists idx_presentations_pro on public.presentations (professionnel_id);

-- Verrou applicatif : impossible de divulguer un profil sous un mandat dont les
-- CGV ont été acceptées APRÈS la présentation.
create or replace function public.verifie_anteriorite_cgv() returns trigger
language plpgsql
-- search_path vide : la fonction ne résout que des noms pleinement qualifiés,
-- pour qu'un schéma pirate ne puisse pas détourner la vérification.
set search_path = ''
as $$
declare
  accepte_le timestamptz;
begin
  if new.profil_divulgue_at is null then
    return new;
  end if;
  select cgv_acceptees_at into accepte_le from public.mandats where id = new.mandat_id;
  if accepte_le is null or accepte_le > new.profil_divulgue_at then
    raise exception
      'CGV acceptées le % : postérieures à la divulgation du profil (%). Clause inopposable.',
      accepte_le, new.profil_divulgue_at;
  end if;
  return new;
end $$;

drop trigger if exists trg_anteriorite_cgv on public.presentations;
create trigger trg_anteriorite_cgv
  before insert or update of profil_divulgue_at, mandat_id on public.presentations
  for each row execute function public.verifie_anteriorite_cgv();

-- ---------------------------------------------------------------------------
-- Honoraires : ce qui est dû, facturé, encaissé.
-- ---------------------------------------------------------------------------

create table if not exists public.honoraires (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete restrict,

  -- Pour un forfait : une seule ligne. Pour une marge sur TJM : une ligne par mois.
  periode date,
  jours_factures numeric(5, 1),

  montant_ht numeric(10, 2) not null check (montant_ht >= 0),
  facture_at timestamptz,
  numero_facture text unique,
  paye_at timestamptz,
  -- Renseigné si la garantie de remplacement annule les honoraires.
  avoir_at timestamptz,
  motif_avoir text,

  cree_le timestamptz not null default now(),
  constraint uq_honoraire_periode unique (presentation_id, periode)
);

create index if not exists idx_honoraires_impayes
  on public.honoraires (facture_at) where paye_at is null and avoir_at is null;

-- ---------------------------------------------------------------------------
-- Vues de pilotage
-- ---------------------------------------------------------------------------

-- Protections en cours : toute embauche d'un de ces professionnels par cette
-- entreprise avant `protege_jusquau` déclenche les honoraires.
-- security_invoker : la vue n'accorde aucun droit que l'appelant n'a pas déjà.
create or replace view public.presentations_protegees
with (security_invoker = true) as
select
  p.id,
  e.raison_sociale,
  pr.nom || ' ' || pr.prenom as professionnel,
  p.presente_at,
  p.presente_at + make_interval(months => m.clause_duree_mois) as protege_jusquau,
  p.statut
from public.presentations p
  join public.mandats m on m.id = p.mandat_id
  join public.entreprises e on e.id = p.entreprise_id
  join public.professionnels pr on pr.id = p.professionnel_id
where p.statut not in ('signe', 'expire')
  and now() < p.presente_at + make_interval(months => m.clause_duree_mois);

-- Placements encore couverts par la garantie de remplacement.
create or replace view public.garanties_actives
with (security_invoker = true) as
select
  p.id,
  e.raison_sociale,
  p.contrat_signe_at,
  p.contrat_signe_at + make_interval(days => m.garantie_jours) as garantie_jusquau,
  p.depart_at is not null as garantie_declenchee
from public.presentations p
  join public.mandats m on m.id = p.mandat_id
  join public.entreprises e on e.id = p.entreprise_id
where p.statut = 'signe'
  and now() < p.contrat_signe_at + make_interval(days => m.garantie_jours);

-- ---------------------------------------------------------------------------
-- Sécurité : RLS actif sans policy — seul le service_role (serveur) accède.
-- Cohérent avec public.subscribers (migration 002).
-- ---------------------------------------------------------------------------

alter table public.entreprises     enable row level security;
alter table public.professionnels  enable row level security;
alter table public.mandats         enable row level security;
alter table public.presentations   enable row level security;
alter table public.honoraires      enable row level security;
