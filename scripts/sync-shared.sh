#!/usr/bin/env bash
# Copie les ressources partagées (textes, sons) vers web/ (et ios/ quand il existera).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p web/src/i18n web/public/sounds
cp shared/copy/voice-fr.json web/src/i18n/fr.json
for f in shared/sounds/*.wav; do
  b="$(basename "$f" .wav)"
  if command -v afconvert >/dev/null 2>&1; then
    afconvert -f m4af -d aac -b 96000 "$f" "web/public/sounds/$b.m4a"
  else
    cp "$f" "web/public/sounds/$b.wav"
  fi
done
echo "ressources synchronisées"
