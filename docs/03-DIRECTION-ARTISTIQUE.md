# 03 — Direction artistique & exigence esthétique

## Intention

**« Le carnet de bord d'un capitaine, tenu à la lueur d'une lanterne. »**

Parchemin patiné, encre brune, filets dorés, cire rouge, bois sombre de la cale, mer de nuit. Le pirate est dans la **matière et les détails** (textures, ornements, sceaux, cordages, une boussole qui tourne au chargement) — pas dans des cliparts de crânes partout. L'app doit donner envie d'être montrée à la table : « c'est quoi cette app ? elle est belle ».

**Anti-références** (à éviter absolument) : look « Bootstrap / Material par défaut avec une police pirate », dégradés violets génériques, emojis 🏴‍☠️ comme iconographie, polices fantaisie pour les chiffres, textures si chargées qu'on lit mal, skeuomorphisme lourd qui ralentit la saisie.

## Thèmes

Deux thèmes, bascule automatique selon le système, forçable dans les réglages. **Nuit en mer** est le plus soigné (on joue souvent le soir).

### Jetons de couleur (contrastes WCAG déjà vérifiés, ratio sur fond / sur surface)

| Jeton | Parchemin (clair) | Nuit en mer (sombre) | Usage |
|---|---|---|---|
| `bg` | `#F2E4C4` | `#0B1A24` | fond d'écran |
| `surface` | `#FBF3DF` | `#13293A` | cartes, panneaux |
| `ink` | `#2A1B12` (13,2 / 15,0) | `#F2E4C4` (14,0 / 11,9) | texte principal, chiffres |
| `ink-muted` | `#5E4732` (6,9 / 7,8) | `#BCA683` (7,5 / 6,3) | texte secondaire |
| `gold` | `#7D5A0F` (5,0 / 5,7) | `#E2B84A` (9,4 / 8,0) | accents, leader, liens |
| `gold-deco` | `#C9A227` | `#C9A227` | **ornements uniquement**, jamais du texte (1,9:1 sur clair) |
| `positive` | `#1D6A41` (5,2 / 6,0) | `#62D394` (9,5 / 8,0) | points gagnés |
| `negative` | `#9E1B1B` (6,4 / 7,2) | `#FF8A7A` (7,7 / 6,5) | points perdus |
| `ocean` | `#12384D` (9,8 / 11,2) | `#7FC4E0` (9,2 / 7,7) | infos, liens secondaires |
| `action` (fond bouton principal) | `#7A1F1F` texte `#FBF3DF` (9,3) | `#E2B84A` texte `#0B1A24` (9,4) | CTA « cire rouge » / « or » |

Couleurs de joueurs : 8 teintes distinctes, lisibles sur les deux thèmes (≥ 3:1 sur `surface`), distinguables par daltoniens (vérifier avec une simulation deutéranopie/protanopie) — et toujours doublées de l'emblème.

Toute nouvelle couleur passe par un jeton ; un script (`scripts/check-contrast.*`) vérifie les paires texte/fond des deux thèmes et échoue sous 4,5:1 (3:1 pour les éléments non textuels).

## Typographie

- **Titres et noms d'écrans** : *Pirata One* (Google Fonts, licence OFL) — utilisée avec parcimonie, tailles ≥ 24 pt.
- **Tout le reste** : police système (SF Pro / SF Pro Rounded sur iOS, `system-ui` sur web) pour une lisibilité parfaite.
- **Chiffres** : toujours **tabulaires** (`font-variant-numeric: tabular-nums` / `.monospacedDigit()`), gras pour les totaux. Les scores sont l'information n°1 : ils sont les éléments les plus gros et les plus contrastés de l'écran.
- Échelle typographique définie en jetons (pas de tailles en dur), compatible Dynamic Type.
- Polices embarquées dans l'app (iOS `UIAppFonts`, web auto-hébergé `woff2`) ; licence OFL copiée dans `CREDITS.md`.

## Matière, formes, iconographie

- Fond : texture de parchemin **générée en SVG/CSS** (bruit léger, vignettage subtil) ou en image optimisée < 60 Ko ; en sombre, grain très discret façon bois/nuit. Jamais au détriment du contraste.
- Cartes / panneaux : coins légèrement irréguliers ou filet doré fin, ombre douce ; séparateurs en forme de cordage ou de filet ornemental (SVG).
- Boutons principaux : sceau de cire / plaque de laiton, état pressé avec enfoncement visible.
- Emblèmes de joueurs et icônes : **jeu d'icônes original et cohérent** (même épaisseur de trait, même grille 24 px), dessiné en SVG (web) et exporté en PDF vectoriel / SF Symbols custom (iOS). SF Symbols natifs autorisés pour les icônes utilitaires (réglages, partage, annuler).
- Icône de l'app : composition originale (ex. couronne dorée posée sur un parchemin enroulé, ou boussole-couronne) en 1024 px + toutes les tailles iOS, favicon et icônes PWA (192, 512, maskable).

## Mouvement

- Animations courtes (150–300 ms), ressorts doux ; elles **confirment** une action, jamais ne la retardent. La saisie suivante est possible pendant l'animation.
- Moments signature (3 à 5, pas plus) : chiffre de score qui « roule » au récapitulatif, sceau qui se pose à la validation de manche, pièces qui tombent sur un gros bonus, couronne qui passe au nouveau leader, coffre qui s'ouvre au podium.
- Respect strict de Réduire les animations.

## Grille d'évaluation esthétique (utilisée par le skill `visual-review`)

À chaque revue, note chaque ligne de 1 à 5, justifie en une phrase, corrige tout ce qui est < 4, puis refais la revue. Archive dans `docs/reviews/AAAA-MM-JJ-<jalon>.md` avec les captures.

| # | Critère | 5/5 ressemble à… |
|---|---|---|
| 1 | Cohérence de la DA | Chaque écran appartient visiblement au même univers ; aucun composant « par défaut » qui détonne. |
| 2 | Hiérarchie visuelle | En 1 seconde on voit : quelle manche, qui doit agir, qui mène. |
| 3 | Lisibilité des scores | Chiffres nets, alignés, lisibles à bout de bras sur la table, dans les deux thèmes. |
| 4 | Typographie | 2 familles max, échelle cohérente, police décorative jamais sur un chiffre ou un texte long. |
| 5 | Couleur & contraste | Palette restreinte, accents dorés rares donc précieux, contrastes AA partout. |
| 6 | Espacement & alignement | Grille de 4/8 pt respectée, marges régulières, rien de collé ni de flottant. |
| 7 | Finition des détails | États pressé/désactivé/focus soignés, icônes alignées optiquement, aucun texte tronqué, aucun débordement. |
| 8 | Mouvement | Animations utiles, fluides (60 fps), jamais bloquantes. |
| 9 | Caractère | L'app a une personnalité mémorable (visuel + son + ton) sans être kitsch. |
| 10 | Adaptation | Web mobile 375 px, web desktop 1440 px, iPhone SE à iPhone Pro Max, iPad : aucun écran cassé. |

**Seuil de livraison : ≥ 4 sur chaque ligne.**
