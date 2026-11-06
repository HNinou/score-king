#!/usr/bin/env python3
"""Vérifie les contrastes WCAG 2.2 AA des jetons de couleur (thèmes Parchemin et Nuit en mer)."""
import sys

THEMES = {
    "light": {"bg": "#F2E4C4", "surface": "#FBF3DF", "ink": "#2A1B12", "ink-muted": "#5E4732", "gold": "#7D5A0F",
              "positive": "#1D6A41", "negative": "#9E1B1B", "ocean": "#12384D", "action": "#7A1F1F", "on-action": "#FBF3DF"},
    "dark": {"bg": "#0B1A24", "surface": "#13293A", "ink": "#F2E4C4", "ink-muted": "#BCA683", "gold": "#E2B84A",
             "positive": "#62D394", "negative": "#FF8A7A", "ocean": "#7FC4E0", "action": "#E2B84A", "on-action": "#0B1A24"},
}
# Couleurs des joueurs (identiques dans les deux thèmes) : ≥ 3:1 sur les deux surfaces.
PLAYERS = {"c1": "#C8463C", "c2": "#B8691E", "c3": "#2F9150", "c4": "#1C8C8C", "c5": "#4277D0", "c6": "#8A5BD0", "c7": "#C44A8E", "c8": "#8C7A1E"}

def lum(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]

def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)

bad = []
for name, t in THEMES.items():
    for fg in ("ink", "ink-muted", "gold", "positive", "negative", "ocean"):
        for bg in ("bg", "surface"):
            r = ratio(t[fg], t[bg])
            if r < 4.5:
                bad.append(f"{name}: {fg} sur {bg} = {r:.2f} (< 4.5)")
    r = ratio(t["on-action"], t["action"])
    if r < 4.5:
        bad.append(f"{name}: texte sur action = {r:.2f}")
    for pid, col in PLAYERS.items():
        r = ratio(col, t["surface"])
        if r < 3:
            bad.append(f"{name}: joueur {pid} {col} sur surface = {r:.2f} (< 3)")
print("\n".join(bad) or "contrastes AA conformes")
sys.exit(1 if bad else 0)
