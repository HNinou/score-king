#!/usr/bin/env python3
"""
Génère les bruitages originaux de Score King par synthèse (bibliothèque standard uniquement).
Graine fixe → résultat reproductible. Sortie : shared/sounds/<id>.wav (44,1 kHz, 16 bits, mono).

    python3 scripts/generate-sounds.py

Chaque son est normalisé à −1 dBFS, commence sans silence et se termine par un fondu (pas de clic).
"""
from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path

SR = 44100
OUT = Path(__file__).resolve().parents[1] / "shared" / "sounds"
TAU = 2 * math.pi
PEAK = 10 ** (-1.2 / 20)  # marge sous −1 dBFS


def buf(seconds: float) -> list[float]:
    return [0.0] * int(SR * seconds)


def add(dst: list[float], src: list[float], at: float = 0.0, gain: float = 1.0) -> None:
    o = int(at * SR)
    for i, v in enumerate(src):
        if o + i < len(dst):
            dst[o + i] += v * gain


def env(i: int, n: int, a: float, d_rate: float) -> float:
    """Attaque linéaire de `a` s puis décroissance exponentielle (taux d_rate par seconde)."""
    t = i / SR
    att = min(1.0, t / a) if a > 0 else 1.0
    return att * math.exp(-d_rate * t)


def tone(freq, seconds, a=0.004, decay=6.0, partials=((1, 1.0),), vibrato=(0, 0), glide=None):
    """Synthèse additive. glide = (f_début, f_fin) remplace freq ; vibrato = (Hz, profondeur relative)."""
    n = int(SR * seconds)
    out = [0.0] * n
    phase = [0.0] * len(partials)
    for i in range(n):
        t = i / SR
        f = freq
        if glide:
            k = i / n
            f = glide[0] * (glide[1] / glide[0]) ** k
        if vibrato[0]:
            f *= 1 + vibrato[1] * math.sin(TAU * vibrato[0] * t)
        s = 0.0
        for j, (mult, amp) in enumerate(partials):
            phase[j] += TAU * f * mult / SR
            s += amp * math.sin(phase[j])
        out[i] = s * env(i, n, a, decay)
    return out


def saw(freq, seconds, a=0.02, decay=1.5, vibrato=(0, 0), glide=None, harmonics=12):
    parts = tuple((h, 1.0 / h) for h in range(1, harmonics + 1))
    return tone(freq, seconds, a, decay, parts, vibrato, glide)


def noise(seconds, rng, decay=8.0, lp_start=0.3, lp_end=0.02, a=0.002):
    """Bruit blanc filtré passe-bas à coefficient glissant (plouf, canon, ressac)."""
    n = int(SR * seconds)
    out = [0.0] * n
    y = 0.0
    for i in range(n):
        k = i / n
        c = lp_start + (lp_end - lp_start) * k
        y += c * (rng.uniform(-1, 1) - y)
        out[i] = y * env(i, n, a, decay)
    return out


def finish(x: list[float], fade_out=0.03) -> list[float]:
    # supprime le silence initial
    start = next((i for i, v in enumerate(x) if abs(v) > 1e-4), 0)
    x = x[start:]
    # supprime la queue quasi silencieuse
    end = len(x)
    while end > 1 and abs(x[end - 1]) < 1e-4:
        end -= 1
    x = x[:end]
    peak = max(abs(v) for v in x) or 1.0
    x = [v * PEAK / peak for v in x]
    nf = min(len(x), int(fade_out * SR))
    for i in range(nf):
        x[len(x) - nf + i] *= 1 - (i + 1) / nf
    ni = min(len(x), int(0.002 * SR))
    for i in range(ni):
        x[i] *= i / ni
    return x


def save(name: str, x: list[float], gain_db: float = 0.0) -> None:
    g = 10 ** (gain_db / 20)
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, v * g)) * 32767)) for v in x))


# --------------------------------------------------------------------------- recettes

def tap_wood(rng, pitch):
    """« Toc » de bois : partiels inharmoniques très courts + clic de bruit."""
    x = tone(pitch, 0.09, 0.001, 55, ((1, 1), (2.3, 0.5), (4.1, 0.25)))
    add(x, noise(0.02, rng, 160, 0.6, 0.2), 0, 0.4)
    return finish(x, 0.01)


def bell(f0, seconds=1.2):
    return tone(f0, seconds, 0.002, 3.2, ((1, 1), (2.76, 0.5), (5.4, 0.25), (8.9, 0.1)))


def bell_bids(rng):
    """Deux coups de cloche de navire."""
    x = buf(1.4)
    add(x, bell(660, 1.0), 0)
    add(x, bell(660, 1.0), 0.32)
    return finish(x, 0.15)


def seal_stamp(rng):
    """Tampon de cire (coup sourd) + léger ressac."""
    x = buf(1.1)
    add(x, tone(90, 0.25, 0.001, 22, ((1, 1), (1.5, 0.4))), 0)
    add(x, noise(0.06, rng, 60, 0.5, 0.1), 0, 0.6)
    add(x, noise(0.9, rng, 2.5, 0.05, 0.01, a=0.25), 0.15, 0.5)
    return finish(x, 0.2)


def coins(rng, variant):
    """Tintement de pièces : 4 à 5 impacts métalliques décalés."""
    x = buf(0.9)
    t = 0.0
    for k in range(4 + variant % 2):
        f = rng.uniform(2200, 3600)
        add(x, tone(f, 0.35, 0.001, 14, ((1, 1), (1.51, 0.6), (2.37, 0.35), (3.1, 0.2))), t, rng.uniform(0.6, 1))
        t += rng.uniform(0.04, 0.09)
    return finish(x, 0.08)


def slide_up(rng):
    """Flûte à coulisse montante, triomphante."""
    x = tone(0, 0.9, 0.03, 0.8, ((1, 1), (2, 0.15)), (6, 0.012), (300, 900))
    add(x, tone(900, 0.25, 0.01, 4, ((1, 1), (2, 0.15)), (6, 0.02)), 0.88)
    return finish(x, 0.12)


def splash(rng, variant):
    """Plouf : bruit passe-bas descendant + bulles sinusoïdales."""
    x = buf(1.0)
    add(x, noise(0.7, rng, 5, 0.5, 0.02), 0)
    for k in range(3 + variant):
        add(x, tone(0, 0.08, 0.002, 30, glide=(rng.uniform(400, 700), rng.uniform(900, 1400))), 0.12 + k * 0.07, 0.35)
    add(x, tone(0, 0.18, 0.002, 12, glide=(320, 120)), 0, 0.7)
    return finish(x, 0.15)


def sad_trombone(rng):
    """Trombone « wah-wah-waaah » : 4 notes descendantes, la dernière avec vibrato."""
    x = buf(1.5)
    notes = [(293.7, 0.0, 0.28), (277.2, 0.3, 0.28), (261.6, 0.6, 0.28), (246.9, 0.9, 0.6)]
    for i, (f, at, d) in enumerate(notes):
        vib = (5.5, 0.025) if i == 3 else (0, 0)
        add(x, saw(f, d, 0.04, 1.2, vib, harmonics=8), at, 0.6)
    return finish(x, 0.15)


def cannon(rng):
    """Coup de canon : bruit + basse à décroissance rapide + écho."""
    x = buf(1.5)
    boom = noise(0.6, rng, 7, 0.4, 0.01)
    add(boom, tone(0, 0.5, 0.001, 8, glide=(80, 40)), 0, 1.2)
    add(x, boom, 0)
    add(x, boom, 0.32, 0.3)
    add(x, boom, 0.62, 0.1)
    return finish(x, 0.2)


def siren_song(rng):
    """Glissando éthéré, un peu moqueur."""
    x = buf(1.5)
    add(x, tone(0, 1.3, 0.15, 1.2, ((1, 1), (2, 0.2), (3, 0.08)), (5, 0.015), (500, 1100)), 0)
    add(x, tone(0, 1.3, 0.15, 1.2, ((1, 1),), (5.3, 0.015), (750, 1650)), 0.05, 0.35)
    add(x, tone(1100, 0.3, 0.02, 6, ((1, 1),), (7, 0.03)), 1.1, 0.4)
    return finish(x, 0.2)


def parrot_squawk(rng):
    """Cri de perroquet indigné : FM aiguë, deux cris."""
    def squawk(f0):
        n = int(SR * 0.18)
        out = [0.0] * n
        ph = mph = 0.0
        for i in range(n):
            t = i / SR
            f = f0 * (1 + 0.6 * math.sin(math.pi * i / n))
            mph += TAU * 90 / SR
            ph += TAU * f * (1 + 0.35 * math.sin(mph)) / SR
            out[i] = math.tanh(2.5 * math.sin(ph)) * env(i, n, 0.005, 10)
        return out

    x = buf(0.6)
    add(x, squawk(1300), 0)
    add(x, squawk(1550), 0.22)
    return finish(x, 0.04)


def fanfare(notes, total):
    x = buf(total)
    for f, at, d in notes:
        add(x, saw(f, d, 0.015, 2.2, (5, 0.006), harmonics=10), at, 0.5)
        add(x, saw(f * 1.5, d, 0.015, 2.2, harmonics=6), at, 0.15)
    return x


def new_captain(rng):
    """Mini-fanfare de cuivres."""
    c = 392.0
    x = fanfare([(c, 0, 0.14), (c, 0.15, 0.14), (c * 1.335, 0.3, 0.14), (c * 1.68, 0.45, 0.6)], 1.2)
    return finish(x, 0.15)


def rewind(rng):
    """Flûte à coulisse descendante, rapide."""
    return finish(tone(0, 0.35, 0.01, 2, ((1, 1), (2, 0.15)), (8, 0.01), (900, 260)), 0.05)


def chest_fanfare(rng):
    """Grincement de coffre + pièces + fanfare."""
    x = buf(3.8)
    creak = [0.0] * int(SR * 0.6)
    ph = 0.0
    for i in range(len(creak)):
        f = 160 + 90 * math.sin(TAU * 2.5 * i / SR) + rng.uniform(-30, 30)
        ph += TAU * f / SR
        creak[i] = (1 if math.sin(ph) > 0.6 else -0.2) * 0.4 * env(i, len(creak), 0.05, 1.5)
    add(x, creak, 0)
    add(x, coins(rng, 1), 0.55, 0.6)
    add(x, coins(rng, 0), 0.75, 0.5)
    c = 523.25
    add(x, fanfare([(c, 0, 0.18), (c * 1.26, 0.2, 0.18), (c * 1.5, 0.4, 0.18), (c * 2, 0.6, 0.9),
                    (c * 1.5, 1.55, 0.15), (c * 2, 1.72, 1.2)], 2.9), 0.9, 0.9)
    return finish(x, 0.4)


def drumroll(rng):
    """Roulement de tambour (annonce du classement) qui finit sur un coup."""
    x = buf(2.2)
    t = 0.0
    while t < 1.75:
        g = 0.35 + 0.65 * (t / 1.75)
        add(x, noise(0.05, rng, 60, 0.35, 0.15), t, g * rng.uniform(0.8, 1))
        add(x, tone(180, 0.05, 0.001, 50), t, 0.3 * g)
        t += 0.032
    add(x, noise(0.4, rng, 9, 0.5, 0.05), 1.78, 1.4)
    add(x, tone(0, 0.4, 0.001, 9, glide=(110, 60)), 1.78, 1.5)
    return finish(x, 0.15)


def whoosh(rng):
    """Souffle rapide (cartes du classement qui glissent)."""
    n = int(SR * 0.35)
    x = [0.0] * n
    y = 0.0
    for i in range(n):
        k = i / n
        c = 0.02 + 0.25 * math.sin(math.pi * k)
        y += c * (rng.uniform(-1, 1) - y)
        x[i] = y * math.sin(math.pi * k)
    return finish(x, 0.05)


def main() -> None:
    rng = random.Random(1726)
    sounds = {
        "tap-wood-1": (tap_wood(rng, 520), -10),
        "tap-wood-2": (tap_wood(rng, 600), -10),
        "tap-wood-3": (tap_wood(rng, 460), -10),
        "bell-bids": (bell_bids(rng), 0),
        "seal-stamp": (seal_stamp(rng), 0),
        "coins-1": (coins(rng, 0), -2),
        "coins-2": (coins(rng, 1), -2),
        "coins-3": (coins(rng, 2), -2),
        "slide-up": (slide_up(rng), -1),
        "splash-1": (splash(rng, 0), 0),
        "splash-2": (splash(rng, 1), 0),
        "sad-trombone": (sad_trombone(rng), 0),
        "cannon": (cannon(rng), 0),
        "siren-song": (siren_song(rng), -1),
        "parrot-squawk": (parrot_squawk(rng), -3),
        "new-captain": (new_captain(rng), 0),
        "rewind": (rewind(rng), -4),
        "chest-fanfare": (chest_fanfare(rng), 0),
        "drumroll": (drumroll(rng), 0),
        "whoosh": (whoosh(rng), -4),
    }
    for name, (x, gain) in sounds.items():
        save(name, x, gain)
        print(f"{name:15s} {len(x) / SR:.2f} s")


if __name__ == "__main__":
    main()
