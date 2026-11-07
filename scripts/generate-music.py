#!/usr/bin/env python3
"""
Musique d'ambiance originale de Score King (bibliothèque standard uniquement, graine fixe).
Deux morceaux d'environ 5 minutes, construits en sections avec variations (jamais deux reprises identiques),
qui bouclent sans couture et restent sous les conversations (filtrés sous ~2,2 kHz) :
  - music-calm  : « Mer calme »  — accordéon, sifflet, mandoline, houle, coque qui grince.
  - music-storm : « Gros temps » — mêmes airs, tambours par vagues, vent, tonnerre au loin.

    python3 scripts/generate-music.py      → shared/sounds/music-*.wav (non versionnés, trop lourds)
    ./scripts/sync-shared.sh               → web/public/sounds/music-*.m4a
"""
from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path

SR = 32000
OUT = Path(__file__).resolve().parents[1] / "shared" / "sounds"
TAU = 2 * math.pi


def midi(n: float) -> float:
    return 440.0 * 2 ** ((n - 69) / 12)


class Track:
    def __init__(self, seconds: float):
        self.n = int(SR * seconds)
        self.x = [0.0] * self.n

    def add(self, src: list[float], at: float, gain: float) -> None:
        o = int(at * SR)
        n = self.n
        x = self.x
        for i, v in enumerate(src):
            x[(o + i) % n] += v * gain  # ce qui dépasse revient au début : boucle sans couture


def envelope(i: int, n: int, a: float, r: float) -> float:
    t = i / SR
    rem = (n - i) / SR
    return min(1.0, t / a if a else 1.0, rem / r if r else 1.0)


# --------------------------------------------------------------------------- instruments

def accordion(freq: float, seconds: float, a=0.06, r=0.25) -> list[float]:
    """Accordéon doux (deux anches désaccordées), filtré."""
    n = int(SR * seconds)
    out = [0.0] * n
    p1 = p2 = y = 0.0
    for i in range(n):
        p1 += freq / SR
        p2 += freq * 1.005 / SR
        s = (2 * (p1 % 1) - 1) + (2 * (p2 % 1) - 1)
        y += 0.12 * (s - y)
        out[i] = y * envelope(i, n, a, r) * (1 + 0.1 * math.sin(TAU * 5 * i / SR))
    return out


def whistle(freq: float, seconds: float, rng: random.Random) -> list[float]:
    """Sifflet de pont (flûte en fer-blanc) : sinus, souffle, vibrato qui arrive tard."""
    n = int(SR * seconds)
    out = [0.0] * n
    ph = b = 0.0
    for i in range(n):
        t = i / SR
        vib = 1 + 0.012 * min(1, t / 0.4) * math.sin(TAU * 5.5 * t)
        ph += TAU * freq * vib / SR
        b += 0.05 * (rng.uniform(-1, 1) - b)
        out[i] = (math.sin(ph) + 0.12 * math.sin(2 * ph) + 0.35 * b) * envelope(i, n, 0.04, 0.12)
    return out


def pluck(freq: float, seconds: float, rng: random.Random) -> list[float]:
    """Mandoline (corde pincée, Karplus-Strong)."""
    n = int(SR * seconds)
    period = max(2, int(SR / freq))
    buf = [rng.uniform(-1, 1) for _ in range(period)]
    out = [0.0] * n
    for i in range(n):
        k = i % period
        v = buf[k]
        buf[k] = 0.994 * 0.5 * (v + buf[(k + 1) % period])
        out[i] = v * envelope(i, n, 0.002, 0.05)
    return out


def pad(freqs: list[float], seconds: float) -> list[float]:
    n = int(SR * seconds)
    out = [0.0] * n
    for f in freqs:
        ph = 0.0
        step = TAU * f / SR
        for i in range(n):
            ph += step
            out[i] += (math.sin(ph) + 0.25 * math.sin(2 * ph)) / len(freqs)
    for i in range(n):
        out[i] *= envelope(i, n, 0.8, 0.8)
    return out


def waves(seconds: float, rng: random.Random, strength: float, swell: float) -> list[float]:
    n = int(SR * seconds)
    out = [0.0] * n
    y = y2 = 0.0
    for i in range(n):
        t = i / SR
        s = 0.5 + 0.5 * math.sin(TAU * t / swell) * math.sin(TAU * t / (swell * 2.7) + 1)
        y += (0.01 + 0.05 * s) * (rng.uniform(-1, 1) - y)
        y2 += 0.3 * (y - y2)
        out[i] = y2 * (0.3 + strength * s)
    return out


def wind(seconds: float, rng: random.Random) -> list[float]:
    n = int(SR * seconds)
    out = [0.0] * n
    y = 0.0
    for i in range(n):
        t = i / SR
        y += (0.08 + 0.06 * math.sin(TAU * t / 7.3)) * (rng.uniform(-1, 1) - y)
        out[i] = y * (0.4 + 0.6 * math.sin(TAU * t / 11.1) ** 2)
    return out


def creak(rng: random.Random) -> list[float]:
    n = int(SR * 0.9)
    out = [0.0] * n
    ph = y = 0.0
    for i in range(n):
        ph += (90 + 40 * math.sin(math.pi * i / n) + rng.uniform(-8, 8)) / SR
        v = (1 if (ph % 1) < 0.15 else 0) * math.sin(math.pi * i / n) * 0.6
        y += 0.15 * (v - y)
        out[i] = y
    return out


def gull(f0: float) -> list[float]:
    n = int(SR * 0.35)
    out = [0.0] * n
    ph = 0.0
    for i in range(n):
        k = i / n
        ph += TAU * f0 * (1 + 0.4 * math.sin(math.pi * min(1, k * 2))) * (1 - 0.3 * k) / SR
        out[i] = math.sin(ph) * math.sin(math.pi * k)
    return out


def bell(f0: float, seconds=2.5) -> list[float]:
    n = int(SR * seconds)
    out = [0.0] * n
    for m, a in ((1, 1), (2.76, 0.4), (5.4, 0.2)):
        ph = 0.0
        for i in range(n):
            ph += TAU * f0 * m / SR
            out[i] += a * math.sin(ph) * math.exp(-i / SR * (2 + m))
    return out


def drum(rng: random.Random, low=70.0) -> list[float]:
    n = int(SR * 0.4)
    out = [0.0] * n
    ph = 0.0
    for i in range(n):
        t = i / SR
        ph += TAU * (low - 30 * min(1, t * 8)) / SR
        out[i] = (math.sin(ph) + 0.15 * rng.uniform(-1, 1) * math.exp(-t * 40)) * math.exp(-t * 9)
    return out


def thunder(rng: random.Random) -> list[float]:
    n = int(SR * 3.0)
    out = [0.0] * n
    y = y2 = 0.0
    for i in range(n):
        t = i / SR
        y += 0.02 * (rng.uniform(-1, 1) - y)
        y2 += 0.1 * (y - y2)
        out[i] = y2 * min(1, t / 0.3) * math.exp(-t * 1.2) * (1 + 0.5 * math.sin(TAU * 3 * t))
    return out


# --------------------------------------------------------------------------- écriture

# Airs originaux en ré dorien (une note par temps, None = silence), 4 mesures chacun.
TUNES = {
    "A": [62, 65, 69, 67, 65, 64, 62, None, 60, 64, 67, 65, 64, None, None, None],
    "B": [69, 67, 65, 69, 67, 65, 64, 60, 62, 65, 64, 60, 62, None, None, None],
    "C": [69, None, 67, 65, 64, 65, 67, None, 65, 64, 62, None, 60, 62, 64, None],
    "D": [62, 64, 65, 67, 69, None, 72, 69, 67, 65, 64, 62, 64, None, None, None],
    "E": [65, 69, 72, 70, 69, 67, 65, None, 67, 69, 70, 67, 65, None, None, None],
}
SCALE = [50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79]
DM, C, A, F, BB, GM = [38, 45, 50], [36, 43, 48], [33, 40, 45], [41, 48, 53], [34, 41, 46], [43, 50, 55]
PROGS = {"P1": [DM, DM, C, A], "P2": [F, C, BB, C], "P3": [DM, BB, F, C], "P4": [GM, DM, A, DM]}


def vary(tune: list[int | None], rng: random.Random, amount: float) -> list[int | None]:
    """Petite variation : notes voisines, silences, notes de passage — jamais deux reprises identiques."""
    out: list[int | None] = []
    for j, note in enumerate(tune):
        r = rng.random()
        if note is not None and r < amount and j % 4:
            k = SCALE.index(note) if note in SCALE else None
            if k is not None and r < amount * 0.7:
                note = SCALE[max(0, min(len(SCALE) - 1, k + rng.choice((-1, 1))))]
            else:
                note = None
        elif note is None and r < amount * 0.6 and out and out[-1] is not None:
            prev = out[-1]
            k = SCALE.index(prev) if prev in SCALE else 7
            note = SCALE[max(0, k - 1)]
        out.append(note)
    return out


def render(spec: list[dict], bpm: float, storm: bool, seed: int) -> list[float]:
    rng = random.Random(seed)
    beat = 60 / bpm
    bars = sum(s["bars"] for s in spec)
    total = bars * 4 * beat
    tr = Track(total)
    tr.add(waves(total, rng, 0.9 if storm else 0.55, 6.0 if storm else 9.0), 0, 1.0 if storm else 0.8)
    if storm:
        tr.add(wind(total, rng), 0, 0.35)
    for k in range(int(total / 7)):
        tr.add(creak(rng), k * 7 + rng.uniform(0, 3), 0.16)

    bar0 = 0
    for sec in spec:
        start_bar = bar0
        prog = PROGS[sec["prog"]]
        for b in range(sec["bars"]):
            t0 = (start_bar + b) * 4 * beat
            chord = prog[b % 4]
            if sec.get("pad", 0.2):
                tr.add(pad([midi(n) for n in chord], 4 * beat + 0.8), t0, sec.get("pad", 0.2))
            if sec.get("arp"):
                for q in range(8):  # croches de mandoline sur l'accord
                    n = chord[[0, 1, 2, 1, 2, 1, 0, 2][q]] + 12 + (12 if q in (3, 5) else 0)
                    tr.add(pluck(midi(n), beat * 0.9, rng), t0 + q * beat / 2, sec["arp"])
            if sec.get("bass"):
                for q in range(4):
                    n = chord[0] + (7 if q == 2 else 0)
                    tr.add(accordion(midi(n), beat * 0.5, 0.01, 0.1), t0 + q * beat, sec["bass"])
            if sec.get("drums"):
                for q in range(4):
                    g = sec["drums"] * (1.0 if q % 2 == 0 else 0.5)
                    tr.add(drum(rng), t0 + q * beat, g)
                    if sec.get("eighths"):
                        tr.add(drum(rng, 110), t0 + (q + 0.5) * beat, g * 0.35)
                if b % 4 == 3 and sec.get("fills"):
                    for e in range(4):
                        tr.add(drum(rng, 90 + e * 15), t0 + (3 + e / 4) * beat, sec["drums"] * 0.6)
        # mélodies : une phrase de 4 mesures par entrée, variée
        for p, name in enumerate(sec.get("tunes", [])):
            tune = vary(TUNES[name], rng, sec.get("vary", 0.15))
            shift = sec.get("shift", 0)
            for j, note in enumerate(tune):
                if note is None:
                    continue
                at = (start_bar + p * 4) * 4 * beat + j * beat
                f = midi(note + shift)
                inst = sec["lead"]
                if inst == "accordion":
                    tr.add(accordion(f, beat * 0.95), at, sec.get("lead_gain", 0.16))
                elif inst == "whistle":
                    tr.add(whistle(f * 2, beat * 0.9, rng), at, sec.get("lead_gain", 0.1))
                else:
                    tr.add(pluck(f * 2, beat * 1.5, rng), at, sec.get("lead_gain", 0.22))
                if sec.get("harmony") and j % 2 == 0:
                    tr.add(accordion(midi(note - 12 + shift), beat * 1.9), at, 0.06)
        for extra in sec.get("extras", []):
            for _ in range(extra[1]):
                at = (start_bar + rng.uniform(0, sec["bars"])) * 4 * beat
                if extra[0] == "gull":
                    tr.add(gull(rng.uniform(1100, 1500)), at, 0.05)
                elif extra[0] == "bell":
                    tr.add(bell(rng.choice((392, 440, 523))), at, 0.12)
                elif extra[0] == "thunder":
                    tr.add(thunder(rng), at, 0.5)
        bar0 += sec["bars"]

    # filtre passe-bas doux (~2,2 kHz) : laisse la place aux voix des joueurs
    y = y2 = 0.0
    x = tr.x
    for i, v in enumerate(x):
        y += 0.35 * (v - y)
        y2 += 0.35 * (y - y2)
        x[i] = y2
    peak = max(abs(v) for v in x) or 1.0
    return [v / peak * 0.7 for v in x]


CALM = [
    {"bars": 8, "prog": "P1", "pad": 0.18, "extras": [("gull", 2)]},
    {"bars": 16, "prog": "P1", "lead": "accordion", "tunes": ["A", "B", "A", "B"], "vary": 0.12},
    {"bars": 8, "prog": "P3", "pad": 0.14, "arp": 0.07, "extras": [("gull", 1)]},
    {"bars": 16, "prog": "P3", "lead": "whistle", "tunes": ["C", "D", "C", "D"], "arp": 0.04, "vary": 0.15},
    {"bars": 8, "prog": "P1", "pad": 0.1, "extras": [("bell", 2), ("gull", 2)]},
    {"bars": 16, "prog": "P2", "lead": "pluck", "tunes": ["E", "E", "B", "E"], "harmony": True, "vary": 0.18},
    {"bars": 16, "prog": "P4", "lead": "accordion", "tunes": ["A", "D", "B", "C"], "shift": -12, "lead_gain": 0.2, "arp": 0.04, "vary": 0.2},
    {"bars": 8, "prog": "P1", "pad": 0.16, "extras": [("bell", 1)]},
]

STORM = [
    {"bars": 8, "prog": "P1", "drums": 0.35, "bass": 0.1, "extras": [("thunder", 1)]},
    {"bars": 16, "prog": "P1", "lead": "accordion", "tunes": ["A", "B", "A", "B"], "drums": 0.45, "bass": 0.12, "vary": 0.15},
    {"bars": 8, "prog": "P4", "drums": 0.55, "eighths": True, "bass": 0.12, "lead": "whistle", "tunes": ["D", "C"], "fills": True},
    {"bars": 16, "prog": "P3", "lead": "whistle", "tunes": ["C", "D", "C", "D"], "harmony": True, "drums": 0.5, "bass": 0.12, "fills": True, "vary": 0.18},
    {"bars": 8, "prog": "P1", "pad": 0.12, "drums": 0.2, "extras": [("thunder", 2), ("bell", 1)]},
    {"bars": 16, "prog": "P4", "lead": "pluck", "tunes": ["B", "A", "D", "B"], "arp": 0.05, "drums": 0.45, "bass": 0.1, "vary": 0.2},
    {"bars": 16, "prog": "P2", "lead": "accordion", "tunes": ["E", "E", "C", "E"], "drums": 0.5, "eighths": True, "bass": 0.12, "fills": True, "vary": 0.18},
    {"bars": 24, "prog": "P1", "lead": "accordion", "tunes": ["A", "B", "D", "C", "B", "A"], "harmony": True, "drums": 0.6, "eighths": True, "bass": 0.14, "fills": True, "vary": 0.22, "extras": [("thunder", 2)]},
    {"bars": 8, "prog": "P1", "drums": 0.3, "bass": 0.1, "pad": 0.15},
]


def save(name: str, x: list[float]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, v)) * 32767)) for v in x))


def main() -> None:
    for name, spec, bpm, storm, seed in (("music-calm", CALM, 76, False, 11), ("music-storm", STORM, 96, True, 12)):
        x = render(spec, bpm, storm, seed)
        save(name, x)
        print(f"{name:12s} {len(x) / SR / 60:.1f} min")


if __name__ == "__main__":
    main()
