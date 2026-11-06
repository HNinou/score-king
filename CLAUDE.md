# Score King — Mission pour agent autonome

Tu construis **Score King**, un compteur de points pour le jeu de cartes **Skull King**, en deux versions :

1. **Application iOS native** (SwiftUI) — `ios/`
2. **Application web / PWA** installable et hors-ligne — `web/`

Tu travailles **en totale autonomie**, du dossier vide jusqu'aux deux applications terminées, testées et polies. Personne ne répondra à tes questions pendant le travail.

## Les 5 critères (tous obligatoires, aucun n'est sacrifiable)

| Critère | Ce que ça veut dire ici | Où c'est détaillé |
|---|---|---|
| **Rigueur** | Zéro erreur de calcul. Les règles officielles sont implémentées à la lettre, chaque saisie impossible est bloquée avec un message clair. Web et iOS donnent exactement les mêmes scores. | `docs/01-REGLES-SCORE.md`, skill `skull-king-scoring` |
| **Ergonomie** | Utilisable d'une main, à une table de jeu, de nuit, par quelqu'un qui n'a jamais vu l'app. Saisir les paris de 6 joueurs en moins de 20 s. | `docs/02-SPEC-FONCTIONNELLE.md` |
| **Praticité** | Hors-ligne, reprise automatique de la partie, annulation de toute action, correction d'une manche passée, écran qui ne se met pas en veille. | `docs/02-SPEC-FONCTIONNELLE.md` |
| **Esthétisme** | Une direction artistique pirate assumée, cohérente et soignée, digne d'une app primée. Pas un template avec une police pirate plaquée dessus. | `docs/03-DIRECTION-ARTISTIQUE.md`, skill `pirate-art-direction` |
| **Personnalité** | Des bruitages rigolos et un ton *witty* de vieux loup de mer, drôles sans jamais gêner la lecture des scores. | `docs/04-SON-ET-VOIX.md`, skill `sound-and-voice` |

## Ordre de lecture (obligatoire avant d'écrire du code)

1. Ce fichier en entier.
2. `docs/01-REGLES-SCORE.md` — **la spécification qui fait foi** pour les calculs.
3. `docs/02-SPEC-FONCTIONNELLE.md` → `docs/03-DIRECTION-ARTISTIQUE.md` → `docs/04-SON-ET-VOIX.md`
4. `docs/05-ARCHITECTURE.md` → `docs/06-TESTS-ET-CHECKS.md` → `docs/07-PLAN-DE-TRAVAIL.md`
5. `shared/fixtures/scoring-cases.json` (67 vérifications : 33 manches, 2 parties × cumuls + totaux, 19 validations, 11 plannings — vérifiées à la main et par une implémentation de référence).

## Charte d'autonomie

- **Ne pose jamais de question. Décide.** Quand la spec laisse un choix ouvert, prends l'option la plus simple qui respecte les 5 critères, puis note-la dans `DECISIONS.md` (date, contexte, décision, alternative écartée).
- **Ne t'arrête pas avant la « Définition de terminé »** (plus bas). Une étape bloquée ne bloque pas les autres : contourne, avance ailleurs, reviens-y.
- **Blocage d'environnement** (pas de Xcode, pas de simulateur, pas de réseau…) : fais tout ce qui est faisable, consigne le blocage dans `BLOCKERS.md` avec la commande exacte qui a échoué et ce que l'humain doit faire, puis continue.
- **Tiens `PROGRESS.md` à jour** à la fin de chaque jalon : fait, reste, résultats des checks.
- **Commits git** à chaque jalon validé (`git init` au départ si besoin). Messages en français, format `jalon N : …`. Jamais de `git push`.
- **Contexte long** : avant une compaction ou en reprenant une session, relis `PROGRESS.md`, `DECISIONS.md` et ce fichier.

## Règles absolues (non négociables)

1. **Les fixtures sont la vérité.** Ne modifie jamais `shared/fixtures/scoring-cases.json` ni `shared/reference/`. Si un test échoue, c'est le moteur qui a tort. Si tu es convaincu qu'une fixture est fausse, note-le dans `BLOCKERS.md` et laisse le test échouer.
2. **Un seul moteur de calcul par plateforme**, pur, sans dépendance UI, couvert à 100 % (lignes et branches) par les tests. L'UI n'additionne jamais de points elle-même.
3. **Aucune donnée ne quitte l'appareil** : pas d'analytics, pas de tracking, pas de compte, pas d'appel réseau à l'exécution (polices et sons embarqués).
4. **Propriété intellectuelle** : n'utilise aucune illustration, logo, carte, typographie ou son officiel de *Skull King* / Grandpa Beck's Games. Tous les visuels et sons sont **originaux** (créés par toi, générés par code) ou sous licence **CC0 / OFL** documentée dans `CREDITS.md`. Mention dans l'app : « Application non officielle, non affiliée à Grandpa Beck's Games. Skull King est une marque de Grandpa Beck's Games. »
5. **Qualité de code** : TypeScript `strict` sans `any`, Swift sans `!` de déballage forcé ni `try!` dans le code de prod, aucun `TODO`/`FIXME` restant à la livraison, aucun avertissement de compilation, aucune erreur console.
6. **Le son est désactivable** en un geste, respecte le mode silencieux iOS, et rien d'important n'est transmis uniquement par le son ou uniquement par la couleur.

## Checks — la seule preuve qui compte

Lance `./scripts/check-all.sh` (détail dans `docs/06-TESTS-ET-CHECKS.md`). Il doit afficher `TOUS LES CHECKS SONT VERTS` avant chaque commit de jalon. Tu ne déclares rien « terminé » sans avoir vu ce résultat de tes yeux dans ce terminal.

## Skills du projet (`.claude/skills/`)

- `skull-king-scoring` — dès que tu touches au calcul, à la validation ou au planning des manches.
- `pirate-art-direction` — dès que tu touches à l'apparence (couleurs, typo, composants, icônes, animations).
- `sound-and-voice` — dès que tu ajoutes un son ou un texte visible par l'utilisateur.
- `quality-gates` — avant chaque commit de jalon et avant de déclarer le travail terminé.
- `visual-review` — à la fin de chaque jalon UI : captures d'écran, auto-critique notée, corrections.

## Définition de terminé

Tout est vrai en même temps :

- [ ] `./scripts/check-all.sh` → `TOUS LES CHECKS SONT VERTS` (web + iOS + parité des fixtures).
- [ ] Les 67 vérifications de `scoring-cases.json` passent sur **les deux** moteurs.
- [ ] Une partie complète de 10 manches est jouable de bout en bout (test e2e web Playwright + test UI iOS XCUITest).
- [ ] Une partie exportée depuis le web et importée sur iOS (et inversement) donne les mêmes totaux.
- [ ] La grille esthétique de `docs/03-DIRECTION-ARTISTIQUE.md` obtient **≥ 4/5 sur chaque ligne** lors de la dernière revue visuelle, consignée dans `docs/reviews/`.
- [ ] Captures finales dans `docs/screenshots/` (web mobile, web desktop, iPhone, thèmes clair et sombre).
- [ ] `README.md` explique en 5 lignes comment lancer chaque app ; `CREDITS.md` liste chaque ressource tierce et sa licence.
- [ ] `PROGRESS.md` final, `BLOCKERS.md` vide ou ne contenant que des actions qui exigent un humain (compte Apple Developer, signature…).
