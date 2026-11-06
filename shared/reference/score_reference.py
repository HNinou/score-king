#!/usr/bin/env python3
"""
Implémentation de RÉFÉRENCE du score Skull King (règles officielles 2021, Grandpa Beck's Games).
Elle sert uniquement à vérifier les fixtures partagées (shared/fixtures/scoring-cases.json).
Elle n'est PAS livrée dans les applications.

    python3 shared/reference/score_reference.py           # vérifie toutes les fixtures

Toute divergence entre cette référence, le moteur TypeScript et le moteur Swift est un BUG
BLOQUANT. La spécification qui fait foi est docs/01-REGLES-SCORE.md.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures" / "scoring-cases.json"

DEFAULT_RULES = {
    "scoring": "skullKing",          # "skullKing" | "rascal"
    "skullKingByMermaidBonus": 40,   # 40 (règles 2021) | 50 (édition d'origine)
    "mermaidByPirateBonusEnabled": True,
}
BASE_DECK = 70                       # 56 cartes numérotées + 5 pirates + Tigresse + Skull King + 2 sirènes + 5 fuites
PRESETS = {
    "standard": list(range(1, 11)),
    "evenKeeled": [2, 2, 4, 4, 6, 6, 8, 8, 10, 10],
    "skipToTheBrawl": [6, 7, 8, 9, 10],
    "swiftAndSalty": [5, 5, 5, 5, 5],
    "broadsideBarrage": [10] * 10,
    "whirlpool": [9, 9, 7, 7, 5, 5, 3, 3, 1, 1],
    "pastYourBedtime": [1],
}


# --------------------------------------------------------------------------- score
def effective_bid(p: dict) -> int:
    return p["bid"] + p.get("harryAdjustment", 0)


def raw_bonus(b: dict, rules: dict) -> int:
    total = 10 * b.get("standard14", 0) + (20 if b.get("black14", False) else 0)
    total += 30 * b.get("piratesBySkullKing", 0)
    if b.get("skullKingByMermaid", False):
        total += rules["skullKingByMermaidBonus"]
    if rules["mermaidByPirateBonusEnabled"]:
        total += 20 * b.get("mermaidsByPirate", 0)
    return total


def score_round(case: dict) -> dict:
    rules = {**DEFAULT_RULES, **case.get("rules", {})}
    n = case["cardsDealt"]
    players = case["players"]
    exact = {p["id"]: effective_bid(p) == p["tricks"] for p in players}

    loot = {p["id"]: 0 for p in players}
    for a in case.get("lootAlliances", []):
        if exact[a["playedBy"]] and exact[a["capturedBy"]]:
            loot[a["playedBy"]] += 20
            loot[a["capturedBy"]] += 20

    out = {}
    for p in players:
        pid, bid, tricks = p["id"], effective_bid(p), p["tricks"]
        diff = abs(bid - tricks)
        rb = raw_bonus(p.get("bonus", {}), rules)
        wager = p.get("rascalWager", 0)
        if rules["scoring"] == "skullKing":
            if bid == 0:
                bid_pts = 10 * n if tricks == 0 else -10 * n
            else:
                bid_pts = 20 * bid if diff == 0 else -10 * diff
            bonus_pts = rb + loot[pid] if diff == 0 else 0
        elif p.get("cannon", "grapeshot") == "cannonball":
            bid_pts = 15 * n if diff == 0 else 0
            bonus_pts = rb + loot[pid] if diff == 0 else 0
        elif diff == 0:
            bid_pts, bonus_pts = 10 * n, rb + loot[pid]
        elif diff == 1:
            bid_pts, bonus_pts = 5 * n, rb // 2   # rb est toujours un multiple de 10
        else:
            bid_pts, bonus_pts = 0, 0
        wager_pts = wager if diff == 0 else -wager
        out[pid] = {"bidPoints": bid_pts, "bonusPoints": bonus_pts,
                    "wagerPoints": wager_pts, "total": bid_pts + bonus_pts + wager_pts}
    return out


# --------------------------------------------------------------------------- planning
def deck_size(exp: dict) -> int:
    return BASE_DECK + (2 if exp.get("loot") else 0) + (1 if exp.get("kraken") else 0) + (1 if exp.get("whiteWhale") else 0)


def schedule(setup: dict) -> list[int]:
    seats = setup["playerCount"] + (1 if setup["playerCount"] == 2 else 0)  # fantôme de Barbe-Grise à 2 joueurs
    cap = deck_size(setup.get("expansions", {})) // seats
    return [min(c, cap) for c in PRESETS[setup["preset"]]]


# --------------------------------------------------------------------------- validation
def validate(case: dict) -> list[str]:
    s, r = case["setup"], case["round"]
    exp = s.get("expansions", {})
    n, players = r["cardsDealt"], r["players"]
    pc = len(players)
    seats = pc + (1 if pc == 2 else 0)
    ids = {p["id"] for p in players}
    errs: set[str] = set()
    leviathans = (1 if exp.get("kraken") else 0) + (1 if exp.get("whiteWhale") else 0)
    destroyed = r.get("destroyedTricks", 0)
    if destroyed < 0 or destroyed > leviathans:
        errs.add("DESTROYED_TRICKS_INVALID")

    for p in players:
        if not 0 <= p["bid"] <= n:
            errs.add("BID_OUT_OF_RANGE")
        if not 0 <= p["tricks"] <= n:
            errs.add("TRICKS_OUT_OF_RANGE")
        adj = p.get("harryAdjustment", 0)
        if adj not in (-1, 0, 1) or (adj != 0 and not 0 <= p["bid"] + adj <= n):
            errs.add("HARRY_INVALID")
        if p.get("rascalWager", 0) not in (0, 10, 20):
            errs.add("WAGER_INVALID")
        if p.get("cannon", "grapeshot") not in ("grapeshot", "cannonball"):
            errs.add("CANNON_INVALID")
        b = p.get("bonus", {})
        counts = [b.get("standard14", 0), b.get("piratesBySkullKing", 0), b.get("mermaidsByPirate", 0)]
        if any(c < 0 for c in counts):
            errs.add("BONUS_NEGATIVE")
        captured = sum(counts) > 0 or b.get("black14", False) or b.get("skullKingByMermaid", False)
        if captured and p["tricks"] == 0:
            errs.add("BONUS_WITHOUT_TRICK")

    tricks_sum = sum(p["tricks"] for p in players)
    target = n - destroyed
    if (pc == 2 and tricks_sum > target) or (pc != 2 and tricks_sum != target):
        errs.add("TRICKS_SUM_MISMATCH")

    bonuses = [p.get("bonus", {}) for p in players]
    if sum(b.get("standard14", 0) for b in bonuses) > 3:
        errs.add("STANDARD14_TOTAL_EXCEEDED")
    if sum(1 for b in bonuses if b.get("black14", False)) > 1:
        errs.add("BLACK14_TOTAL_EXCEEDED")
    sk_by_mermaid = sum(1 for b in bonuses if b.get("skullKingByMermaid", False))
    sk_pirates_holders = [b.get("piratesBySkullKing", 0) for b in bonuses if b.get("piratesBySkullKing", 0) > 0]
    if sk_by_mermaid > 1 or (sk_by_mermaid == 1 and sk_pirates_holders):
        errs.add("SKULL_KING_CAPTURE_CONFLICT")
    if len(sk_pirates_holders) > 1 or sum(sk_pirates_holders) > min(6, seats - 1):
        errs.add("PIRATES_BY_SK_EXCEEDED")
    if sum(b.get("mermaidsByPirate", 0) for b in bonuses) > 2:
        errs.add("MERMAIDS_BY_PIRATE_EXCEEDED")

    alliances = r.get("lootAlliances", [])
    tricks_of = {p["id"]: p["tricks"] for p in players}
    if alliances and not exp.get("loot"):
        errs.add("LOOT_INVALID")
    if len(alliances) > 2:
        errs.add("LOOT_INVALID")
    for a in alliances:
        if a["playedBy"] == a["capturedBy"] or a["playedBy"] not in ids or a["capturedBy"] not in ids:
            errs.add("LOOT_INVALID")
        elif tricks_of[a["capturedBy"]] == 0:
            errs.add("LOOT_INVALID")
    return sorted(errs)


# --------------------------------------------------------------------------- main
def main() -> int:
    data = json.loads(FIXTURES.read_text(encoding="utf-8"))
    errors, total = 0, 0

    def check(label, got, want):
        nonlocal errors, total
        total += 1
        if got != want:
            errors += 1
            print(f"❌ {label}\n   attendu : {want}\n   obtenu  : {got}")

    for c in data["roundCases"]:
        check(c["id"], score_round(c), c["expected"])
    for g in data["gameCases"]:
        totals = {pid: 0 for pid in g["playerIds"]}
        running = []
        for rnd in g["rounds"]:
            for pid, res in score_round({"rules": g.get("rules", {}), **rnd}).items():
                totals[pid] += res["total"]
            running.append(dict(totals))
        check(g["id"] + " (totaux)", totals, g["expectedTotals"])
        if "expectedRunningTotals" in g:
            check(g["id"] + " (cumuls)", running, g["expectedRunningTotals"])
    for v in data["validationCases"]:
        check(v["id"], validate(v), sorted(v["expectedErrors"]))
    for s in data["scheduleCases"]:
        check(s["id"], schedule(s["setup"]), s["expectedCardsPerRound"])

    print(f"✅ {total}/{total} cas conformes." if not errors else f"{total - errors}/{total} cas conformes.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
