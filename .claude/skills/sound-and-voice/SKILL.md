---
name: sound-and-voice
description: Use whenever you add or change a sound effect, a quip, an error message or any user-facing text in Score King. Covers the funny sound design, the witty "Bosco" voice, the shared copy file and the sound generator.
---

# Bruitages rigolos et ton witty — procédure

Référence : `docs/04-SON-ET-VOIX.md` (catalogue des 13 sons, déclencheurs, règles d'écriture, exemples).

## Textes
1. Toute chaîne visible vient de `shared/copy/voice-fr.json`, synchronisé vers web et iOS par `scripts/sync-shared.*`. Jamais de texte en dur dans une vue.
2. Format du fichier :
   ```json
   {
     "ui":     { "cle.libelle": "Texte sobre et clair" },
     "events": { "zeroBidMade": ["… {nom} … {points} …", "… 8 répliques minimum …"] },
     "errors": { "TRICKS_SUM_MISMATCH": { "witty": "…", "plain": "…" } }
   }
   ```
   Au moins 10 événements (paris trop hauts, trop bas, pari 0 réussi, pari 0 raté, pari réussi, gros raté, Skull King capture, sirène capture le roi, nouveau leader, dernière manche, fin de partie, égalité) et les 15 codes d'erreur de `01-REGLES-SCORE.md` §7, chacun en `witty` et `plain`.
3. Relis chaque réplique avec ces questions : l'info est-elle avant la blague ? ≤ 80 caractères ? Drôle pour la table, vexant pour personne ? Fonctionne au masculin comme au féminin ? Placeholders tous remplacés ?
4. Sélection : tirage sans remise par partie (pas de répétition tant que la réserve n'est pas épuisée), une seule réplique par moment, mode Sobre → aucune réplique d'événement, erreurs en `plain`.
5. Les libellés de boutons et de navigation restent sobres et prévisibles.

## Sons
1. Génère avec `scripts/generate-sounds.py` (Python standard uniquement, graine fixe). Un son = une fonction documentée (synthèse, enveloppe, durée).
2. Recettes indicatives : *plouf* = bruit filtré passe-bas à fréquence descendante + petite bulle sinusoïdale ; *pièces* = 3–5 partiels métalliques inharmoniques décalés de 40–90 ms ; *flûte à coulisse* = sinus + léger vibrato avec glissando 300→900 Hz ; *trombone triste* = dent de scie filtrée, 4 notes descendantes, la dernière avec vibrato ; *canon* = bruit + basse 50 Hz à décroissance rapide + écho ; *perroquet* = modulation FM aiguë très rapide, 2 cris ; *cloche* = partiels inharmoniques (1, 2.76, 5.4) à longue décroissance.
3. Vérifie automatiquement chaque fichier : durée dans la cible, crête ≤ −1 dBFS, silence initial < 10 ms, fondu de sortie (pas de clic), mono 44,1 kHz.
4. Écoute critique : décris dans `PROGRESS.md` en une ligne ce que chaque son évoque. S'il n'est ni drôle ni lisible, refais-le.
5. Intégration : un service audio unique par plateforme (préchargement, priorités, variantes sans répétition, muet, volume). iOS : session `.ambient`. Web : déverrouillage au premier geste, aucune erreur console sans audio.
6. Toute ressource tierce (CC0 uniquement) → `CREDITS.md` avec URL, auteur, licence.
