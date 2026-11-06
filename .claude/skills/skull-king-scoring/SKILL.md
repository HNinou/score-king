---
name: skull-king-scoring
description: Use whenever you write or change score calculation, round validation, card schedules, running totals or ranking for Score King (web or iOS). Enforces the official Skull King rules and the shared fixtures.
---

# Calcul de score Skull King — procédure

La spécification qui fait foi est `docs/01-REGLES-SCORE.md`. Les fixtures `shared/fixtures/scoring-cases.json` sont la vérité ; l'oracle `shared/reference/score_reference.py` montre une implémentation correcte (lis-la pour lever un doute, ne la copie pas aveuglément, ne la modifie jamais).

## Avant de coder
1. Relis la section concernée de `01-REGLES-SCORE.md`.
2. Repère dans les fixtures les cas qui couvrent ce que tu vas toucher.
3. Écris ou complète d'abord le test qui charge ces cas ; vérifie qu'il échoue.

## Pièges connus (chacun a déjà fait échouer des implémentations)
- Le pari 0 vaut **10 × cartes distribuées**, pas 10 × numéro de manche (cas `sk-19`).
- Le pari effectif inclut l'ajustement de Harry ; un pari ramené à 0 suit la règle du pari 0 (cas `sk-18`).
- En Skull King, un écart ≠ 0 annule **tous** les bonus, Butin compris.
- En Rascal, un coup effleuré donne la moitié du potentiel et la moitié des bonus de cartes, mais **jamais** le Butin (cas `rascal-09`).
- Boulet : 15 × n si exact, sinon 0, bonus seulement si exact.
- La mise de Rascal of Roatan est une ligne à part (`wagerPoints`), jamais divisée.
- Option édition d'origine : sirène → Skull King = 50, et le bonus « sirène capturée par un pirate » vaut 0.
- À 2 joueurs, la somme des plis peut être inférieure à n (le fantôme gagne des plis) mais jamais supérieure.
- Les plis détruits (Kraken/Baleine) réduisent la somme attendue ; ils ne sont saisissables que si l'extension est activée.
- La validation renvoie **toutes** les erreurs, pas la première.
- `HARRY_INVALID` ne se déclenche que si un ajustement non nul sort de [0, n] (ou si l'ajustement ∉ {−1, 0, 1}).
- Le plafond de cartes utilise les sièges (fantôme compris) et la taille de paquet selon les extensions.

## Après avoir codé
1. Tests du moteur de la plateforme : 67/67, couverture 100 %.
2. Si tu as touché les deux plateformes, lance les deux suites.
3. `./scripts/check-all.sh --web` ou `--ios`.
4. Aucun calcul de points dans l'UI : `grep` tes vues pour `* 20`, `* 10`, `+ 30`… ; tout doit passer par le moteur.
