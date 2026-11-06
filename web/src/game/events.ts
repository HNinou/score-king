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
  /** Bonus de la seule capture marquante (pirates mangés ou Roi noyé), lu dans le moteur. */
  captureBonus: number;
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
  bidMissed: 'bidMissed',
};

/** Variables des répliques : les pertes gardent leur signe, les bonus sont ceux de la capture citée. */
export function factVars(g: Game, f: PlayerFact): Record<string, string | number> {
  const abs = Math.abs(f.result.total);
  return {
    nom: g.players.find((p) => p.id === f.playerId)?.name ?? '',
    points: f.result.total < 0 ? `−${abs}` : String(abs),
    plis: f.tricks,
    bonus: f.captureBonus,
    nb: f.piratesBySK,
    x: f.diff,
  };
}

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
    else if (diff !== 0 && g.settings.scoring === 'rascal' && result.total > 0) kind = 'grazed';
    else if (bid === 0) kind = diff === 0 ? 'zeroBidMade' : 'zeroBidMissed';
    else if (diff === 0) kind = 'bidMade';
    else kind = 'bidMissed';
    return {
      playerId: e.playerId,
      kind,
      result,
      diff,
      tricks,
      bonusCards: diff === 0 || rules.bonusAlwaysCounts ? rawBonus(e.bonus, rules) : 0,
      piratesBySK: e.bonus.piratesBySkullKing,
      captureBonus:
        kind === 'mermaidCapture'
          ? rawBonus({ skullKingByMermaid: true }, rules)
          : kind === 'skullKingCapture'
            ? rawBonus({ piratesBySkullKing: e.bonus.piratesBySkullKing }, rules)
            : 0,
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
  const cands: { s: Spotlight; w: number }[] = [];
  for (const f of facts) {
    const base = factVars(g, f);
    const moved = r.index === 0 ? 0 : f.rankBefore - f.rankAfter;
    const streak = streakOf(g, r, f.playerId);
    const add = (key: EventKey, w: number, vars = base) => cands.push({ s: { playerId: f.playerId, key, vars }, w });
    if (moved >= 2) add('rankUp', 5, { ...base, x: moved });
    if (moved <= -2) add('rankDown', 5, { ...base, x: -moved });
    if (streak >= 3) add('streak', 4 + streak, { ...base, x: streak });
    const quipKey = FACT_QUIP[f.kind];
    if (quipKey) add(quipKey, f.kind === 'bidMade' ? 1 : f.kind === 'bidMissed' ? (f.diff >= 2 ? 3 : 2) : 3);
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

// ------------------------------------------------------------ scènes animées de fin de manche

export type Scene =
  | { kind: 'kraken'; tricks: number }
  | { kind: 'whale' }
  | { kind: 'skullFeast'; playerId: string; heads: number }
  | { kind: 'mermaidDrown'; playerId: string }
  | { kind: 'lootPact'; a: string; b: string }
  | { kind: 'shipwreck'; playerId: string; points: number }
  | { kind: 'ghost'; playerId: string }
  | { kind: 'crownSteal'; from: string; to: string };

export interface SceneReel {
  scenes: Scene[];
  /** Combientième fois ce genre de scène dans la partie (1 = première). */
  nth: number[];
  /** 1 = début de partie, 3 = fin de partie ou manche explosive. */
  intensity: 1 | 2 | 3;
}

/** Ce qui s'est réellement passé dans la manche, mis en scène — plus fort à mesure que la partie avance. */
export function roundScenes(g: Game, r: Round): SceneReel {
  const facts = roundFacts(g, r);
  const total = g.settings.cardsPerRound.length;
  const progress = (r.index + 1) / total;
  const swing = Math.max(0, ...facts.map((f) => Math.abs(f.result.total)));
  const intensity: 1 | 2 | 3 = progress > 0.75 || swing >= 120 ? 3 : progress > 0.4 || swing >= 70 ? 2 : 1;
  const scenes: Scene[] = [];
  const exp = g.settings.expansions;

  if (r.destroyedTricks > 0) {
    if (exp.kraken) scenes.push({ kind: 'kraken', tricks: 1 });
    if (exp.whiteWhale && (r.destroyedTricks > 1 || !exp.kraken)) scenes.push({ kind: 'whale' });
  }
  // les captures ne comptent que si le pari est tenu… mais la carte a bien été jouée : on la montre quand même
  for (const e of r.entries) {
    if (e.bonus.piratesBySkullKing > 0) scenes.push({ kind: 'skullFeast', playerId: e.playerId, heads: e.bonus.piratesBySkullKing });
    if (e.bonus.skullKingByMermaid) scenes.push({ kind: 'mermaidDrown', playerId: e.playerId });
  }
  const exact = (pid: string) => facts.find((f) => f.playerId === pid)?.diff === 0;
  for (const a of r.lootAlliances) if (exact(a.playedBy) && exact(a.capturedBy)) scenes.push({ kind: 'lootPact', a: a.playedBy, b: a.capturedBy });
  for (const f of facts) if (f.result.total <= -50) scenes.push({ kind: 'shipwreck', playerId: f.playerId, points: f.result.total });
  for (const f of facts) if (f.kind === 'zeroBidMade' && r.cardsDealt >= 5) scenes.push({ kind: 'ghost', playerId: f.playerId });
  const to = newLeader(g, r);
  if (to) {
    const before = gameRanking(g, r.index).find((x) => x.rank === 1)?.id;
    if (before && before !== to) scenes.push({ kind: 'crownSteal', from: before, to });
  }
  // on garde les plus spectaculaires : 2 scènes max (3 en fin de partie) pour ne pas ralentir la table
  const order: Scene['kind'][] = ['kraken', 'whale', 'skullFeast', 'mermaidDrown', 'crownSteal', 'shipwreck', 'lootPact', 'ghost'];
  scenes.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  const kept = scenes.slice(0, intensity === 3 ? 3 : 2);
  const before = earlierSceneCounts(g, r);
  return { scenes: kept, nth: kept.map((x) => (before[x.kind] ?? 0) + 1), intensity };
}

/** Nombre de fois où chaque grand événement est déjà arrivé avant cette manche. */
function earlierSceneCounts(g: Game, r: Round): Partial<Record<Scene['kind'], number>> {
  const c: Partial<Record<Scene['kind'], number>> = {};
  const inc = (k: Scene['kind'], n = 1) => (c[k] = (c[k] ?? 0) + n);
  for (const x of g.rounds.slice(0, r.index)) {
    if (x.phase !== 'done' || x.voided) continue;
    if (x.destroyedTricks > 0 && g.settings.expansions.kraken) inc('kraken');
    if (x.destroyedTricks > 0 && g.settings.expansions.whiteWhale && (x.destroyedTricks > 1 || !g.settings.expansions.kraken)) inc('whale');
    for (const e of x.entries) {
      if (e.bonus.piratesBySkullKing > 0) inc('skullFeast');
      if (e.bonus.skullKingByMermaid) inc('mermaidDrown');
    }
    const sc = roundScores(g, x);
    inc('shipwreck', Object.values(sc).filter((v) => v.total <= -50).length);
  }
  return c;
}
