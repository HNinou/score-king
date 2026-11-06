#!/usr/bin/env bash
# Porte de qualité unique de Score King.
# Usage : ./scripts/check-all.sh            (tout)
#         ./scripts/check-all.sh --web      (oracle + partagé + web)
#         ./scripts/check-all.sh --ios      (oracle + partagé + iOS)
# Sortie finale attendue : "TOUS LES CHECKS SONT VERTS".
# L'agent peut AJOUTER des checks à ce script ; il ne doit jamais en retirer ni en affaiblir.

set -u
cd "$(dirname "$0")/.." || exit 2
ROOT="$(pwd)"
MODE="${1:-all}"
FAILS=0; SKIPS=0
ok()   { printf '  \033[32m✔\033[0m %s\n' "$1"; }
ko()   { printf '  \033[31m✘\033[0m %s\n' "$1"; FAILS=$((FAILS+1)); }
skip() { printf '  \033[33m⚠\033[0m %s\n' "$1"; SKIPS=$((SKIPS+1)); }
step() { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }
run()  { local label="$1"; shift; if "$@" >/tmp/score-king-check.log 2>&1; then ok "$label"; else ko "$label"; tail -n 40 /tmp/score-king-check.log; fi; }

# ------------------------------------------------------------------ 1. Vérité partagée
step "Vérité partagée (fixtures + oracle)"
if (cd shared/fixtures && shasum -a 256 -c SHA256SUMS >/dev/null 2>&1) || (cd shared/fixtures && sha256sum -c SHA256SUMS >/dev/null 2>&1); then
  ok "fixtures et oracle intacts (SHA256SUMS)"
else
  ko "fixtures ou oracle MODIFIÉS — interdit (voir CLAUDE.md, règle absolue n°1)"
fi
run "oracle Python : 67/67 cas" python3 shared/reference/score_reference.py

# ------------------------------------------------------------------ 2. Ressources partagées
step "Ressources partagées (textes, sons, contrastes)"
if [ -f shared/copy/voice-fr.json ]; then
  run "textes du Bosco complets (≥ 8 répliques/événement, Taquin+Sobre pour chaque erreur, ≤ 80 car.)" python3 - <<'PY'
import json, re, sys
d = json.load(open("shared/copy/voice-fr.json", encoding="utf-8"))
codes = ["BID_OUT_OF_RANGE","TRICKS_OUT_OF_RANGE","HARRY_INVALID","WAGER_INVALID","CANNON_INVALID",
         "DESTROYED_TRICKS_INVALID","TRICKS_SUM_MISMATCH","BONUS_NEGATIVE","BONUS_WITHOUT_TRICK",
         "STANDARD14_TOTAL_EXCEEDED","BLACK14_TOTAL_EXCEEDED","SKULL_KING_CAPTURE_CONFLICT",
         "PIRATES_BY_SK_EXCEEDED","MERMAIDS_BY_PIRATE_EXCEEDED","LOOT_INVALID"]
bad = []
events = d.get("events", {})
if len(events) < 10: bad.append(f"seulement {len(events)} événements (min 10)")
for k, lines in events.items():
    if len(lines) < 8: bad.append(f"événement {k}: {len(lines)} répliques (< 8)")
    for l in lines:
        if len(re.sub(r"\{[^}]+\}", "XXXXXXXX", l)) > 80: bad.append(f"trop long: {l}")
for c in codes:
    e = d.get("errors", {}).get(c)
    if not e or not e.get("witty") or not e.get("plain"): bad.append(f"erreur {c}: variantes witty/plain manquantes")
print("\n".join(bad)); sys.exit(1 if bad else 0)
PY
else
  ko "shared/copy/voice-fr.json absent"
fi

SOUNDS="tap-wood bell-bids seal-stamp coins slide-up splash sad-trombone cannon siren-song parrot-squawk new-captain rewind chest-fanfare"
missing=""
for s in $SOUNDS; do ls shared/sounds/"$s"* >/dev/null 2>&1 || missing="$missing $s"; done
if [ -z "$missing" ]; then ok "13 bruitages présents dans shared/sounds"; else ko "bruitages manquants :$missing"; fi
if [ -f scripts/generate-sounds.py ]; then ok "générateur de sons versionné"; else ko "scripts/generate-sounds.py absent"; fi
if [ -f CREDITS.md ]; then ok "CREDITS.md présent"; else ko "CREDITS.md absent"; fi

if ls scripts/check-contrast.* >/dev/null 2>&1; then
  c="$(ls scripts/check-contrast.* | head -n1)"
  case "$c" in
    *.py) run "contrastes WCAG AA (2 thèmes)" python3 "$c" ;;
    *.ts|*.mjs|*.js) run "contrastes WCAG AA (2 thèmes)" node "$c" ;;
  esac
else
  ko "scripts/check-contrast.* absent"
fi

# ------------------------------------------------------------------ 3. Web
if [ "$MODE" = "all" ] || [ "$MODE" = "--web" ]; then
  step "Web"
  if [ -f web/package.json ]; then
    cd web || exit 2
    [ -d node_modules ] || run "npm ci" npm ci
    run "typecheck (strict)" npm run --silent typecheck
    run "lint (0 avertissement)" npx eslint . --max-warnings=0
    run "tests unitaires + couverture moteur 100 %" npm run --silent test:coverage
    run "build de production" npm run --silent build
    run "e2e Playwright (partie complète, hors-ligne, axe-core)" npm run --silent e2e
    if grep -rnE ':[[:space:]]*any([^A-Za-z0-9_]|$)|as any([^A-Za-z0-9_]|$)|<any>' src --include='*.ts' --include='*.tsx' >/dev/null; then ko "usage de 'any' dans web/src"; else ok "aucun 'any'"; fi
    if grep -rnE 'fetch\(|XMLHttpRequest|sendBeacon|analytics|gtag' src >/dev/null; then ko "appel réseau ou tracking dans web/src"; else ok "aucun appel réseau / tracking"; fi
    cd "$ROOT" || exit 2
  else
    ko "web/ absent"
  fi
fi

# ------------------------------------------------------------------ 4. iOS
if [ "$MODE" = "all" ] || [ "$MODE" = "--ios" ]; then
  step "iOS"
  if [ ! -d ios ]; then
    ko "ios/ absent"
  elif ! command -v xcodebuild >/dev/null 2>&1; then
    skip "xcodebuild indisponible : iOS NON VÉRIFIÉ (consigner dans BLOCKERS.md)"
    if command -v swift >/dev/null 2>&1 && [ -d ios/ScoreKingCore ]; then
      run "swift test ScoreKingCore (fixtures)" swift test --package-path ios/ScoreKingCore
    fi
  else
    if command -v xcodegen >/dev/null 2>&1; then run "xcodegen generate" xcodegen generate --spec ios/project.yml --project ios; else skip "xcodegen absent (projet commité utilisé tel quel)"; fi
    run "swift test ScoreKingCore (fixtures, 100 %)" swift test --package-path ios/ScoreKingCore --enable-code-coverage
    UDID="$(xcrun simctl list devices available -j | python3 -c 'import json,sys
d=json.load(sys.stdin)["devices"]
ids=[x["udid"] for k,v in d.items() if "iOS" in k for x in v if x["name"].startswith("iPhone")]
print(ids[-1] if ids else "")')"
    if [ -z "$UDID" ]; then
      ko "aucun simulateur iPhone disponible"
    else
      run "xcodebuild test (unitaires + UI, simulateur iPhone, 0 warning)" bash -c \
        "set -o pipefail; xcodebuild -project ios/ScoreKing.xcodeproj -scheme ScoreKing -destination id=$UDID CODE_SIGNING_ALLOWED=NO SWIFT_TREAT_WARNINGS_AS_ERRORS=YES test 2>&1 | tail -n 200"
    fi
    if grep -rnE 'try!|as!' ios/ScoreKing ios/ScoreKingCore/Sources >/dev/null 2>&1; then ko "try! / as! dans le code de prod iOS"; else ok "aucun try! / as!"; fi
  fi
fi

# ------------------------------------------------------------------ 5. Hygiène
step "Hygiène"
if grep -rnE 'TODO|FIXME' web/src ios/ScoreKing ios/ScoreKingCore/Sources 2>/dev/null | grep -v node_modules >/dev/null; then ko "TODO/FIXME restants"; else ok "aucun TODO/FIXME"; fi
for f in README.md PROGRESS.md DECISIONS.md; do [ -s "$f" ] && ok "$f présent" || ko "$f manquant ou vide"; done

# ------------------------------------------------------------------ Bilan
echo
if [ "$FAILS" -eq 0 ] && [ "$SKIPS" -eq 0 ]; then
  printf '\033[1;32mTOUS LES CHECKS SONT VERTS\033[0m\n'; exit 0
elif [ "$FAILS" -eq 0 ]; then
  printf '\033[1;33mVERT SAUF %d CHECK(S) NON EXÉCUTABLE(S) DANS CET ENVIRONNEMENT — voir BLOCKERS.md\033[0m\n' "$SKIPS"; exit 3
else
  printf '\033[1;31m%d CHECK(S) EN ÉCHEC\033[0m\n' "$FAILS"; exit 1
fi
