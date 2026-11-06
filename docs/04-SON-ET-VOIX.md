# 04 — Son & voix : bruitages rigolos et ton *witty*

L'app a un personnage : **le Bosco**, vieux maître d'équipage narquois qui tient le carnet de bord. Il commente la partie avec malice, et le navire répond en bruitages. Objectif : faire rire la table **sans jamais ralentir la saisie ni brouiller les scores**.

---

## Partie 1 — Bruitages

### Principes
- **Rigolos, courts, variés** : cartoon maritime (cloche de navire, plouf, pièces, flûte à coulisse, perroquet, canon, trombone dépité).
- Durée ≤ 1,5 s (fanfare de fin ≤ 4 s). Un seul bruitage d'événement à la fois : le plus important gagne (priorité ci-dessous), les autres sont ignorés.
- **Variantes** : les événements fréquents ont 2 à 3 variantes, jamais la même deux fois de suite.
- Volume homogène (crête ≤ −1 dBFS, niveaux perçus équilibrés entre sons). Les sons de tap sont 10 dB sous les sons d'événement.
- **Activés par défaut**, avec un bouton **muet** visible sur chaque écran de jeu (icône cloche barrée) + réglage du volume.
- iOS : `AVAudioSession` catégorie `.ambient` (se mélange à la musique de la soirée, **respecte le bouton silencieux**). Haptiques couplées aux sons clés (désactivables séparément).
- Web : Web Audio API, sons préchargés et décodés au démarrage, contexte audio déverrouillé au premier geste utilisateur ; aucune erreur console si l'audio est indisponible.
- Aucune information n'est portée **uniquement** par le son.

### Catalogue (noms de fichiers = identifiants partagés web/iOS)

| Id | Déclencheur | Intention sonore | Priorité |
|---|---|---|---|
| `tap-wood` (×3) | sélection d'un chiffre | petit « toc » de bois de pont, discret | 0 |
| `bell-bids` | « À l'abordage ! » (paris validés) | deux coups de cloche de navire | 2 |
| `seal-stamp` | manche validée | coup de tampon de cire + léger ressac | 2 |
| `coins` (×3) | joueur qui réussit son pari | tintement de pièces | 3 |
| `slide-up` | pari 0 réussi | flûte à coulisse montante, triomphante | 4 |
| `splash` (×2) | pari raté | « plouf » comique | 3 |
| `sad-trombone` | perte ≥ 50 pts dans la manche | trombone « wah-wah-waaah » | 5 |
| `cannon` | Skull King capture des pirates | coup de canon + écho | 5 |
| `siren-song` | sirène capture le Skull King | glissando éthéré, un peu moqueur | 6 |
| `parrot-squawk` | erreur de validation | cri de perroquet indigné | 4 |
| `new-captain` | changement de leader | mini-fanfare de cuivres | 5 |
| `rewind` | annuler | flûte à coulisse descendante, rapide | 1 |
| `chest-fanfare` | fin de partie / podium | grincement de coffre + pièces + fanfare | 7 |

### Fabrication (originalité et licences)
1. **Par défaut : génération procédurale** par un script versionné `scripts/generate-sounds.py` (bibliothèque standard Python uniquement : `wave`, `math`, `random` avec graine fixe → résultat reproductible). Synthèse additive/FM, enveloppes ADSR, bruit filtré (plouf, ressac, canon), glissandi (flûte à coulisse, sirène), formants simples (perroquet, trombone). Sortie : WAV 44,1 kHz 16 bits mono dans `shared/sounds/`.
2. **Optionnel** : sons sous licence **CC0** uniquement (ex. packs audio de Kenney.nl), avec source, auteur et licence dans `CREDITS.md`. Aucun son d'un film, d'un jeu ou du jeu Skull King.
3. Conversion pour livraison : AAC `.m4a` via `afconvert` si disponible (macOS), sinon WAV. Chaque fichier < 100 Ko.
4. **Écoute critique obligatoire** : le skill `sound-and-voice` décrit comment vérifier (durée, crête, silence initial < 10 ms, pas de clic en fin de son). Un son qui n'est pas drôle ou qui agresse l'oreille est refait.

---

## Partie 2 — Ton *witty* (le Bosco)

### Règles d'écriture
1. **L'information d'abord, la blague ensuite.** « Plus que 2 plis à attribuer. Même le fantôme n'en veut pas. » — jamais l'inverse.
2. **Court** : ≤ 80 caractères par réplique, une seule phrase de blague.
3. **Taquin, jamais méchant** : on se moque des situations (le pari raté, le zéro audacieux), pas des personnes. Aucune allusion au physique, à l'identité, à l'alcool comme incitation, aucune vulgarité.
4. **Personnalisé** : utilise le prénom du joueur concerné (`{nom}`), les chiffres réels (`{points}`, `{plis}`, `{n}`).
5. **Rotation** : chaque événement a une réserve d'au moins **8 répliques** ; pas de répétition dans une même partie tant que la réserve n'est pas épuisée.
6. **Les éléments fonctionnels restent sobres** : libellés de boutons, titres de champs et éléments de navigation sont clairs et prévisibles (le pirate est dans les titres d'écrans, les répliques et les messages, pas dans « Annuler »).
7. **Mode Sobre** (réglage) : supprime les répliques, garde des messages d'erreur clairs et neutres. Les deux variantes existent pour chaque message d'erreur.
8. Toutes les chaînes vivent dans le fichier de textes de la plateforme (`fr.json` web / `Localizable.xcstrings` iOS), générées depuis une source unique `shared/copy/voice-fr.json` pour garantir que web et iOS disent la même chose.

### Déclencheurs et exemples (à enrichir jusqu'à 8+ par événement, dans le même esprit)

**Paris annoncés, total > n** (« ça va saigner »)
- « {total} plis annoncés pour {n} sur la table. Quelqu'un ment, et ça va se voir. »
- « Plus de paris que de plis. L'optimisme, c'est gratuit ; les points, non. »

**Paris annoncés, total < n**
- « {total} plis réclamés sur {n}. Il va rester du butin qui traîne… »

**Pari 0 réussi**
- « {nom} n'a rien pris et repart avec {points} points. Le crime paie. »
- « Zéro pli, zéro remords. Bien joué, {nom}. »

**Pari 0 raté**
- « {nom} avait juré de ne rien toucher. {plis} pli(s) dans la poche. Menteur·se. »

**Pari réussi (≥ 1)**
- « {nom} : pile poil. Le Bosco hoche la tête, ce qui est rare. »

**Gros raté (≤ −50 pts)**
- « {nom} perd {points} points. On a vu des naufrages plus discrets. »
- « Aïe. {nom}, la mer est par là si tu veux réfléchir. »

**Skull King capture des pirates**
- « Le Skull King a dîné de {nb} pirate(s). {nom} empoche +{bonus}. »

**Sirène capture le Skull King**
- « Une sirène a noyé le Roi. {nom} rafle +{bonus}. Romantique et lucratif. »

**Nouveau leader**
- « Changement de capitaine : {nom} prend la barre. Les autres, aux cales. »

**Dernière manche**
- « Dernière manche. Ce qui se passe en mer reste au classement. »

**Fin de partie**
- « {nom} est sacré·e Capitaine des Sept Mers. Les autres nettoient le pont. »
- Égalité : « Égalité ! {noms} partagent le trésor. Ou se battent pour. »

**Erreurs de validation** (version Taquin / version Sobre)
| Code | Taquin | Sobre |
|---|---|---|
| `TRICKS_SUM_MISMATCH` (manque) | « Il reste {x} pli(s) sans propriétaire. Comptez mieux, moussaillons. » | « Il reste {x} pli(s) à attribuer. » |
| `TRICKS_SUM_MISMATCH` (excès) | « {x} pli(s) de trop. Quelqu'un triche ou sait pas compter. » | « {x} pli(s) de trop. » |
| `BONUS_WITHOUT_TRICK` | « {nom} n'a gagné aucun pli mais réclame un trésor. Joli toupet. » | « {nom} n'a gagné aucun pli : pas de bonus possible. » |
| `BLACK14_TOTAL_EXCEEDED` | « Deux 14 noirs ? Il n'y en a qu'un dans le paquet, filous. » | « Un seul joueur peut avoir le 14 noir. » |
| `SKULL_KING_CAPTURE_CONFLICT` | « Le Skull King ne peut pas gagner ET être noyé. Choisissez. » | « Le Skull King ne peut pas être capturé et capturer dans la même manche. » |

Les autres codes de `01-REGLES-SCORE.md` §7 suivent le même schéma (Taquin + Sobre, toujours explicites).

**Écrans vides / petits textes**
- Historique vide : « Aucune traversée au registre. L'océan s'impatiente. »
- Chargement : « On hisse les voiles… »
