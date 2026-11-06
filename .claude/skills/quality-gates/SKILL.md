---
name: quality-gates
description: Use before every milestone commit and before claiming any part of Score King is done. Runs the single quality gate script and the Definition of Done review, without weakening any check.
---

# Portes de qualité — procédure

1. Lance `./scripts/check-all.sh` (ou `--web` / `--ios` pendant un jalon mono-plateforme).
2. Lis la sortie **entière**. Un seul ✘ = pas de commit de jalon.
3. Pour chaque ✘ : trouve la cause racine, corrige le code (jamais le test, jamais la fixture, jamais le script), relance.
4. Interdits absolus : `|| true`, `.skip`, `xit`, `@disabled`, abaisser un seuil de couverture, désactiver une règle de lint globalement, élargir un type en `any`, modifier `shared/fixtures/` ou `shared/reference/`, supprimer un check de `check-all.sh`.
5. Code 3 (check impossible dans cet environnement) : consigne dans `BLOCKERS.md` la commande, l'erreur exacte et l'action humaine requise.
6. Avant de déclarer le projet terminé, relis la **Définition de terminé** de `CLAUDE.md` case par case et cite pour chacune la preuve (sortie de commande, chemin de capture, chemin de revue). Une case sans preuve n'est pas cochée.
7. Mets à jour `PROGRESS.md` : date, jalon, résultat de `check-all.sh` copié tel quel (dernières lignes), ce qui reste.
8. Commit : `git add -A && git commit -m "jalon N : <résumé>"`.
