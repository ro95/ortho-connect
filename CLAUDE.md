# ortho-connect — règles de travail

## Git : une branche par sujet (NON NÉGOCIABLE)

Avant **toute** implémentation de feature, fix ou refacto demandée par l'utilisateur :

1. Vérifier la branche courante (`git status -sb`).
2. Si la branche courante n'est pas déjà **dédiée au sujet demandé**, créer une branche
   dédiée avant d'écrire la moindre ligne :
   - `git checkout main && git pull` (sauf si le travail dépend explicitement d'une branche en cours)
   - `git checkout -b <type>/<sujet-en-kebab-case>`
3. Types : `feat/`, `fix/`, `refactor/`, `chore/`, `test/`, `docs/`.
4. Annoncer le nom de la branche créée dans la réponse.

Ne jamais empiler une nouvelle feature sans rapport sur une branche existante.
Ne jamais committer directement sur `main`.

Exceptions (pas de nouvelle branche) : questions/lecture seule, correction d'un
détail du sujet de la branche courante, ou demande explicite de rester sur place.

## Commits

- Messages en français, format conventionnel (`feat(seo): ...`).
- **Jamais** de `Co-Authored-By: Claude` ni de mention d'IA dans les commits ou les PR.

## Divers

- Ne jamais lire les fichiers `.env*` (secrets). Passer par Write/Edit ou grep sur le code.
