# 02 — Spécification fonctionnelle

Les deux apps (web et iOS) offrent **les mêmes fonctionnalités** et le **même parcours**, chacune avec les conventions de sa plateforme (navigation iOS native, gestes, haptique ; raccourcis clavier sur web desktop).

## Contexte d'usage (à garder en tête pour chaque écran)

- Une personne tient le score, souvent au téléphone, d'une main, l'autre tenant ses cartes.
- Lumière tamisée, table encombrée, ambiance bruyante, parfois un verre de rhum.
- Le téléphone peut passer de main en main : chacun peut saisir son propre pari.
- Partie de 30 à 60 min : l'app doit survivre à un verrouillage, un appel, une fermeture accidentelle.

## Objectifs mesurables d'ergonomie

| Action | Objectif |
|---|---|
| Créer une partie de 4 joueurs (noms déjà connus) | ≤ 15 s, ≤ 8 taps |
| Saisir les paris de 6 joueurs en manche 10 | ≤ 20 s, **1 tap par joueur** |
| Saisir les plis d'une manche sans bonus | 1 tap par joueur + 1 tap de validation |
| Corriger une erreur de saisie | 1 tap (annuler) ou 2 taps (modifier) |
| Retrouver qui mène | visible sans défiler sur tous les écrans de jeu |

Cibles tactiles ≥ 44 × 44 pt (iOS) / 44 × 44 px CSS (web) ; boutons de saisie principaux ≥ 56 pt.

---

## Écrans et parcours

### 1. Accueil (« Le Port »)
- Bouton principal : **Nouvelle partie**.
- Si une partie est en cours : carte **Reprendre** mise en avant (joueurs, manche, leader).
- Historique des parties terminées (date, joueurs, vainqueur) → ouverture en lecture du tableau final.
- Accès : Règles (aide-mémoire), Réglages, À propos (mention non officielle, crédits).

### 2. Nouvelle partie (« Recruter l'équipage »)
- Ajout de joueurs 2 à 8 : champ nom + validation clavier ; **suggestions des noms déjà utilisés** (puces cliquables, mémorisées localement).
- Chaque joueur reçoit automatiquement un **emblème** (parmi ≥ 8 originaux : crâne, ancre, perroquet, boussole, sabre, tonneau, longue-vue, pieuvre…) et une **couleur** distincte — modifiables. Les deux servent à reconnaître un joueur sans lire son nom.
- Réordonnancement par glisser (ordre de table, sens horaire) ; choix du premier donneur.
- Noms en double interdits (insensible à la casse et aux espaces), nom vide interdit, 20 caractères max.
- **Options** (repliées par défaut, résumé en une ligne) :
  - Système de score : Skull King (défaut) / Rascal ; si Rascal : activer Boulet/Mitraille.
  - Planning : liste des presets de `01-REGLES-SCORE.md` §1 avec aperçu « 1 → 10 cartes », plafond affiché si appliqué (« à 8 joueurs, les manches 9 et 10 se jouent à 8 cartes »).
  - Extensions : Butin, Kraken, Baleine blanche.
  - Capacités des pirates (Harry, Rascal of Roatan).
  - Édition d'origine (+50, pas de bonus sirène).
- Les options de la dernière partie sont reprises par défaut.

### 3. Manche — Phase « Paris » (« Annoncez vos paris ! »)
- En-tête permanent : n° de manche / total, **n cartes**, donneur, entame.
- Pour chaque joueur, une ligne avec emblème, nom, et sélection du pari.
- **Saisie principale : grille de chiffres 0…n** (pas de stepper ±) : un tap = pari choisi, passage automatique au joueur suivant. Pour n ≤ 5, une rangée ; au-delà, 2 rangées. Valeur choisie très visible.
- Mode « **Tour de table** » optionnel : un joueur à la fois en plein écran, gros chiffres, pour faire passer le téléphone (le pari des joueurs précédents est masqué).
- Indicateur informatif : « Total des paris : 7 pour 6 plis — ça va saigner » (le total peut légitimement différer de n : simple info, jamais bloquant).
- Si Rascal + Boulet/Mitraille : après les paris, un interrupteur par joueur (icône poing fermé / main ouverte).
- Bouton **« À l'abordage ! »** actif quand tous les paris sont saisis.

### 4. Manche — Phase « Plis » (« Comptez le butin »)
- Même grille 0…n pour les plis de chaque joueur, passage auto.
- **Compteur live** : « Plis restants à attribuer : 2 » (ou « 1 pli de trop ») ; tient compte des plis détruits et du fantôme à 2 joueurs (« le fantôme en a pris 1 »).
- Si une extension léviathan est active : sélecteur « Plis détruits (Kraken / Baleine) : 0 / 1 / 2 ».
- Statut instantané par joueur dès que pari et plis sont saisis : ✓ réussi / ✗ raté de X (icône + texte, pas seulement couleur).
- **Bonus** : bouton « + Bonus » par joueur (désactivé si 0 pli), ouvrant un panneau compact avec compteurs : 14 de couleur (0–3), 14 noir (oui/non), pirates capturés par le Skull King, Skull King capturé par une sirène, sirènes capturées par un pirate. Chaque compteur montre sa valeur en points. Badge récapitulatif sur la ligne (« +30 »).
- Si Butin activé : « + Alliance de Butin » au niveau de la manche (qui a joué / qui a capturé).
- Si capacités : sur la ligne du joueur, « Harry : −1 / 0 / +1 » et « Mise de Roatan : 0 / 10 / 20 ».
- Erreurs de validation (codes de `01-REGLES-SCORE.md` §7) affichées **sur le champ concerné**, en langage clair (et drôle, cf. `04-SON-ET-VOIX.md`), le bouton de validation explique ce qui manque.
- Bouton **« Valider la manche »**.

### 5. Récapitulatif de manche (« Le bilan »)
- Pour chaque joueur : delta de la manche avec décomposition (pari / bonus / mise), nouveau total, évolution du rang (▲▼).
- Moment de célébration : bruitage + réplique adaptée à l'événement marquant de la manche (cf. `04-SON-ET-VOIX.md`).
- Boutons : **Manche suivante** (principal), Modifier cette manche.

### 6. Tableau des scores (« Le Grand Livre »)
- Accessible à tout moment (onglet / bouton permanent).
- Tableau manches × joueurs : pari/plis + points de manche + cumul. Colonne joueur figée, en-tête figé, chiffres tabulaires alignés à droite.
- Leader mis en évidence (couronne), écart au leader.
- **Tap sur une case de manche passée → édition de la manche**, recalcul de tous les cumuls suivants, avec confirmation.
- Mini-graphe d'évolution des scores (une ligne par joueur, couleur du joueur + emblème en fin de ligne).

### 7. Fin de partie (« Le Trésor »)
- Podium (ex aequo gérés), classement complet.
- Statistiques ludiques : % de paris réussis, plus gros coup, pire naufrage, roi du zéro (paris 0 réussis), chasseur de primes (bonus totaux).
- Partager le résultat (texte formaté ; iOS ShareLink, web Web Share API avec repli copie dans le presse-papier).
- **Revanche** (mêmes joueurs, mêmes options, donneur décalé).

### 8. Réglages
Son (on/off + volume), répliques (« Taquin » par défaut / « Sobre »), haptique (iOS), thème (Auto / Parchemin / Nuit en mer), garder l'écran allumé (on par défaut), exporter / importer les données (JSON), effacer l'historique (double confirmation).

### 9. Règles (aide-mémoire)
Résumé du barème du système actif, hiérarchie des cartes, extensions — rédigé dans nos mots (pas de copie du livret).

---

## Comportements transverses (praticité)

- **Sauvegarde automatique** après chaque saisie (pas de bouton « enregistrer »). Fermer l'app en plein milieu d'une manche puis rouvrir → retour exact au même endroit, saisies partielles comprises.
- **Annuler / Rétablir** : toute action de saisie est annulable (pile d'au moins 50 actions dans la partie en cours). iOS : bouton + secouer pour annuler ; web : bouton + `Ctrl/Cmd+Z`.
- **Écran toujours allumé** pendant une partie (iOS `isIdleTimerDisabled`, web Screen Wake Lock API avec réacquisition au retour de visibilité, dégradation silencieuse si non supporté).
- **Abandon de partie** : confirmation ; la partie part dans l'historique marquée « abandonnée ».
- **Hors-ligne complet** : web = PWA installable avec service worker ; aucune ressource externe.
- **Export / import** JSON au format commun de `05-ARCHITECTURE.md` : une partie exportée d'une plateforme s'importe sur l'autre.
- **Clavier web** : chiffres 0–9 pour saisir la valeur du joueur actif, `Entrée` pour valider, `Tab` / flèches pour naviguer, focus visible.
- **Langue** : français. Tous les textes dans un fichier de chaînes unique par plateforme (prêt pour l'anglais plus tard, mais une seule langue livrée).

## Accessibilité (obligatoire)

- Contrastes WCAG 2.2 AA (4,5:1 texte, 3:1 éléments d'interface) dans les deux thèmes — vérifiés par script.
- iOS : Dynamic Type jusqu'aux tailles d'accessibilité sans troncature des scores ; VoiceOver lit chaque ligne de façon complète (« Anne, pari 3, 2 plis, raté de 1, moins 10 points, total 140 »).
- Web : HTML sémantique, `aria-live` poli pour les changements de score, 0 violation axe-core.
- `prefers-reduced-motion` / Réduire les animations : animations remplacées par des fondus courts.
- Réussite/échec, positif/négatif : toujours **signe + icône + texte**, jamais la couleur seule.
