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


# --------------------------------------------------------------------------- outils « déjantés »

def bitcrush(x, bits=6, hold=3):
    """Son lo-fi façon vieille console : moins de bits, échantillons répétés."""
    q = 2 ** (bits - 1)
    out = []
    last = 0.0
    for i, v in enumerate(x):
        if i % hold == 0:
            last = round(v * q) / q
        out.append(last)
    return out


def highpass_noise(seconds, rng, decay=6.0, a=0.001):
    lp = noise(seconds, rng, 0, 0.2, 0.2, a=0.0)
    n = len(lp)
    out = [0.0] * n
    y = 0.0
    for i in range(n):
        v = rng.uniform(-1, 1)
        y += 0.25 * (v - y)
        out[i] = (v - y) * env(i, n, a, decay)
    return out


def bloop(f0, f1, seconds=0.08):
    return tone(0, seconds, 0.002, 18, ((1, 1), (2, 0.2)), glide=(f0, f1))


def bell(f0, seconds=1.2):
    return tone(f0, seconds, 0.002, 3.2, ((1, 1), (2.76, 0.5), (5.4, 0.25), (8.9, 0.1)))


def accordion(freq, seconds, decay=1.2):
    """Accordéon de chant de marin : deux anches légèrement désaccordées, effet « musette »."""
    n = int(SR * seconds)
    out = [0.0] * n
    p1 = p2 = 0.0
    for i in range(n):
        t = i / SR
        p1 += freq / SR
        p2 += freq * 1.006 / SR
        a = 2 * (p1 % 1.0) - 1
        b = 2 * (p2 % 1.0) - 1
        s = math.tanh(1.6 * (a + b) * 0.5 + 0.3 * math.sin(TAU * 2 * p1))
        out[i] = s * env(i, n, 0.03, decay) * (1 + 0.12 * math.sin(TAU * 5.5 * t))
    return out


def seagull(seconds=0.4, f0=1500):
    """Mouette qui se moque : cri aigu « kiyaa » qui retombe, en deux temps."""
    n = int(SR * seconds)
    out = [0.0] * n
    ph = 0.0
    for i in range(n):
        k = i / n
        f = f0 * (1 + 0.5 * math.sin(math.pi * min(1, k * 2.5))) * (1 - 0.45 * k)
        ph += TAU * f / SR
        out[i] = math.tanh(2.5 * math.sin(ph) + 0.8 * math.sin(3 * ph)) * env(i, n, 0.01, 4) * (0.7 + 0.3 * math.sin(TAU * 40 * k))
    return out


def parrot_laugh(rng):
    """Perroquet qui rit : « ha-ha-ha » rauques de plus en plus aigus."""
    x = buf(0.7)
    for k in range(4):
        n = int(SR * 0.09)
        seg = [0.0] * n
        ph = 0.0
        f = 900 + k * 120
        for i in range(n):
            ph += TAU * f * (1 + 0.3 * math.sin(TAU * 70 * i / SR)) / SR
            seg[i] = math.tanh(2.5 * math.sin(ph)) * (0.7 + 0.3 * rng.uniform(-1, 1)) * env(i, n, 0.004, 18)
        add(x, seg, k * 0.13)
    return x


def foghorn(freq=110, seconds=0.5):
    """Corne de brume : grave, rauque, un peu ridicule."""
    n = int(SR * seconds)
    out = [0.0] * n
    ph = 0.0
    for i in range(n):
        t = i / SR
        ph += freq * (1 + 0.01 * math.sin(TAU * 4 * t)) / SR
        a = 2 * (ph % 1.0) - 1
        out[i] = math.tanh(2.5 * a) * min(1, t / 0.05) * (1 if t < seconds - 0.1 else (seconds - t) / 0.1)
    return out


def rope_twang(seconds=0.6, f=180):
    """Corde de gréement qui claque (Karplus-Strong)."""
    n = int(SR * seconds)
    period = int(SR / f)
    rng = random.Random(3)
    buf_ = [rng.uniform(-1, 1) for _ in range(period)]
    out = [0.0] * n
    for i in range(n):
        v = buf_[i % period]
        nxt = buf_[(i + 1) % period]
        buf_[i % period] = 0.996 * 0.5 * (v + nxt)
        out[i] = v * (1 + 0.6 * math.exp(-i / SR * 30))
    return out


def crash(rng, seconds=1.2):
    """Cymbale."""
    x = highpass_noise(seconds, rng, 3.5)
    add(x, tone(5200, seconds, 0.001, 4, ((1, 0.3), (1.37, 0.2), (2.1, 0.15))), 0, 0.5)
    return x


# --------------------------------------------------------------------------- recettes

def tap_wood(rng, pitch):
    """« Bloop » de bulle lo-fi, hauteur variable (discret)."""
    x = bloop(pitch, pitch * 2.4, 0.07)
    add(x, noise(0.012, rng, 200, 0.6, 0.3), 0, 0.3)
    return finish(bitcrush(x, 8, 2), 0.01)


def bell_bids(rng):
    """Sifflet de bosco (trille montante) + coup de cloche + « ta-da » à l'accordéon."""
    x = buf(1.5)
    n = int(SR * 0.45)
    pipe = [0.0] * n
    ph = 0.0
    for i in range(n):
        t = i / SR
        f = 1600 + 900 * (i / n) + 160 * (1 if math.sin(TAU * 22 * t) > 0 else -1)
        ph += TAU * f / SR
        pipe[i] = math.sin(ph) * env(i, n, 0.01, 1)
    add(x, pipe, 0, 0.45)
    add(x, bell(660, 0.9), 0.45, 0.8)
    add(x, accordion(523, 0.14, 2), 0.75, 0.5)
    add(x, accordion(784, 0.4, 2), 0.9, 0.5)
    return finish(x, 0.12)


def seal_stamp(rng):
    """Gros « BONK » de tampon de cire + corde qui vibre."""
    x = buf(0.9)
    add(x, tone(0, 0.35, 0.001, 9, ((1, 1), (2.01, 0.35)), glide=(900, 160)), 0, 1.0)
    add(x, noise(0.05, rng, 60, 0.7, 0.2), 0, 0.6)
    add(x, rope_twang(0.45, 140), 0.1, 0.35)
    return finish(bitcrush(x, 7, 2), 0.1)


def coins(rng, variant):
    """« Ka-ching » de machine à sous : cascade de pièces + arpège de caisse."""
    x = buf(1.0)
    t = 0.0
    for k in range(7 + variant):
        add(x, tone(rng.uniform(2400, 4200), 0.25, 0.001, 16, ((1, 1), (1.51, 0.5), (2.37, 0.3))), t, rng.uniform(0.4, 0.8))
        t += rng.uniform(0.025, 0.06)
    base = [1046, 1318, 1568][variant % 3]
    for k, m in enumerate((1, 1.26, 1.5, 2)):
        add(x, tone(base * m, 0.18, 0.002, 10, ((1, 1), (3, 0.2))), 0.18 + k * 0.06, 0.45)
    return finish(bitcrush(x, 7, 2), 0.08)


def slide_up(rng):
    """Sifflet de bosco qui grimpe, triomphant, + deux coups de corne de brume."""
    x = buf(1.4)
    n = int(SR * 0.75)
    pipe = [0.0] * n
    ph = 0.0
    for i in range(n):
        k = i / n
        f = 700 * (3.2 ** k) * (1 + 0.03 * math.sin(TAU * 18 * i / SR))
        ph += TAU * f / SR
        pipe[i] = math.sin(ph) * env(i, n, 0.02, 0.8)
    add(x, pipe, 0, 0.7)
    add(x, foghorn(146, 0.16), 0.8, 0.45)
    add(x, foghorn(146, 0.26), 1.0, 0.5)
    return finish(x, 0.1)


def splash(rng, variant):
    """Plouf + « glouglou » ; la variante 2 finit sur une mouette moqueuse."""
    x = buf(1.4)
    add(x, noise(0.6, rng, 6, 0.55, 0.02), 0, 0.9)
    add(x, tone(0, 0.2, 0.002, 10, glide=(340, 110)), 0, 0.7)
    for k in range(4):
        add(x, bloop(500 - k * 70, 220 - k * 30, 0.12), 0.35 + k * 0.13, 0.6)
    if variant:
        add(x, seagull(0.4), 0.9, 0.4)
    return finish(x, 0.12)


def sad_trombone(rng):
    """Trombone « wah-wah-wah-waaah » puis un perroquet qui se moque."""
    x = buf(1.5)
    notes = [(293.7, 0.0, 0.24), (277.2, 0.25, 0.24), (261.6, 0.5, 0.24), (246.9, 0.75, 0.4)]
    for i, (f, at, d) in enumerate(notes):
        vib = (6, 0.04) if i == 3 else (0, 0)
        add(x, saw(f, d, 0.03, 1.4, vib, harmonics=9), at, 0.6)
    add(x, parrot_laugh(rng), 0.95, 0.45)
    return finish(x, 0.08)


def cannon(rng):
    """« Fiiiiiou… BOUM » : boulet qui siffle, explosion, débris, cordage qui claque."""
    x = buf(1.5)
    add(x, tone(0, 0.45, 0.02, 0.5, ((1, 1),), glide=(2400, 700)), 0, 0.35)
    boom = noise(0.6, rng, 6, 0.45, 0.01)
    add(boom, tone(0, 0.5, 0.001, 7, glide=(90, 35)), 0, 1.3)
    add(x, bitcrush(boom, 6, 3), 0.42)
    for k in range(5):
        add(x, noise(0.03, rng, 80, 0.5, 0.3), 0.7 + k * rng.uniform(0.04, 0.09), 0.25)
    add(x, rope_twang(0.4, 220), 1.0, 0.3)
    return finish(x, 0.1)


def siren_song(rng):
    """Thérémine qui ondule, un peu moqueur, + glissando de harpe."""
    x = buf(1.5)
    add(x, tone(0, 1.2, 0.1, 1.2, ((1, 1), (2, 0.15)), (5.5, 0.04), (420, 1050)), 0, 0.8)
    for k in range(10):
        add(x, tone(523 * (2 ** (k / 7)), 0.4, 0.001, 6, ((1, 1), (2, 0.3))), 0.9 + k * 0.035, 0.25)
    return finish(x, 0.15)


def parrot_squawk(rng):
    """Perroquet indigné qui finit par ricaner."""
    def squawk(f0):
        n = int(SR * 0.16)
        out = [0.0] * n
        ph = mph = 0.0
        for i in range(n):
            f = f0 * (1 + 0.7 * math.sin(math.pi * i / n))
            mph += TAU * 110 / SR
            ph += TAU * f * (1 + 0.4 * math.sin(mph)) / SR
            out[i] = math.tanh(3 * math.sin(ph)) * env(i, n, 0.004, 12)
        return out
    x = buf(0.8)
    add(x, squawk(1300), 0)
    add(x, squawk(1700), 0.17)
    add(x, parrot_laugh(rng), 0.36, 0.6)
    return finish(bitcrush(x, 7, 2), 0.04)


def shanty_fanfare(notes, total):
    x = buf(total)
    for f, at, d in notes:
        add(x, accordion(f, d, 1.5), at, 0.55)
        add(x, accordion(f / 2, d, 1.5), at, 0.25)
    return x


def new_captain(rng):
    """Fanfare de chant de marin à l'accordéon + cloche de bord."""
    c = 392.0
    x = shanty_fanfare([(c, 0, 0.13), (c, 0.15, 0.13), (c * 1.335, 0.3, 0.13), (c * 1.68, 0.45, 0.55)], 1.1)
    add(x, bell(988, 0.6), 0.45, 0.3)
    return finish(x, 0.15)


def rewind(rng):
    """Cabestan qui tourne à l'envers : cliquetis de cliquet qui ralentit."""
    x = buf(0.45)
    t = 0.0
    gap = 0.022
    while t < 0.38:
        add(x, noise(0.012, rng, 250, 0.9, 0.5), t, 0.8)
        add(x, tone(1800 - t * 2000, 0.015, 0.001, 200), t, 0.5)
        t += gap
        gap *= 1.12
    return finish(bitcrush(x, 7, 2), 0.04)


def chest_fanfare(rng):
    """Coffre qui grince, avalanche de pièces, fanfare à l'accordéon, cloche… et le perroquet."""
    x = buf(3.9)
    creak = [0.0] * int(SR * 0.6)
    ph = 0.0
    for i in range(len(creak)):
        f = 150 + 100 * math.sin(TAU * 2.5 * i / SR) + rng.uniform(-30, 30)
        ph += TAU * f / SR
        creak[i] = (1 if math.sin(ph) > 0.6 else -0.2) * 0.4 * env(i, len(creak), 0.05, 1.5)
    add(x, creak, 0)
    add(x, coins(rng, 1), 0.5, 0.5)
    add(x, coins(rng, 2), 0.7, 0.5)
    c = 523.25
    add(x, shanty_fanfare([(c, 0, 0.16), (c * 1.26, 0.18, 0.16), (c * 1.5, 0.36, 0.16), (c * 2, 0.54, 0.8),
                          (c * 1.5, 1.45, 0.14), (c * 2, 1.62, 1.0)], 2.8), 0.9, 0.9)
    add(x, bell(660, 1.0), 2.5, 0.4)
    add(x, parrot_laugh(rng), 3.1, 0.4)
    return finish(x, 0.15)


def drumroll(rng):
    """Roulement de tambour qui finit sur un coup de cloche et la corne de brume."""
    x = buf(2.3)
    t = 0.0
    while t < 1.75:
        g = 0.35 + 0.65 * (t / 1.75)
        add(x, noise(0.05, rng, 60, 0.35, 0.15), t, g * rng.uniform(0.8, 1))
        add(x, tone(180, 0.05, 0.001, 50), t, 0.3 * g)
        t += 0.032
    add(x, bell(523, 0.5), 1.78, 0.5)
    add(x, tone(0, 0.4, 0.001, 9, glide=(110, 60)), 1.78, 1.2)
    add(x, foghorn(98, 0.35), 1.82, 0.45)
    return finish(x, 0.12)


def whoosh(rng):
    """Souffle rapide + petite coulisse."""
    n = int(SR * 0.35)
    x = [0.0] * n
    y = 0.0
    for i in range(n):
        k = i / n
        c = 0.02 + 0.25 * math.sin(math.pi * k)
        y += c * (rng.uniform(-1, 1) - y)
        x[i] = y * math.sin(math.pi * k)
    add(x, tone(0, 0.3, 0.01, 3, glide=(500, 1300)), 0.02, 0.2)
    return finish(x, 0.05)


def kraken_roar(rng):
    """Rugissement de kraken : grondement grave qui gargouille, bulles énormes."""
    x = buf(1.5)
    n = int(SR * 1.2)
    ph = 0.0
    growl = [0.0] * n
    for i in range(n):
        t = i / SR
        f = 70 + 25 * math.sin(TAU * 3 * t) + 15 * math.sin(TAU * 11 * t)
        ph += f / SR
        frac = ph % 1.0
        growl[i] = math.tanh(3 * (2 * frac - 1)) * env(i, n, 0.08, 1.6) * (0.8 + 0.2 * math.sin(TAU * 31 * t))
    add(x, growl, 0, 0.9)
    add(x, noise(1.0, rng, 2.5, 0.08, 0.02, a=0.1), 0, 0.6)
    for k in range(6):
        add(x, bloop(180 + k * 20, 90, 0.16), 0.5 + k * 0.12, 0.5)
    return finish(bitcrush(x, 7, 2), 0.15)


def chomp(rng):
    """Croc ! Craquement + mâchoire qui claque."""
    x = buf(0.3)
    add(x, bitcrush(noise(0.09, rng, 30, 0.9, 0.4), 5, 4), 0, 0.9)
    add(x, tone(0, 0.08, 0.001, 30, glide=(300, 90)), 0.02, 0.9)
    add(x, noise(0.03, rng, 90, 0.8, 0.5), 0.11, 0.6)
    return finish(x, 0.03)


def yoho(rng):
    """« Yo… ho… HO ! » : trois coups de tambour de bord (le dernier avec cloche et corne) pour l'annonce des paris."""
    x = buf(1.6)
    for k, at in enumerate((0.0, 0.55, 1.1)):
        g = 0.6 + 0.2 * k
        add(x, tone(0, 0.35, 0.001, 9, glide=(130, 55)), at, g)
        add(x, noise(0.08, rng, 40, 0.5, 0.1), at, g * 0.5)
    add(x, bell(784, 0.5), 1.1, 0.4)
    add(x, foghorn(110, 0.35), 1.12, 0.3)
    return finish(x, 0.1)


def twang(rng):
    """Cordage qui claque (mât, gréement)."""
    return finish(rope_twang(0.7, 160), 0.08)


def main() -> None:
    rng = random.Random(1726)
    sounds = {
        "tap-wood-1": (tap_wood(rng, 420), -10),
        "tap-wood-2": (tap_wood(rng, 520), -10),
        "tap-wood-3": (tap_wood(rng, 640), -10),
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
        "kraken-roar": (kraken_roar(rng), 0),
        "chomp": (chomp(rng), -2),
        "twang": (twang(rng), -2),
        "yoho": (yoho(rng), 0),
    }
    for name, (x, gain) in sounds.items():
        save(name, x, gain)
        print(f"{name:15s} {len(x) / SR:.2f} s")


if __name__ == "__main__":
    main()
