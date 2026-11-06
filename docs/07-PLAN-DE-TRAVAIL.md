# 07 — Plan de travail (jalons)

Chaque jalon se termine par : checks concernés verts → mise à jour de `PROGRESS.md` → commit `jalon N : …`. Les jalons UI se terminent aussi par une revue visuelle (skill `visual-review`).

| # | Jalon | Livrables | Sortie |
|---|---|---|---|
| 0 | **Reconnaissance** | Lecture complète des docs ; `git init` ; vérification de l'environnement (node, npm, python3, swift, xcodebuild, xcodegen, simulateurs) consignée dans `PROGRESS.md` ; installation de ce qui manque (Homebrew/npm) ou `BLOCKERS.md` | `python3 shared/reference/score_reference.py` → 67/67 |
| 1 | **Moteur web** | `web/` initialisé (Vite + React + TS strict, ESLint, Vitest, Playwright) ; `web/src/engine/` : planning, validation, score, cumuls, classement ; tests fixtures + propriétés | 67/67, couverture 100 % |
| 2 | **Moteur iOS** | `ios/ScoreKingCore` (modèle Codable au format commun, moteur, persistance) ; mêmes tests | `swift test` 67/67, couverture 100 % |
| 3 | **Fondations DA, son, voix** | Jetons de couleur/typo (web CSS + iOS), script de contraste ; jeu d'icônes et emblèmes SVG ; icône d'app ; `scripts/generate-sounds.py` + 13 sons ; `shared/copy/voice-fr.json` complet ; `sync-shared` ; `CREDITS.md` | contrastes OK, sons et textes OK |
| 4 | **Web — parcours complet** | Tous les écrans de `02-SPEC-FONCTIONNELLE.md`, store + annulation, persistance, export/import, wake lock, sons, répliques | scénarios e2e 1–10 verts |
| 5 | **Web — finition** | PWA hors-ligne, animations signature, responsive 375→1440, accessibilité axe, revue esthétique ≥ 4/5 | `check-all.sh --web` vert |
| 6 | **iOS — parcours complet** | Projet XcodeGen, tous les écrans en SwiftUI natif, persistance, haptique, sons, écran allumé, partage | XCUITest scénarios 1–6, 8–10 verts |
| 7 | **iOS — finition** | Dynamic Type, VoiceOver, iPad, animations, icône, revue esthétique ≥ 4/5 | `check-all.sh --ios` vert |
| 8 | **Parité et audit final** | Test d'aller-retour export web → import iOS ; relecture de chaque critère de la Définition de terminé ; captures finales ; `README.md` | `check-all.sh` → TOUS LES CHECKS SONT VERTS |

## Conseils d'exécution

- **Tests d'abord pour le moteur** : écris le lanceur de fixtures avant le code du moteur, regarde-le échouer, puis implémente.
- **Ne dessine pas l'UI avant d'avoir les jetons** (jalon 3) : chaque couleur, taille et espacement vient d'un jeton.
- **Web avant iOS pour l'UI** : le web sert de maquette vivante ; l'app iOS reprend le même parcours en idiome natif (ne copie pas le HTML, adapte : `NavigationStack`, `sheet`, `List`, gestes).
- **Petits commits** à l'intérieur d'un jalon si utile, mais le commit de jalon n'a lieu qu'avec les checks verts.
- Si un jalon s'enlise (> 3 tentatives sur le même problème), écris le problème dans `BLOCKERS.md`, choisis une solution plus simple, et note-la dans `DECISIONS.md`.
