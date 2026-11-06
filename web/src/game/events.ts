// Faits de jeu d'une manche (pour animations, bruitages et répliques). Lit les résultats du moteur,
// ne calcule aucun point.
import type { SoundId } from '../audio/audio';
import type { EventKey } from '../i18n/t';
import type { RoundResult } from '../engine/types';
import { rawBonus } from '../engine/engine';
import { effectiveBid, gameRanking, roundScores, rulesOf, type Game, type Round } from './model';

export type FactKind = 'mermaidCapture' | 'skullKingCapture' | 'bigLoss' | 'zeroBidMade' | 'zeroBidMissed' | 'bidMade' | 'bidMissed' | 'grazed';

export interface PlayerFact {
  playerId: string;
  kind: FactKind;
  result: RoundResult;
  diff: number;
  tricks: number;
  bonusCards: number;
  piratesBySK: number;
  rankBefore: number;
  rankAfter: number;
}

const PRIORITY: Record<FactKind, number> = {
  mermaidCapture: 6,
  skullKingCapture: 5,
  bigLoss: 5,
  zeroBidMade: 4,
  zeroBidMissed: 3,
  bidMade: 3,
  grazed: 2,
  bidMissed: 3,
};

export const FACT_SOUND: Record<FactKind, SoundId> = {
  mermaidCapture: 'siren-song',
  skullKingCapture: 'cannon',
  bigLoss: 'sad-trombone',
  zeroBidMade: 'slide-up',
  zeroBidMissed: 'splash',
  bidMade: 'coins',
  grazed: 'coins',
  bidMissed: 'splash',
};

export const FACT_QUIP: Partial<Record<FactKind, EventKey>> = {
  mermaidCapture: 'mermaidCapture',
  skullKingCapture: 'skullKingCapture',
  bigLoss: 'bigLoss',
  zeroBidMade: 'zeroBidMade',
  zeroBidMissed: 'zeroBidMissed',
  bidMade: 'bidMade',
};

export function roundFacts(g: Game, r: Round): PlayerFact[] {
  const scores = roundScores(g, r);
  const before = gameRanking(g, r.index);
  const after = gameRanking(g, r.index + 1);
  const rankIn = (list: typeof before, id: string): number => list.find((x) => x.id === id)?.rank ?? 0;
  const rules = rulesOf(g.settings);
  return r.entries.map((e) => {
    const bid = effectiveBid(e) ?? 0;
    const tricks = e.tricks ?? 0;
    const diff = Math.abs(bid - tricks);
    const result = scores[e.playerId] ?? { bidPoints: 0, bonusPoints: 0, wagerPoints: 0, total: 0 };
    let kind: FactKind;
    if (diff === 0 && e.bonus.skullKingByMermaid) kind = 'mermaidCapture';
    else if (diff === 0 && e.bonus.piratesBySkullKing > 0) kind = 'skullKingCapture';
    else if (result.total <= -50) kind = 'bigLoss';
    else if (bid === 0) kind = diff === 0 ? 'zeroBidMade' : 'zeroBidMissed';
    else if (diff === 0) kind = 'bidMade';
    else if (diff === 1 && g.settings.scoring === 'rascal' && result.total > 0) kind = 'grazed';
    else kind = 'bidMissed';
    return {
      playerId: e.playerId,
      kind,
      result,
      diff,
      tricks,
      bonusCards: diff === 0 ? rawBonus(e.bonus, rules) : 0,
      piratesBySK: e.bonus.piratesBySkullKing,
      rankBefore: rankIn(before, e.playerId),
      rankAfter: rankIn(after, e.playerId),
    };
  });
}

/** Le fait marquant de la manche (le plus prioritaire, puis le plus gros écart de points). */
export function headline(facts: PlayerFact[]): PlayerFact | undefined {
  return [...facts].sort(
    (a, b) => PRIORITY[b.kind] - PRIORITY[a.kind] || Math.abs(b.result.total) - Math.abs(a.result.total),
  )[0];
}

/** Nouveau leader seul en tête après la manche (null s'il n'a pas changé). */
export function newLeader(g: Game, r: Round): string | null {
  if (r.index === 0) return null;
  const before = gameRanking(g, r.index).filter((x) => x.rank === 1).map((x) => x.id);
  const after = gameRanking(g, r.index + 1).filter((x) => x.rank === 1).map((x) => x.id);
  const leader = after[0];
  return after.length === 1 && leader !== undefined && !before.includes(leader) ? leader : null;
}

export interface Spotlight {
  playerId: string;
  key: EventKey;
  vars: Record<string, string | number>;
}

/** Paris tenus d'affilée jusqu'à cette manche incluse (manches annulées ignorées). */
function streakOf(g: Game, r: Round, pid: string): number {
  let n = 0;
  for (const x of g.rounds.slice(0, r.index + 1).reverse()) {
    if (x.phase !== 'done' || x.voided) continue;
    const e = x.entries.find((y) => y.playerId === pid);
    if (!e || effectiveBid(e) !== e.tricks) break;
    n++;
  }
  return n;
}

const lastTarget = new Map<string, string>();

/**
 * Remarque du classement : vise un joueur selon la manche qu'il vient de faire
 * (pas forcément le dernier), en évitant le joueur déjà commenté au bilan et la cible précédente.
 */
export function spotlight(g: Game, r: Round, exclude: string | undefined, rnd: () => number = Math.random): Spotlight | null {
  const facts = roundFacts(g, r);
  const name = (id: string) => g.players.find((p) => p.id === id)?.name ?? '';
  const cands: { s: Spotlight; w: number }[] = [];
  for (const f of facts) {
    const base = { nom: name(f.playerId), points: Math.abs(f.result.total), plis: f.tricks, bonus: f.bonusCards, nb: f.piratesBySK, x: f.diff };
    const moved = r.index === 0 ? 0 : f.rankBefore - f.rankAfter;
    const streak = streakOf(g, r, f.playerId);
    const add = (key: EventKey, w: number, vars = base) => cands.push({ s: { playerId: f.playerId, key, vars }, w });
    if (moved >= 2) add('rankUp', 5, { ...base, x: moved });
    if (moved <= -2) add('rankDown', 5, { ...base, x: -moved });
    if (streak >= 3) add('streak', 4 + streak, { ...base, x: streak });
    const quipKey = FACT_QUIP[f.kind];
    if (quipKey) add(quipKey, f.kind === 'bidMade' ? 1 : 3);
    if (f.kind === 'bidMissed') add('bidMissed', f.diff >= 2 ? 3 : 2);
  }
  const prev = lastTarget.get(g.id);
  let pool = cands.filter((c) => c.s.playerId !== exclude && c.s.playerId !== prev);
  if (pool.length === 0) pool = cands.filter((c) => c.s.playerId !== prev);
  if (pool.length === 0) pool = cands;
  const total = pool.reduce((s, c) => s + c.w, 0);
  let k = rnd() * total;
  for (const c of pool) {
    k -= c.w;
    if (k <= 0) {
      lastTarget.set(g.id, c.s.playerId);
      return c.s;
    }
  }
  return null;
}
