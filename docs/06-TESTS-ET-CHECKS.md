# 06 — Tests et checks

## Pyramide de tests

| Niveau | Web | iOS | Exigence |
|---|---|---|---|
| **Moteur** (fixtures) | Vitest, lit `shared/fixtures/scoring-cases.json` | `swift test` sur `ScoreKingCore`, même fichier | 67/67 cas, **100 % lignes et branches** du moteur |
| Moteur — propriétés | tests générés : pour 1 000 manches aléatoires valides, `total = bid + bonus + wager`, Rascal jamais négatif hors mise, bonus = 0 si écart ≠ 0 (Skull King) | idem | 0 échec |
| Store / réducteur | annuler/rétablir, correction d'une manche passée → cumuls suivants recalculés, reprise après rechargement | idem | couverture ≥ 90 % |
| Persistance | sauvegarde/rechargement, import d'un JSON invalide refusé sans perte, export → import identique | idem | 100 % des chemins d'erreur |
| Textes | chaque code d'erreur a un message Taquin et Sobre ; aucun placeholder non remplacé à l'écran | idem | 0 manque |
| **UI de bout en bout** | Playwright, viewport iPhone (390×844) + desktop (1440×900) | XCUITest sur simulateur iPhone | voir scénarios |
| Accessibilité | `@axe-core/playwright` sur chaque écran, 2 thèmes | audit VoiceOver via `XCUIApplication` (`performAccessibilityAudit()` iOS 17) | 0 violation |
| Visuel | captures de chaque écran, 2 thèmes → revue avec la grille esthétique | captures simulateur (`xcrun simctl io booted screenshot`) | ≥ 4/5 partout |

## Scénarios de bout en bout obligatoires (web ET iOS)

1. **Partie complète** : rejoue `partie-01-classique-3-joueurs-10-manches` via l'interface (paris, plis, bonus), vérifie chaque cumul affiché contre `expectedRunningTotals`, puis le podium (A 450, B 390, C 110).
2. **Rascal 2 joueurs** : rejoue `partie-02-rascal-2-joueurs-escarmouche` (planning « Escarmouche salée », Boulet/Mitraille), totaux 230 / 170.
3. **Erreur bloquante** : saisir des plis dont la somme est fausse → bouton de validation désactivé, message clair sur le compteur, correction → validation possible.
4. **Correction a posteriori** : modifier les plis de la manche 3 après la manche 6 → tous les cumuls suivants changent, aucun autre chiffre ne bouge.
5. **Annuler** : 5 saisies puis 5 annulations → état identique au départ.
6. **Reprise** : recharger la page / tuer et relancer l'app au milieu des paris de la manche 4 → retour exact, saisies partielles conservées.
7. **Hors-ligne (web)** : après un premier chargement, couper le réseau (Playwright `context.setOffline(true)`), recharger → l'app fonctionne entièrement.
8. **8 joueurs** : planning plafonné affiché (manches 9 et 10 à 8 cartes) et grille de saisie limitée à 0…8.
9. **Son coupé** : bouton muet → aucun son joué (espion sur le lecteur audio), préférence persistée.
10. **Égalité** : fin de partie avec 2 ex aequo en tête → même marche du podium, réplique d'égalité.

## La commande unique : `./scripts/check-all.sh`

Elle vérifie, dans l'ordre :
1. Intégrité des fixtures et de l'oracle (SHA-256) + oracle Python 67/67.
2. Textes du Bosco complets, 13 bruitages présents, générateur de sons versionné, `CREDITS.md`, contrastes AA.
3. Web : `npm ci`, typecheck, lint 0 warning, tests + couverture, build, e2e (Playwright + axe), aucun `any`, aucun appel réseau.
4. iOS : génération XcodeGen, `swift test` du cœur, `xcodebuild test` sur simulateur avec warnings = erreurs, aucun `try!`/`as!`.
5. Hygiène : aucun TODO/FIXME, `README.md`, `PROGRESS.md`, `DECISIONS.md` présents.

Codes de sortie : `0` = tout vert ; `3` = vert mais certains checks impossibles dans cet environnement (ex. pas de Xcode) → à consigner dans `BLOCKERS.md` ; `1` = échec.

Les scripts npm `typecheck`, `test:coverage` et `e2e` doivent exister avec ces noms exacts, et la couverture doit **faire échouer** la commande sous les seuils (seuils configurés dans `vitest.config.ts`, 100 % sur `src/engine/**`).

L'agent peut **ajouter** des checks au script ; il ne doit jamais en retirer, en affaiblir, ni contourner un check (pas de `|| true`, pas de test désactivé, pas de `skip`).
