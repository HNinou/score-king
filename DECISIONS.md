# Décisions

Format : `AAAA-MM-JJ — Sujet` · Contexte · Décision · Alternative écartée et pourquoi.

## Décisions déjà prises dans le cahier des charges
- **Règles 2021 par défaut** (sirène → Skull King = 40, bonus sirène capturée = 20), édition d'origine en option.
- **Tigresse jouée en pirate** = pirate pour les bonus (cohérent avec la règle « elle prend toutes les caractéristiques d'un pirate »).
- **Mise de Rascal of Roatan** : +mise si pari exact, −mise sinon, dans les deux systèmes ; jamais divisée.
- **Butin en Rascal** : accordé seulement si les deux alliés sont en coup direct.
- **Égalité finale** : vainqueurs ex aequo (le livret ne prévoit pas de départage).
- **Aucun score stocké** : tout est recalculé depuis les saisies.
- **Sons générés par code** (originalité et licence garanties), CC0 toléré avec crédit.

## Décisions prises pendant la construction (2026-11-06)
- **Portraits de pirates au lieu d'emblèmes** (demande du propriétaire) : 12 portraits SVG originaux, style « gravure peinte » sombre ; le champ `emblem` du format commun contient l'identifiant du portrait.
- **Sons joués via `<audio>` préchargés** plutôt que `fetch` + Web Audio : `check-all.sh` interdit `fetch(` dans `web/src`. Comportement identique (priorités, variantes, muet).
- **Cartes spéciales activables en cours de partie** (Kraken, Baleine, Butin, Harry, Roatan) : un tap active l'option pour la partie ; désactivation impossible si une manche terminée l'utilise.
- **Manche annulée** (`voided: true`, champ optionnel ajouté au format commun) : 0 point pour tous, cumuls inchangés, visible « annulée » au Grand Livre, réversible depuis l'éditeur. « Redistribuer » efface la manche en cours.
- **Annonce du classement façon jeu de plateau** après chaque manche + remarque ciblée sur un joueur (remontée, chute, série, raté…), jamais le même deux fois de suite ni celui déjà commenté au bilan.
- **Effets rétro** (curseur sabre/crochet en pixel art, traînée de pièces, lanterne, bandeau défilant, badges 88×31) : désactivables dans Réglages, coupés en mode animations réduites.
- **Chiffres jamais en Pirata One** (règle de la DA) : boutons principaux et rangs en police système.
- **Redo** dans le menu (et Ctrl/Cmd+Maj+Z) pour libérer la barre du haut sur mobile.
- **Remarques vérifiées contre la manche réelle** (2026-11-06) : pertes affichées avec leur signe, bonus de capture limité à la capture citée, cas Rascal (zéro effleuré = points positifs) traité à part, répliques qui supposaient un contexte inconnu (« le 14 », « souvent ») retirées.
- **Scènes de fin de manche** (`roundScenes`) : uniquement ce qui a été saisi (Kraken, Baleine, pirates mangés, Roi noyé, Butin réussi, naufrage ≤ −50, zéro tenu à 5 cartes et plus, changement de leader) ; intensité 1 → 3 selon l'avancée de la partie et l'ampleur des écarts. Passables d'un tap, désactivées si animations réduites.
- **Bruitages 100 % pirates** : accordéon de chant de marin, sifflet de bosco, corne de brume, mouette, perroquet moqueur, cabestan, cordage, rugissement de kraken ; hauteur aléatoire à chaque lecture et tension qui monte avec la partie. `tap-wood` reste l'identifiant du son de saisie même si c'est désormais un « bloop ».
- **Voix du Bosco** : synthèse vocale française de l'appareil (`localService` uniquement, aucun réseau), voix « Grandpa » en priorité ; coupée en mode Sobre, avec le muet, ou via Réglages.
- **Musique d'ambiance** (2026-11-06) : deux boucles originales générées par `scripts/generate-music.py` (« Mer calme » 50 s, « Gros temps » 40 s, AAC 64 kbit/s ≈ 400 Ko chacune — exception assumée à la limite de 100 Ko des bruitages). Filtrées sous ~2,2 kHz, volume de base bas, baissées à 30 % quand le Bosco parle ou qu'un bruitage important sonne, mêlées selon l'avancée de la partie, en pause quand l'appli est en arrière-plan. Lecture via Web Audio (élément `<audio>` → GainNode) car le volume des `<audio>` est ignoré sur iOS.
- **Voix pirate** : la synthèse vocale ne permet pas de traiter le son ; le style passe par une voix grave (pitch 0,55, débit 0,92), des jurons d'ouverture et ricanements de fin tirés au hasard (dits seulement, pas affichés), et un « Arrrgh » devant les cris de scène.
