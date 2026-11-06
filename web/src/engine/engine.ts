// Moteur de calcul Skull King — pur, sans dépendance UI.
// Spécification : docs/01-REGLES-SCORE.md. Vérité : shared/fixtures/scoring-cases.json.

import type {
  Bonus,
  ErrorCode,
  Expansions,
  PlayerRoundInput,
  PresetKey,
  RoundInput,
  RoundResult,
  Rules,
  ScheduleSetup,
  ValidationSetup,
} from './types';

export const DEFAULT_RULES: Rules = {
  scoring: 'skullKing',
  skullKingByMermaidBonus: 40,
  mermaidByPirateBonusEnabled: true,
};

export const EMPTY_BONUS: Bonus = {
  standard14: 0,
  black14: false,
  piratesBySkullKing: 0,
  skullKingByMermaid: false,
  mermaidsByPirate: 0,
};

export const BASE_DECK = 70;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const MAX_CUSTOM_ROUNDS = 30;

export const PRESETS: Record<Exclude<PresetKey, 'custom'>, readonly number[]> = {
  standard: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  evenKeeled: [2, 2, 4, 4, 6, 6, 8, 8, 10, 10],
  skipToTheBrawl: [6, 7, 8, 9, 10],
  swiftAndSalty: [5, 5, 5, 5, 5],
  broadsideBarrage: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  whirlpool: [9, 9, 7, 7, 5, 5, 3, 3, 1, 1],
  pastYourBedtime: [1],
};

// ------------------------------------------------------------------ planning

export function seatCount(playerCount: number): number {
  return playerCount + (playerCount === 2 ? 1 : 0);
}

export function deckSize(exp: Partial<Expansions> = {}): number {
  return BASE_DECK + (exp.loot ? 2 : 0) + (exp.kraken ? 1 : 0) + (exp.whiteWhale ? 1 : 0);
}

export function maxCards(playerCount: number, exp: Partial<Expansions> = {}): number {
  return Math.floor(deckSize(exp) / seatCount(playerCount));
}

export function cardsSchedule(setup: ScheduleSetup): number[] {
  const cap = maxCards(setup.playerCount, setup.expansions);
  const planned =
    setup.preset === 'custom'
      ? (setup.custom ?? []).slice(0, MAX_CUSTOM_ROUNDS).map((c) => Math.max(1, Math.floor(c)))
      : PRESETS[setup.preset];
  return planned.map((c) => Math.min(c, cap));
}

// ------------------------------------------------------------------ score

export function effectiveBid(p: PlayerRoundInput): number {
  return p.bid + (p.harryAdjustment ?? 0);
}

function fullBonus(b: Partial<Bonus> | undefined): Bonus {
  return { ...EMPTY_BONUS, ...b };
}

/** Valeur brute des cartes capturées (avant application de la réussite du pari). */
export function rawBonus(b: Partial<Bonus> | undefined, rules: Rules = DEFAULT_RULES): number {
  const x = fullBonus(b);
  let total = 10 * x.standard14 + (x.black14 ? 20 : 0) + 30 * x.piratesBySkullKing;
  if (x.skullKingByMermaid) total += rules.skullKingByMermaidBonus;
  if (rules.mermaidByPirateBonusEnabled) total += 20 * x.mermaidsByPirate;
  return total;
}

export function scoreRound(rules: Partial<Rules>, round: RoundInput): Record<string, RoundResult> {
  const r: Rules = { ...DEFAULT_RULES, ...rules };
  const n = round.cardsDealt;
  const exact = new Map(round.players.map((p) => [p.id, effectiveBid(p) === p.tricks]));

  const alliances = round.lootAlliances ?? [];
  const lootFor = (pid: string): number =>
    alliances.filter((a) => (a.playedBy === pid || a.capturedBy === pid) && exact.get(a.playedBy) && exact.get(a.capturedBy))
      .length * 20;

  const out: Record<string, RoundResult> = {};
  for (const p of round.players) {
    const bid = effectiveBid(p);
    const diff = Math.abs(bid - p.tricks);
    const rb = rawBonus(p.bonus, r);
    const lootPts = lootFor(p.id);
    const wager = p.rascalWager ?? 0;
    let bidPoints: number;
    let bonusPoints: number;
    if (r.scoring === 'skullKing') {
      if (bid === 0) bidPoints = p.tricks === 0 ? 10 * n : -10 * n;
      else bidPoints = diff === 0 ? 20 * bid : -10 * diff;
      bonusPoints = diff === 0 ? rb + lootPts : 0;
    } else if (p.cannon === 'cannonball') {
      bidPoints = diff === 0 ? 15 * n : 0;
      bonusPoints = diff === 0 ? rb + lootPts : 0;
    } else if (diff === 0) {
      bidPoints = 10 * n;
      bonusPoints = rb + lootPts;
    } else if (diff === 1) {
      bidPoints = 5 * n;
      bonusPoints = rb / 2;
    } else {
      bidPoints = 0;
      bonusPoints = 0;
    }
    const wagerPoints = diff === 0 ? wager : 0 - wager;
    out[p.id] = { bidPoints, bonusPoints, wagerPoints, total: bidPoints + bonusPoints + wagerPoints };
  }
  return out;
}

// ------------------------------------------------------------------ validation

export interface ValidationResult {
  codes: ErrorCode[];
  /** Joueurs concernés par chaque code (pour afficher l'erreur sur le bon champ). */
  players: Partial<Record<ErrorCode, string[]>>;
  /** Plis restants à attribuer (positif) ou en trop (négatif) ; le fantôme compte à 2 joueurs. */
  tricksDelta: number;
}

export function validateRound(setup: ValidationSetup, round: RoundInput): ValidationResult {
  const exp = setup.expansions ?? {};
  const n = round.cardsDealt;
  const players = round.players;
  const pc = players.length;
  const seats = seatCount(pc);
  const errs = new Set<ErrorCode>();
  const who: Partial<Record<ErrorCode, string[]>> = {};
  const flag = (code: ErrorCode, pid?: string): void => {
    errs.add(code);
    if (pid !== undefined) {
      const list = who[code] ?? [];
      if (!list.includes(pid)) list.push(pid);
      who[code] = list;
    }
  };

  const leviathans = (exp.kraken ? 1 : 0) + (exp.whiteWhale ? 1 : 0);
  const destroyed = round.destroyedTricks ?? 0;
  if (destroyed < 0 || destroyed > leviathans) flag('DESTROYED_TRICKS_INVALID');

  for (const p of players) {
    if (p.bid < 0 || p.bid > n) flag('BID_OUT_OF_RANGE', p.id);
    if (p.tricks < 0 || p.tricks > n) flag('TRICKS_OUT_OF_RANGE', p.id);
    const adj = p.harryAdjustment ?? 0;
    const eff = p.bid + adj;
    if (![-1, 0, 1].includes(adj) || (adj !== 0 && (eff < 0 || eff > n))) flag('HARRY_INVALID', p.id);
    if (![0, 10, 20].includes(p.rascalWager ?? 0)) flag('WAGER_INVALID', p.id);
    if (!['grapeshot', 'cannonball'].includes(p.cannon ?? 'grapeshot')) flag('CANNON_INVALID', p.id);
    const b = fullBonus(p.bonus);
    const counts = [b.standard14, b.piratesBySkullKing, b.mermaidsByPirate];
    if (counts.some((c) => c < 0)) flag('BONUS_NEGATIVE', p.id);
    const captured = counts.reduce((s, c) => s + c, 0) > 0 || b.black14 || b.skullKingByMermaid;
    if (captured && p.tricks === 0) flag('BONUS_WITHOUT_TRICK', p.id);
  }

  const tricksSum = players.reduce((s, p) => s + p.tricks, 0);
  const target = n - destroyed;
  if ((pc === 2 && tricksSum > target) || (pc !== 2 && tricksSum !== target)) flag('TRICKS_SUM_MISMATCH');

  const bonuses = players.map((p) => ({ id: p.id, b: fullBonus(p.bonus) }));
  if (bonuses.reduce((s, x) => s + x.b.standard14, 0) > 3) {
    bonuses.filter((x) => x.b.standard14 > 0).forEach((x) => flag('STANDARD14_TOTAL_EXCEEDED', x.id));
  }
  const black = bonuses.filter((x) => x.b.black14);
  if (black.length > 1) black.forEach((x) => flag('BLACK14_TOTAL_EXCEEDED', x.id));
  const skByMermaid = bonuses.filter((x) => x.b.skullKingByMermaid);
  const skHolders = bonuses.filter((x) => x.b.piratesBySkullKing > 0);
  if (skByMermaid.length > 1 || (skByMermaid.length === 1 && skHolders.length > 0)) {
    [...skByMermaid, ...skHolders].forEach((x) => flag('SKULL_KING_CAPTURE_CONFLICT', x.id));
  }
  const skPirates = skHolders.reduce((s, x) => s + x.b.piratesBySkullKing, 0);
  if (skHolders.length > 1 || skPirates > Math.min(6, seats - 1)) {
    skHolders.forEach((x) => flag('PIRATES_BY_SK_EXCEEDED', x.id));
  }
  if (bonuses.reduce((s, x) => s + x.b.mermaidsByPirate, 0) > 2) {
    bonuses.filter((x) => x.b.mermaidsByPirate > 0).forEach((x) => flag('MERMAIDS_BY_PIRATE_EXCEEDED', x.id));
  }

  const alliances = round.lootAlliances ?? [];
  const tricksOf = new Map(players.map((p) => [p.id, p.tricks]));
  if (alliances.length > 0 && !exp.loot) flag('LOOT_INVALID');
  if (alliances.length > 2) flag('LOOT_INVALID');
  for (const a of alliances) {
    if (a.playedBy === a.capturedBy || !tricksOf.has(a.playedBy) || !tricksOf.has(a.capturedBy)) {
      flag('LOOT_INVALID');
    } else if (tricksOf.get(a.capturedBy) === 0) {
      flag('LOOT_INVALID', a.capturedBy);
    }
  }

  return { codes: [...errs].sort(), players: who, tricksDelta: target - tricksSum };
}

// ------------------------------------------------------------------ cumuls et classement

export interface ScoredRound {
  rules?: Partial<Rules>;
  round: RoundInput;
}

/** Cumuls après chaque manche terminée. */
export function runningTotals(
  playerIds: readonly string[],
  rules: Partial<Rules>,
  rounds: readonly RoundInput[],
): Record<string, number>[] {
  const totals: Record<string, number> = Object.fromEntries(playerIds.map((id) => [id, 0]));
  const out: Record<string, number>[] = [];
  for (const round of rounds) {
    const res = scoreRound(rules, round);
    for (const [pid, r] of Object.entries(res)) totals[pid] = (totals[pid] ?? 0) + r.total;
    out.push({ ...totals });
  }
  return out;
}

export interface RankEntry {
  id: string;
  score: number;
  rank: number;
}

/** Classement standard « 1, 1, 3 » ; ordre stable pour les ex aequo. */
export function ranking(totals: Record<string, number>, order: readonly string[] = Object.keys(totals)): RankEntry[] {
  const sorted = order
    .map((id, i) => ({ id, score: totals[id] ?? 0, i }))
    .sort((a, b) => b.score - a.score || a.i - b.i);
  return sorted.map((e) => ({
    id: e.id,
    score: e.score,
    rank: 1 + sorted.filter((o) => o.score > e.score).length,
  }));
}
