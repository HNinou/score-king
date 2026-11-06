---
name: visual-review
description: Use at the end of every UI milestone of Score King (and before final delivery) to capture screenshots of every screen, score them against the aesthetic rubric, fix weaknesses and archive the review.
---

# Revue visuelle — procédure

1. **Captures** de chaque écran de `02-SPEC-FONCTIONNELLE.md` dans un état réaliste (4–6 joueurs aux noms variés dont un long, manche 7, scores positifs et négatifs, un bonus, une erreur de validation affichée) :
   - Web : script Playwright dédié (`web/e2e/screenshots.spec.ts`) en 390×844 et 1440×900, thèmes clair et sombre.
   - iOS : simulateur iPhone SE (petit) et iPhone Pro Max (grand), + iPad ; `xcrun simctl io booted screenshot <fichier>` ou captures XCUITest (`XCTAttachment`), thèmes clair et sombre, et une capture en Dynamic Type « AX3 ».
   - Enregistre dans `docs/screenshots/<plateforme>/<écran>-<thème>-<taille>.png`.
2. **Regarde chaque capture** (ouvre l'image). Ne te contente pas de vérifier que le fichier existe.
3. **Note** chaque ligne de la grille de `03-DIRECTION-ARTISTIQUE.md` (1 à 5) avec une phrase de justification et les défauts précis observés (« écran Plis, sombre, 390 px : le badge +30 chevauche le nom quand il fait 18 caractères »).
4. **Corrige** tout ce qui est < 4, puis refais les captures concernées et re-note.
5. **Archive** dans `docs/reviews/AAAA-MM-JJ-jalon-N.md` : tableau des notes avant/après, défauts corrigés, liens vers les captures.
6. Pose-toi enfin la question : « Si je voyais cette app sur l'App Store, la téléchargerais-je pour sa beauté ? » Si la réponse est non, identifie les 3 changements qui feraient la plus grande différence et fais-les.
