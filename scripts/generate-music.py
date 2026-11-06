#!/usr/bin/env python3
"""
Musique d'ambiance originale de Score King (bibliothèque standard uniquement, graine fixe).
Deux boucles sans couture, pensées pour rester sous les conversations :
  - music-calm  : « Mer calme »  — houle, grincements de coque, nappe grave, petit air à l'accordéon.
  - music-storm : « Gros temps » — vent, tambour sourd, basse obstinée, même air plus tendu.
Le tout est filtré (passe-bas ~2,2 kHz) pour laisser la place aux voix des joueurs.

    python3 scripts/generate-music.py      → shared/sounds/music-*.wav
"""
from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path

SR = 32000  # suffisant pour une ambiance filtrée sous 2,2 kHz
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
        for i, v in enumerate(src):
            # la boucle est sans couture : ce qui dépasse revient au début
            self.x[(o + i) % self.n] += v * gain


def envelope(i: int, n: int, a: float, r: float) -> float:
    t = i / SR
    rem = (n - i) / SR
    return min(1.0, t / a if a else 1.0, rem / r if r else 1.0)


def accordion(freq: float, seconds: float, a=0.06, r=0.25) -> list[float]:
    """Accordéon doux (deux anches désaccordées), filtré pour rester feutré."""
    n = int(SR * seconds)
    out = [0.0] * n
    p1 = p2 = 0.0
    y = 0.0
    for i in range(n):
        p1 += freq / SR
        p2 += freq * 1.005 / SR
        s = (2 * (p1 % 1) - 1) + (2 * (p2 % 1) - 1)
        y += 0.12 * (s - y)
        out[i] = y * envelope(i, n, a, r) * (1 + 0.1 * math.sin(TAU * 5 * i / SR))
    return out


def pad(freqs: list[float], seconds: float) -> list[float]:
    """Nappe grave : sinus doux, attaque et relâche lentes."""
    n = int(SR * seconds)
    out = [0.0] * n
    for f in freqs:
        ph = 0.0
        for i in range(n):
            ph += TAU * f * (1 + 0.002 * math.sin(TAU * 0.3 * i / SR)) / SR
            out[i] += (math.sin(ph) + 0.25 * math.sin(2 * ph)) / len(freqs)
    for i in range(n):
        out[i] *= envelope(i, n, 0.8, 0.8)
    return out


def waves(seconds: float, rng: random.Random, strength: float, swell: float) -> list[float]:
    """Houle : bruit filtré dont l'intensité respire lentement."""
    n = int(SR * seconds)
    out = [0.0] * n
    y = y2 = 0.0
    for i in range(n):
        t = i / SR
        s = 0.5 + 0.5 * math.sin(TAU * t / swell) * math.sin(TAU * t / (swell * 2.7) + 1)
        c = 0.01 + 0.05 * s
        y += c * (rng.uniform(-1, 1) - y)
        y2 += 0.3 * (y - y2)
        out[i] = y2 * (0.3 + strength * s)
    return out


def creak(rng: random.Random) -> list[float]:
    """Grincement de coque, lent et grave."""
    n = int(SR * 0.9)
    out = [0.0] * n
    ph = 0.0
    for i in range(n):
        f = 90 + 40 * math.sin(math.pi * i / n) + rng.uniform(-8, 8)
        ph += f / SR
        out[i] = (1 if (ph % 1) < 0.15 else 0) * math.sin(math.pi * i / n) * 0.6
    y = 0.0
    for i in range(n):
        y += 0.15 * (out[i] - y)
        out[i] = y
    return out


def gull(f0: float = 1300) -> list[float]:
    """Mouette lointaine."""
    n = int(SR * 0.35)
    out = [0.0] * n
    ph = 0.0
    for i in range(n):
        k = i / n
        f = f0 * (1 + 0.4 * math.sin(math.pi * min(1, k * 2))) * (1 - 0.3 * k)
        ph += TAU * f / SR
        out[i] = math.sin(ph) * math.sin(math.pi * k)
    return out


def drum(rng: random.Random) -> list[float]:
    """Tambour sourd (peau détendue)."""
    n = int(SR * 0.4)
    out = [0.0] * n
    ph = 0.0
    for i in range(n):
        t = i / SR
        ph += TAU * (70 - 30 * min(1, t * 8)) / SR
        out[i] = (math.sin(ph) + 0.15 * rng.uniform(-1, 1) * math.exp(-t * 40)) * math.exp(-t * 9)
    return out


def wind(seconds: float, rng: random.Random) -> list[float]:
    """Vent qui siffle doucement dans le gréement."""
    n = int(SR * seconds)
    out = [0.0] * n
    y = 0.0
    for i in range(n):
        t = i / SR
        c = 0.08 + 0.06 * math.sin(TAU * t / 7.3)
        y += c * (rng.uniform(-1, 1) - y)
        out[i] = y * (0.5 + 0.5 * math.sin(TAU * t / 5.1) ** 2)
    return out


# Air original en ré dorien (noms MIDI ; None = silence), une note par temps.
TUNE_A = [62, 65, 69, 67, 65, 64, 62, None, 60, 64, 67, 65, 64, None, None, None]
TUNE_B = [69, 67, 65, 69, 67, 65, 64, 60, 62, 65, 64, 60, 62, None, None, None]
CHORDS = [[38, 45, 50], [38, 45, 50], [36, 43, 48], [33, 40, 45], [41, 48, 53], [36, 43, 48], [34, 41, 46], [38, 45, 50]]


def lowpass(x: list[float], c: float) -> list[float]:
    y = 0.0
    y2 = 0.0
    out = [0.0] * len(x)
    for i, v in enumerate(x):
        y += c * (v - y)
        y2 += c * (y - y2)
        out[i] = y2
    return out


def render(bpm: float, storm: bool, seed: int) -> list[float]:
    rng = random.Random(seed)
    beat = 60 / bpm
    bars = 16
    total = bars * 4 * beat
    tr = Track(total)
    # nappe : un accord par mesure, en boucle sur 8 mesures
    for b in range(bars):
        ch = CHORDS[b % len(CHORDS)]
        tr.add(pad([midi(n) for n in ch], 4 * beat + 0.8), b * 4 * beat, 0.22)
    # air : phrase A puis B, une fois sur deux en « Mer calme » (beaucoup d'espace)
    phrases = [TUNE_A, TUNE_B, None, None] if not storm else [TUNE_A, TUNE_B, TUNE_A, TUNE_B]
    for k, ph in enumerate(phrases):
        if ph is None:
            continue
        for j, note in enumerate(ph):
            if note is None:
                continue
            octave = -12 if storm and k >= 2 else 0
            tr.add(accordion(midi(note + octave), beat * 0.95), (k * 16 + j) * beat, 0.16 if not storm else 0.13)
    tr.add(waves(total, rng, 0.9 if storm else 0.55, 6.0 if storm else 9.0), 0, 1.0 if storm else 0.8)
    for k in range(int(total / 7)):
        tr.add(creak(rng), k * 7 + rng.uniform(0, 3), 0.18)
    if storm:
        tr.add(wind(total, rng), 0, 0.35)
        for b in range(bars * 4):
            tr.add(drum(rng), b * beat, 0.5 if b % 2 == 0 else 0.25)
        for b in range(bars):
            root = CHORDS[b % len(CHORDS)][0]
            for q in range(4):
                tr.add(accordion(midi(root + (7 if q == 2 else 0)), beat * 0.5, 0.01, 0.1), (b * 4 + q) * beat, 0.12)
    else:
        for k in range(3):
            tr.add(gull(rng.uniform(1100, 1500)), rng.uniform(0, total), 0.05)
    x = lowpass(tr.x, 0.35)  # ~2,2 kHz à 32 kHz : laisse la place aux voix
    peak = max(abs(v) for v in x) or 1.0
    return [v / peak * 0.7 for v in x]


def save(name: str, x: list[float]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, v)) * 32767)) for v in x))


def main() -> None:
    for name, bpm, storm, seed in (("music-calm", 76, False, 11), ("music-storm", 96, True, 12)):
        x = render(bpm, storm, seed)
        save(name, x)
        print(f"{name:12s} {len(x) / SR:.1f} s")


if __name__ == "__main__":
    main()
