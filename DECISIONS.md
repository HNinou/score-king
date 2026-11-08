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
- **Mode télé / écrans larges** (2026-11-06) : en paysage ≥ 1100 px, typographie indexée sur min(1,1 vw ; 3,2 vh), joueurs en colonnes, scores du haut sur une rangée ; écrans très larges et bas (16:4) : grilles plus serrées, annonce du classement réduite, bouton « Continuer » épinglé en bas à droite. Captures : `docs/screenshots/web/tv-*.png`.
- **Règle maison « bonus toujours comptés »** (2026-11-06) : option de création de partie (désactivée par défaut = règles officielles). Les bonus de cartes (14, pirates, sirènes, Skull King) comptent en entier même si le pari est raté, en Skull King comme en Rascal ; l'alliance de Butin garde sa règle (les deux alliés doivent réussir). Champ optionnel `settings.bonusAlwaysCounts` dans le format commun ; le moteur iOS devra l'implémenter à l'identique.
- **Diffusion en direct / spectateurs** (2026-11-07) : l'hôte choisit « Diffuser la partie » (menu) → QR code + lien `#voir=CODE`. Les spectateurs reçoivent l'état complet de la partie (validé par `isGame`) à chaque saisie et l'affichent en lecture seule (classement, paris et plis de la manche, Grand Livre). Connexion pair à pair WebRTC via PeerJS ; **exception assumée et explicitement demandée à la règle « aucun appel réseau »** : seul l'hôte l'active, le service public PeerJS ne sert qu'à la mise en relation, les données de partie circulent d'appareil à appareil. Arrêt automatique en revenant au port ; reprise automatique si la page de l'hôte est rechargée.
- **Musique de 5 minutes** : deux morceaux composés en sections (« Mer calme » 5,1 min, « Gros temps » 5,0 min) avec variations à chaque reprise ; AAC 48 kbit/s (~1,8 Mo chacun). Les WAV sources (~19 Mo) ne sont pas versionnés : `python3 scripts/generate-music.py` puis `./scripts/sync-shared.sh` les régénèrent.

## 2026-11-08 — Lanterne au-dessus des fenêtres, voix neutralisée en e2e
- Contexte : en partie, la lanterne était dans la barre du haut et passait sous le classement, le Grand Livre et le menu ; la page spectateur n'en avait pas. Par ailleurs, la synthèse vocale système bloquait par moments le Chromium de test (échecs aléatoires).
- Décision : la lanterne de jeu garde sa place sous la barre mais est rendue au niveau de la page (portail) pour rester au-dessus de tout ; les spectateurs ont la leur. En e2e, `e2e/fixtures.ts` remplace `speechSynthesis.speak` par une annonce qui se termine aussitôt.
- Alternative écartée : masquer la lanterne pendant les fenêtres (contraire à la demande « présente tout le long du jeu »).

## 2026-11-08 — Tirage du premier joueur, saisie présélectionnée à zéro
- Contexte : demande de l'utilisateur, pour gagner du temps à table (s'écarte de la spec « À l'abordage actif quand tous les paris sont saisis »).
- Décision : le tirage désigne le joueur qui commence et règle le donneur juste avant lui, sans toucher à l'ordre de table. Pour les mises et les plis, un joueur non saisi reste `null` en interne mais s'affiche et compte comme 0 ; `null` devient 0 au passage aux plis et à la validation. La validation reste bloquée si le total des plis est faux.
- Alternative écartée : créer les manches avec 0 en dur (le tour de table, l'avancement automatique et l'écran spectateur perdraient l'information « pas encore saisi »).
