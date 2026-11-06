# Lancer l'agent

## Prérequis sur ton Mac
- Claude Code installé et connecté.
- Node.js ≥ 20 et Python 3 (`node -v`, `python3 --version`).
- Xcode (depuis l'App Store) ouvert au moins une fois, avec un simulateur iPhone installé.
- Homebrew conseillé (l'agent installera XcodeGen avec `brew install xcodegen`).

## Lancement
```bash
cd chemin/vers/score-king
claude
```
Puis colle ce message :

> Lis CLAUDE.md puis tous les fichiers de docs/ dans l'ordre indiqué. Construis Score King de bout en bout, en autonomie complète, en suivant docs/07-PLAN-DE-TRAVAIL.md jalon par jalon et en utilisant les skills du projet. Ne me pose aucune question : décide, consigne tes choix dans DECISIONS.md et continue. Ne t'arrête que lorsque chaque case de la Définition de terminé est cochée avec sa preuve et que ./scripts/check-all.sh affiche « TOUS LES CHECKS SONT VERTS ».

Le dossier contient `.claude/settings.json` : l'agent modifie les fichiers et lance les commandes utiles (npm, swift, xcodebuild…) sans te demander, mais ne peut ni utiliser `sudo`, ni pousser sur git, ni toucher aux cas de test de référence.

## Pour aller plus loin
- Session longue : si la session s'interrompt, relance `claude` dans le dossier et dis « Reprends où tu t'es arrêté (lis PROGRESS.md) ».
- Suivi : `PROGRESS.md` (avancement), `DECISIONS.md` (choix faits), `BLOCKERS.md` (ce qui demande une action de ta part), `docs/screenshots/` (aperçus).
- Vérifier toi-même : `./scripts/check-all.sh`.
- Mettre l'app sur ton iPhone : ouvre `ios/ScoreKing.xcodeproj` dans Xcode, choisis ton équipe (compte Apple gratuit suffisant) dans *Signing & Capabilities*, branche ton iPhone et clique ▶.
