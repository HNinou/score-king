// Modèle de partie (format commun schemaVersion 1) et accès au moteur.
// Aucun score n'est stocké : tout est recalculé depuis les saisies.

import {
  EMPTY_BONUS,
  cardsSchedule,
  maxCards,
  ranking,
  runningTotals,
  scoreRound,
  validateRound,
  type RankEntry,
  type ValidationResult,
} from '../engine/engine';
import type {
  Bonus,
  Cannon,
  Expansions,
  LootAlliance,
  PresetKey,
  RoundInput,
  RoundResult,
  Rules,
  Scoring,
} from '../engine/types';

export type GameStatus = 'inProgress' | 'finished' | 'abandoned';
export type Phase = 'bids' | 'tricks' | 'done';

export interface Player {
  id: string;
  name: string;
  /** Identifiant du portrait de pirate (champ « emblem » du format commun). */
  emblem: string;
  color: string;
}

export interface Settings {
  scoring: Scoring;
  cannonEnabled: boolean;
  preset: PresetKey;
  cardsPerRound: number[];
  expansions: Expansions;
  pirateAbilities: boolean;
  originalEdition: boolean;
  firstDealerIndex: number;
  /** Règle maison (optionnelle dans le format commun) : bonus comptés même si le pari est raté. */
  bonusAlwaysCounts?: boolean;
}

export interface Entry {
  playerId: string;
  bid: number | null;
  tricks: number | null;
  harryAdjustment: number;
  rascalWager: number;
  cannon: Cannon;
  bonus: Bonus;
}

export interface Round {
  index: number;
  cardsDealt: number;
  phase: Phase;
  destroyedTricks: number;
  lootAlliances: LootAlliance[];
  entries: Entry[];
  /** Manche annulée (mauvaise donne, triche…) : 0 point pour tous. */
  voided?: boolean;
}

export interface Game {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  updatedAt: string;
  status: GameStatus;
  players: Player[];
  settings: Settings;
  rounds: Round[];
}

export const PLAYER_COLORS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'] as const;

export function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function defaultSettings(): Settings {
  return {
    scoring: 'skullKing',
    cannonEnabled: false,
    preset: 'standard',
    cardsPerRound: [],
    expansions: { loot: false, kraken: false, whiteWhale: false },
    pirateAbilities: false,
    originalEdition: false,
    firstDealerIndex: 0,
  };
}

export function scheduleFor(settings: Settings, playerCount: number, custom: number[] = []): number[] {
  return cardsSchedule({ playerCount, preset: settings.preset, expansions: settings.expansions, custom });
}

export function capFor(settings: Settings, playerCount: number): number {
  return maxCards(playerCount, settings.expansions);
}

export function emptyRound(index: number, cardsDealt: number, players: Player[]): Round {
  return {
    index,
    cardsDealt,
    phase: 'bids',
    destroyedTricks: 0,
    lootAlliances: [],
    entries: players.map((p) => ({
      playerId: p.id,
      bid: null,
      tricks: null,
      harryAdjustment: 0,
      rascalWager: 0,
      cannon: 'grapeshot',
      bonus: { ...EMPTY_BONUS },
    })),
  };
}

export function createGame(players: Player[], settings: Settings, now = new Date()): Game {
  const iso = now.toISOString();
  const first = settings.cardsPerRound[0] ?? 1;
  return {
    schemaVersion: 1,
    id: uid(),
    createdAt: iso,
    updatedAt: iso,
    status: 'inProgress',
    players,
    settings,
    rounds: [emptyRound(0, first, players)],
  };
}

export function rulesOf(s: Settings): Rules {
  return {
    scoring: s.scoring,
    skullKingByMermaidBonus: s.originalEdition ? 50 : 40,
    mermaidByPirateBonusEnabled: !s.originalEdition,
    bonusAlwaysCounts: s.bonusAlwaysCounts === true,
  };
}

export function toRoundInput(r: Round): RoundInput {
  return {
    cardsDealt: r.cardsDealt,
    destroyedTricks: r.destroyedTricks,
    lootAlliances: r.lootAlliances,
    players: r.entries.map((e) => ({
      id: e.playerId,
      bid: e.bid ?? 0,
      tricks: e.tricks ?? 0,
      harryAdjustment: e.harryAdjustment,
      rascalWager: e.rascalWager,
      cannon: e.cannon,
      bonus: e.bonus,
    })),
  };
}

export function currentRound(g: Game): Round | undefined {
  return g.rounds[g.rounds.length - 1];
}

export function doneRounds(g: Game): Round[] {
  return g.rounds.filter((r) => r.phase === 'done');
}

export function roundScores(g: Game, r: Round): Record<string, RoundResult> {
  return scoreRound(rulesOf(g.settings), toRoundInput(r));
}

/** Cumuls après chaque manche terminée (une manche annulée reprend les cumuls précédents). */
export function gameRunning(g: Game): Record<string, number>[] {
  const done = doneRounds(g);
  const scored = runningTotals(
    g.players.map((p) => p.id),
    rulesOf(g.settings),
    done.filter((r) => !r.voided).map(toRoundInput),
  );
  const zero: Record<string, number> = Object.fromEntries(g.players.map((p) => [p.id, 0]));
  let k = 0;
  let last = zero;
  return done.map((r) => {
    if (!r.voided) last = scored[k++] ?? last;
    return { ...last };
  });
}

export type OptionKey = 'loot' | 'kraken' | 'whiteWhale' | 'pirateAbilities';

export function optionEnabled(s: Settings, k: OptionKey): boolean {
  return k === 'pirateAbilities' ? s.pirateAbilities : s.expansions[k];
}

/** Vrai si une manche terminée (non annulée) utilise cette option : on ne peut plus la désactiver. */
export function optionUsed(g: Game, k: OptionKey): boolean {
  return doneRounds(g)
    .filter((r) => !r.voided)
    .some((r) =>
      k === 'loot'
        ? r.lootAlliances.length > 0
        : k === 'pirateAbilities'
          ? r.entries.some((e) => e.harryAdjustment !== 0 || e.rascalWager !== 0)
          : r.destroyedTricks > 0,
    );
}

export function gameTotals(g: Game, afterRounds?: number): Record<string, number> {
  const running = gameRunning(g);
  const k = afterRounds ?? running.length;
  return k === 0 ? Object.fromEntries(g.players.map((p) => [p.id, 0])) : (running[k - 1] ?? {});
}

export function gameRanking(g: Game, afterRounds?: number): RankEntry[] {
  return ranking(
    gameTotals(g, afterRounds),
    g.players.map((p) => p.id),
  );
}

export function roundValidation(g: Game, r: Round): ValidationResult {
  return validateRound({ expansions: g.settings.expansions }, toRoundInput(r));
}

export function dealerOf(g: Game, roundIndex: number): Player | undefined {
  const n = g.players.length;
  return g.players[(g.settings.firstDealerIndex + roundIndex) % n];
}

export function leadOf(g: Game, roundIndex: number): Player | undefined {
  const n = g.players.length;
  return g.players[(g.settings.firstDealerIndex + roundIndex + 1) % n];
}

export function playerById(g: Game, id: string): Player | undefined {
  return g.players.find((p) => p.id === id);
}

export function isLastRound(g: Game, r: Round): boolean {
  return r.index === g.settings.cardsPerRound.length - 1;
}

export function effectiveBid(e: Entry): number | null {
  return e.bid === null ? null : e.bid + e.harryAdjustment;
}

/** Différence pari effectif / plis, ou null si incomplet. */
export function entryDiff(e: Entry): number | null {
  const b = effectiveBid(e);
  return b === null || e.tricks === null ? null : Math.abs(b - e.tricks);
}
