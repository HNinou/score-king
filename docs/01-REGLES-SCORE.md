# 01 — Règles de score (spécification qui fait foi)

Source : livret de règles officiel *Skull King* (Grandpa Beck's Games, édition 2021). Chaque règle ci-dessous est couverte par au moins un cas de `shared/fixtures/scoring-cases.json`. Une implémentation de référence en Python existe dans `shared/reference/score_reference.py` (`python3 shared/reference/score_reference.py` → `✅ 67/67`). Elle sert d'oracle : **ne la livre pas, ne la modifie pas.**

Vocabulaire : **n** = nombre de cartes distribuées à chaque joueur dans la manche (≠ numéro de manche dès qu'un planning de variante est utilisé). **pari** = nombre de plis annoncé. **plis** = plis effectivement remportés. **écart** = |pari effectif − plis|.

---

## 1. Déroulement et planning des manches

- Partie standard : 10 manches, n = 1, 2, …, 10.
- Joueurs : **2 à 8**.
- À **2 joueurs**, on joue avec le fantôme de Barbe-Grise : 3 mains sont distribuées, le fantôme ne parie pas, n'a pas de score, mais **peut remporter des plis** (et donc des cartes bonus). Il occupe un siège pour le calcul du plafond de cartes.
- **Taille du paquet** : 70 cartes de base (4 couleurs × 14 + 5 pirates + Tigresse + Skull King + 2 sirènes + 5 fuites). Extensions optionnelles : Butin +2, Kraken +1, Baleine blanche +1.
- **Plafond** : `maxCartes = floor(taillePaquet / sièges)` où sièges = joueurs (+1 pour le fantôme à 2 joueurs). Chaque manche distribue `min(nPrévu, maxCartes)` — c'est la règle officielle « à plus de 6 joueurs, répéter le nombre de cartes des dernières manches ».
- **Plannings de variante** (« Captain's Log », livret p. 27) — proposés dans l'écran de création :

| Clé | Nom FR suggéré | Cartes par manche |
|---|---|---|
| `standard` | Traversée classique | 1 → 10 |
| `evenKeeled` | Mer d'huile | 2,2,4,4,6,6,8,8,10,10 |
| `skipToTheBrawl` | Droit à l'abordage | 6,7,8,9,10 |
| `swiftAndSalty` | Escarmouche salée | 5,5,5,5,5 |
| `broadsideBarrage` | Bordée totale | 10 × 10 |
| `whirlpool` | Maelström | 9,9,7,7,5,5,3,3,1,1 |
| `pastYourBedtime` | Au lit, moussaillon | 1 |
| `custom` | Sur mesure | saisie libre (1 à 30 manches, chaque n ≥ 1, plafonné) |

Cas de test : `scheduleCases`.

---

## 2. Système de score « Skull King » (par défaut)

### Pari ≥ 1
- Écart = 0 → **+20 × pari**
- Écart > 0 → **−10 × écart** (aucun point pour les plis remportés)

### Pari = 0
- 0 pli → **+10 × n**
- ≥ 1 pli → **−10 × n** (quel que soit le nombre de plis)

### Bonus — accordés **uniquement si l'écart = 0**
| Bonus | Points |
|---|---|
| Chaque 14 de couleur standard (jaune, violet, vert) capturé | +10 |
| Le 14 noir (Jolly Roger, atout) capturé | +20 |
| Chaque sirène capturée par un pirate | +20 |
| Chaque pirate capturé par le Skull King | +30 |
| Skull King capturé par une sirène | +40 (option « édition d'origine » : +50) |
| Alliance de Butin (voir §4) | +20 par alliance réussie |

Précisions officielles :
- Un 14 compte pour celui qui remporte le pli, peu importe qui l'a joué.
- L'ordre de jeu n'influence pas les bonus de personnages.
- Si un pirate, le Skull King et une sirène sont dans le même pli, la sirène gagne : seul le bonus « Skull King capturé par une sirène » s'applique.
- **Interprétation retenue** (documentée, cohérente avec « la Tigresse prend toutes les caractéristiques d'un pirate ») : la Tigresse jouée en pirate compte comme un pirate pour les deux bonus de personnages. L'app n'a rien à calculer de spécial : l'utilisateur la compte dans le nombre de pirates.
- Option « édition d'origine » : bonus sirène→Skull King = 50 et bonus « sirène capturée par un pirate » désactivé.

---

## 3. Système de score « Rascal » (optionnel)

Potentiel de la manche = **10 × n**, identique pour tous quel que soit le pari (y compris pari 0).

| Résultat | Écart | Points de pari | Bonus |
|---|---|---|---|
| Coup direct | 0 | 10 × n | 100 % |
| Coup effleuré | 1 | 5 × n | 50 % |
| Raté | ≥ 2 | 0 | 0 |

Option **Boulet / Mitraille** (choisie par chaque joueur juste après les paris) :
- **Mitraille** (`grapeshot`, défaut) : tableau ci-dessus.
- **Boulet** (`cannonball`) : écart 0 → **15 × n** + 100 % des bonus ; sinon **0** et aucun bonus.

Le Rascal ne produit jamais de points négatifs (hors pari de Rascal of Roatan, §5). Les moitiés sont toujours entières (n × 5, bonus multiples de 10).

---

## 4. Butin (extension, optionnel)

- Celui qui joue une carte Butin s'allie avec celui qui remporte le pli contenant ce Butin.
- **Si les deux ont un écart = 0**, chacun gagne **+20**. Ce bonus n'est jamais accordé (même à moitié) sur un coup effleuré en Rascal.
- Un joueur peut être dans 2 alliances (2 cartes Butin) : +20 par alliance réussie.
- Si celui qui a mené avec le Butin remporte son propre pli (tout le monde a joué une fuite), **aucune alliance** n'est formée → l'app n'en crée pas.
- Le capteur d'un Butin a forcément ≥ 1 pli.

## 5. Capacités avancées des pirates (optionnel, « Capacités des pirates » dans les réglages)

- **Harry le Géant** : après le dernier pli, son possesseur peut modifier son pari de −1, 0 ou +1. Stocké comme `harryAdjustment` ; **pari effectif = pari + ajustement**, et c'est lui qui sert à tous les calculs (y compris devenir un pari 0 → règle du pari 0 en n). Le pari effectif doit rester dans [0, n].
- **Rascal of Roatan** : son possesseur mise 0, 10 ou 20. Écart 0 → **+mise**, sinon **−mise** (dans les deux systèmes de score ; c'est une ligne séparée `wagerPoints`, jamais divisée par deux). *Interprétation retenue : en Rascal, un coup effleuré n'est pas un pari réussi.*
- Les autres capacités (Rosie, Bendt, Juanita) n'affectent pas le score : rien à saisir.

---

## 6. Résultat d'une manche par joueur

```
RoundResult = { bidPoints, bonusPoints, wagerPoints, total = bidPoints + bonusPoints + wagerPoints }
```
`bonusPoints` inclut le Butin. Le score cumulé d'un joueur = somme des `total`. L'écran récapitulatif affiche cette décomposition pour chaque joueur (transparence = confiance).

---

## 7. Validation d'une manche (avant de pouvoir la valider)

La fonction de validation renvoie **toutes** les erreurs à la fois (pas seulement la première), sous forme de codes stables. L'UI traduit chaque code en message clair, localisé sur le champ fautif.

| Code | Condition |
|---|---|
| `BID_OUT_OF_RANGE` | pari < 0 ou > n |
| `TRICKS_OUT_OF_RANGE` | plis < 0 ou > n |
| `HARRY_INVALID` | ajustement ∉ {−1, 0, +1}, ou ajustement ≠ 0 et pari effectif ∉ [0, n] |
| `WAGER_INVALID` | mise ∉ {0, 10, 20} |
| `CANNON_INVALID` | valeur ∉ {grapeshot, cannonball} |
| `DESTROYED_TRICKS_INVALID` | plis détruits < 0 ou > nombre de léviathans activés (Kraken, Baleine) |
| `TRICKS_SUM_MISMATCH` | 3+ joueurs : Σ plis ≠ n − plis détruits. 2 joueurs : Σ plis > n − plis détruits (le fantôme prend le reste) |
| `BONUS_NEGATIVE` | un compteur de bonus < 0 |
| `BONUS_WITHOUT_TRICK` | un joueur a 0 pli mais des cartes capturées (14, sirène, pirate, Skull King) |
| `STANDARD14_TOTAL_EXCEEDED` | Σ des 14 de couleur > 3 |
| `BLACK14_TOTAL_EXCEEDED` | plus d'un joueur a le 14 noir |
| `SKULL_KING_CAPTURE_CONFLICT` | plus d'un joueur a capturé le Skull King, ou le Skull King est capturé alors que quelqu'un a aussi des pirates capturés par lui |
| `PIRATES_BY_SK_EXCEEDED` | plus d'un joueur a des pirates capturés par le Skull King, ou total > min(6, sièges − 1) |
| `MERMAIDS_BY_PIRATE_EXCEEDED` | Σ des sirènes capturées > 2 |
| `LOOT_INVALID` | Butin désactivé mais alliance saisie, > 2 alliances, alliance avec soi-même, joueur inconnu, ou capteur avec 0 pli |

« Plis détruits » : 0 par défaut ; saisissable seulement si Kraken et/ou Baleine blanche sont activés (Kraken : pli détruit ; Baleine : pli défaussé quand seules des cartes spéciales y figurent).

---

## 8. Fin de partie et égalités

- Vainqueur = score cumulé le plus haut. **Égalité = vainqueurs ex aequo** (le livret ne prévoit pas de départage) ; l'app affiche les ex aequo sur la même marche du podium.
- Le classement utilise le rang standard (1, 1, 3…).

## 9. Donneur

Le donneur tourne d'un cran vers la gauche à chaque manche ; le joueur à gauche du donneur entame. L'app affiche le donneur de la manche en cours (premier donneur choisi à la création, par défaut le premier joueur de la liste). À 2 joueurs, l'entame alterne entre les deux joueurs.
