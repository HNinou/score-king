---
name: pirate-art-direction
description: Use whenever you create or change anything visual in Score King (colors, typography, layout, components, icons, app icon, textures, animations), on web or iOS. Keeps the pirate art direction coherent, beautiful and legible.
---

# Direction artistique pirate — procédure

Référence : `docs/03-DIRECTION-ARTISTIQUE.md` (intention, jetons, typo, matière, mouvement, grille esthétique).

## Règles de travail
1. **Jetons uniquement** : aucune couleur, taille de police, rayon, ombre ou espacement en dur dans un composant. Web : variables CSS ; iOS : extension `Color`/`Font`/constantes d'espacement générées à partir des mêmes valeurs.
2. **Grille de 4/8** pour tous les espacements.
3. **Les scores d'abord** : sur chaque écran, le chiffre le plus important est le plus gros et le plus contrasté. Chiffres tabulaires, police système. *Pirata One* seulement pour les titres ≥ 24 pt.
4. **Le pirate est dans la matière** : parchemin, filets dorés, sceaux de cire, cordages, laiton. Pas d'emoji, pas de clipart, pas de crâne décoratif sur chaque composant.
5. **Or rare** : l'or signale ce qui compte (leader, action principale en sombre, bonus). S'il est partout, il ne signale plus rien.
6. **Tout état est dessiné** : normal, pressé, désactivé, focus clavier visible, sélectionné, erreur.
7. **Les deux thèmes** sont conçus, pas l'un dérivé automatiquement de l'autre. Nuit en mer est la vitrine.
8. **Icônes** : un seul style (même trait, même grille 24), SVG original. Vérifie l'alignement optique.
9. **Mouvement** : 150–300 ms, jamais bloquant, 3 à 5 moments signature maximum, respect de Réduire les animations.
10. **Nouvelle couleur** → ajoute la paire au script de contraste et relance-le.

## Inspiration autorisée
Cartes marines anciennes, journaux de bord, gravures sur cuivre, étiquettes de rhum (sans alcool mis en avant), cartes à jouer anciennes. **Interdit** : toute illustration, logo, carte ou typographie officielle de Skull King.

## Fin de tâche visuelle
Fais une capture de l'écran touché (thème clair et sombre, petit et grand format) et regarde-la vraiment. Si quelque chose est mal aligné, tronqué, terne ou incohérent, corrige avant de passer à autre chose. En fin de jalon, utilise le skill `visual-review`.
