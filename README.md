# Score King

Compteur de points pour le jeu de cartes **Skull King** : application web installable (PWA, hors-ligne). La version iOS viendra ensuite.

## Lancer l'app web
```bash
cd web
npm install
npm run dev          # http://localhost:5173
```
Version de production : `npm run build && npx vite preview`. Sur téléphone (même Wi-Fi) : `npm run dev -- --host`, puis ouvrir l'adresse affichée et « Ajouter à l'écran d'accueil ».

Vérifier tout : `./scripts/check-all.sh --web`.

> Application non officielle, non affiliée à Grandpa Beck's Games. Skull King est une marque de Grandpa Beck's Games.
