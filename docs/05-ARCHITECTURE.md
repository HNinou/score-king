# 05 — Architecture

## Arborescence cible

```
score-king/
├── CLAUDE.md  README.md  PROGRESS.md  DECISIONS.md  BLOCKERS.md  CREDITS.md
├── .claude/settings.json            # permissions pour le travail autonome
├── .claude/skills/                  # skills du projet
├── docs/                            # spécifications (+ reviews/, screenshots/ créés par l'agent)
├── shared/
│   ├── fixtures/scoring-cases.json  # VÉRITÉ des calculs (ne pas modifier)
│   ├── reference/score_reference.py # oracle Python (ne pas modifier)
│   ├── schema/game.schema.json      # à créer : JSON Schema du format de partie
│   ├── copy/voice-fr.json           # à créer : toutes les répliques du Bosco + messages
│   └── sounds/                      # à générer : bruitages (identifiants partagés)
├── scripts/
│   ├── check-all.sh                 # porte de qualité unique (fourni, à compléter si besoin)
│   ├── generate-sounds.py           # à créer
│   ├── check-contrast.(py|ts)       # à créer
│   └── sync-shared.(sh|py)          # à créer : copie sons/textes vers web/ et ios/
├── web/                             # PWA
└── ios/                             # app iOS
    ├── project.yml                  # XcodeGen
    ├── ScoreKing/                   # cible app SwiftUI
    ├── ScoreKingUITests/
    └── ScoreKingCore/               # package Swift local : modèle + moteur + persistance
```

## Principe central : moteur pur + état dérivé

- Le **modèle stocké** ne contient que les **saisies** (paris, plis, bonus, options). **Aucun score n'est stocké** : tout est recalculé par le moteur. Une seule source de vérité → impossible d'avoir un total désynchronisé après une correction.
- Le **moteur** expose la même API sur les deux plateformes (mêmes noms, mêmes codes d'erreur) :

| Fonction | Rôle |
|---|---|
| `cardsSchedule(setup) → [Int]` | planning des cartes par manche, plafonné (§1 des règles) |
| `validateRound(setup, round) → Set<ErrorCode>` | toutes les erreurs de la manche |
| `scoreRound(rules, round) → [PlayerId: RoundResult]` | points de la manche |
| `runningTotals(game) → [[PlayerId: Int]]` | cumuls après chaque manche terminée |
| `ranking(totals) → [(PlayerId, rang)]` | classement « 1, 1, 3 » |

- L'UI ne fait **que** : afficher l'état, envoyer des actions au store, afficher ce que renvoie le moteur.
- **Store** : réducteur pur `(état, action) → état` + pile d'annulation (états précédents ou commandes inverses, ≥ 50 niveaux). Sauvegarde après chaque action.

## Format de données commun (export / import / persistance) — `schemaVersion: 1`

```jsonc
{
  "schemaVersion": 1,
  "id": "uuid", "createdAt": "ISO-8601", "updatedAt": "ISO-8601",
  "status": "inProgress" | "finished" | "abandoned",
  "players": [{ "id": "uuid", "name": "Anne", "emblem": "anchor", "color": "c3" }],
  "settings": {
    "scoring": "skullKing" | "rascal",
    "cannonEnabled": false,
    "preset": "standard",                 // ou "custom"
    "cardsPerRound": [1,2,3,4,5,6,7,8,9,10],  // planning effectif, figé à la création
    "expansions": { "loot": false, "kraken": false, "whiteWhale": false },
    "pirateAbilities": false,
    "originalEdition": false,             // true ⇒ Skull King capturé = 50, bonus sirène désactivé
    "firstDealerIndex": 0
  },
  "rounds": [{
    "index": 0, "cardsDealt": 1, "phase": "bids" | "tricks" | "done",
    "destroyedTricks": 0,
    "lootAlliances": [{ "playedBy": "uuid", "capturedBy": "uuid" }],
    "entries": [{
      "playerId": "uuid", "bid": 1, "tricks": null,
      "harryAdjustment": 0, "rascalWager": 0, "cannon": "grapeshot",
      "bonus": { "standard14": 0, "black14": false, "piratesBySkullKing": 0,
                 "skullKingByMermaid": false, "mermaidsByPirate": 0 }
    }]
  }]
}
```

- Le fichier d'export contient `{ "app": "score-king", "exportVersion": 1, "games": [...] }`.
- Toute donnée lue (stockage ou import) est **validée** (JSON Schema côté web via une lib de validation typée ; décodage `Codable` strict côté iOS) ; une donnée invalide n'écrase jamais une donnée valide et produit un message clair.
- Migrations : fonction `migrate(v) → v+1` par version ; tests de migration dès qu'une v2 apparaît.

## Web

- **Vite + React + TypeScript** (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- Styles : CSS natif avec variables (jetons de `03-DIRECTION-ARTISTIQUE.md`), CSS Modules ; pas de framework UI.
- PWA : `vite-plugin-pwa` (manifest, icônes, service worker précache, mode hors-ligne testé).
- Persistance : `localStorage` (clé `score-king:v1`), écriture protégée par try/catch, repli en mémoire avec bandeau d'avertissement si indisponible.
- Audio : Web Audio API (`AudioContext`, buffers préchargés).
- Qualité : ESLint (typescript-eslint strict + react-hooks + jsx-a11y), Prettier, Vitest (+ couverture v8), Testing Library, Playwright (+ `@axe-core/playwright`).
- Scripts npm attendus : `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `test:coverage`, `e2e`.
- Le moteur vit dans `web/src/engine/` sans aucun import React ; ses tests lisent `../shared/fixtures/scoring-cases.json`.

## iOS

- **iOS 17+**, SwiftUI, `@Observable`, Swift 6 (concurrence stricte), iPhone en priorité, iPad supporté (mise en page adaptée), portrait + paysage sur iPad, portrait sur iPhone.
- Projet généré par **XcodeGen** depuis `ios/project.yml` (installer via Homebrew si absent ; le `.xcodeproj` généré est aussi commité pour qu'un humain puisse l'ouvrir directement).
- `ScoreKingCore` = package Swift local (modèle `Codable`, moteur, validation, persistance) testable avec `swift test` sans simulateur. Ses tests lisent la fixture via un chemin relatif à `#filePath` vers `shared/fixtures/`.
- Persistance : fichier JSON dans Application Support, écriture atomique, même schéma que le web.
- Audio : `AVAudioPlayer` préchargés (ou `AVAudioEngine`), session `.ambient`. Haptique : `UIImpactFeedbackGenerator` / `sensoryFeedback`.
- Écran allumé : `UIApplication.shared.isIdleTimerDisabled = true` pendant une partie uniquement.
- Polices : `UIAppFonts` dans Info.plist. Icône : catalogue d'assets complet.
- Pas de signature requise : build et tests sur simulateur avec `CODE_SIGNING_ALLOWED=NO`.
- Tests : Swift Testing ou XCTest pour le cœur (fixtures, 100 %), XCUITest pour une partie complète.

## Parité web ↔ iOS

- Mêmes fixtures, mêmes codes d'erreur, mêmes identifiants de sons, mêmes textes (générés depuis `shared/copy/voice-fr.json`).
- Test de parité dans `check-all.sh` : une partie exemple exportée par un test web est importée par un test iOS et les totaux comparés (via un fichier `shared/fixtures/generated/` produit pendant les tests, non commité).
