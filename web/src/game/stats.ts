// Statistiques ludiques de fin de partie, dérivées des résultats du moteur.
import { doneRounds, entryDiff, effectiveBid, roundScores, type Game } from './model';

export interface Stat {
  playerId: string;
  value: number;
  extra?: number;
}

export interface GameStats {
  accuracy: Stat[]; // % de paris réussis
  best: Stat | null; // plus gros coup (meilleure manche), extra = n° de manche
  worst: Stat | null; // pire naufrage
  zeroKing: Stat | null; // paris 0 réussis
  bounty: Stat | null; // bonus totaux
}

export function gameStats(g: Game): GameStats {
  const rounds = doneRounds(g);
  const made = new Map<string, number>();
  const zeros = new Map<string, number>();
  const bonus = new Map<string, number>();
  let best: Stat | null = null;
  let worst: Stat | null = null;
  for (const r of rounds) {
    const res = roundScores(g, r);
    for (const e of r.entries) {
      const x = res[e.playerId];
      if (!x) continue;
      if (entryDiff(e) === 0) {
        made.set(e.playerId, (made.get(e.playerId) ?? 0) + 1);
        if (effectiveBid(e) === 0) zeros.set(e.playerId, (zeros.get(e.playerId) ?? 0) + 1);
      }
      bonus.set(e.playerId, (bonus.get(e.playerId) ?? 0) + x.bonusPoints);
      if (!best || x.total > best.value) best = { playerId: e.playerId, value: x.total, extra: r.index + 1 };
      if (!worst || x.total < worst.value) worst = { playerId: e.playerId, value: x.total, extra: r.index + 1 };
    }
  }
  const top = (m: Map<string, number>): Stat | null => {
    let s: Stat | null = null;
    for (const [playerId, value] of m) if (value > 0 && (!s || value > s.value)) s = { playerId, value };
    return s;
  };
  return {
    accuracy: g.players.map((p) => ({
      playerId: p.id,
      value: rounds.length ? Math.round((100 * (made.get(p.id) ?? 0)) / rounds.length) : 0,
    })),
    best,
    worst: worst && worst.value < 0 ? worst : null,
    zeroKing: top(zeros),
    bounty: top(bonus),
  };
}
