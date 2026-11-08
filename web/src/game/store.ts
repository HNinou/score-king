// Store : réducteur pur + pile d'annulation + sauvegarde automatique (localStorage).
import { useSyncExternalStore } from 'react';
import type { Bonus, Cannon, LootAlliance } from '../engine/types';
import {
  createGame,
  emptyRound,
  type Entry,
  type Game,
  type OptionKey,
  type Player,
  type Round,
  type Settings,
} from './model';
import { parseStored, type StoredState } from './storage';

export type ThemePref = 'auto' | 'light' | 'dark';
export type VoicePref = 'witty' | 'plain';

export interface Prefs {
  sound: boolean;
  volume: number;
  voice: VoicePref;
  theme: ThemePref;
  wakeLock: boolean;
  reducedMotion: boolean;
  retro: boolean;
  speech: boolean;
  music: boolean;
  musicVolume: number;
  express: boolean;
}

export interface AppState extends StoredState {
  prefs: Prefs;
}

export const DEFAULT_PREFS: Prefs = {
  sound: true,
  volume: 0.8,
  voice: 'witty',
  theme: 'auto',
  wakeLock: true,
  reducedMotion: false,
  retro: true,
  speech: true,
  music: true,
  musicVolume: 0.5,
  express: false,
};

export type GameAction =
  | { type: 'setBid'; player: string; value: number | null }
  | { type: 'setTricks'; player: string; value: number | null }
  | { type: 'setBonus'; player: string; bonus: Bonus }
  | { type: 'setHarry'; player: string; value: number }
  | { type: 'setWager'; player: string; value: number }
  | { type: 'setCannon'; player: string; value: Cannon }
  | { type: 'setDestroyed'; value: number }
  | { type: 'setLoot'; alliances: LootAlliance[] }
  | { type: 'toTricks' }
  | { type: 'toBids' }
  | { type: 'validateRound' }
  | { type: 'nextRound' }
  | { type: 'replaceRound'; round: Round }
  | { type: 'setOption'; key: OptionKey; value: boolean }
  | { type: 'redealRound' }
  | { type: 'voidRound' }
  | { type: 'abandon' };

export type Action =
  | GameAction
  | { type: 'newGame'; players: Player[]; settings: Settings }
  | { type: 'closeGame' }
  | { type: 'openGame'; id: string }
  | { type: 'prefs'; prefs: Partial<Prefs> }
  | { type: 'importGames'; games: Game[] }
  | { type: 'clearHistory' };

const STORAGE_KEY = 'score-king:v1';
const UNDO_LIMIT = 100;

function patchEntry(r: Round, pid: string, f: (e: Entry) => Entry): Round {
  return { ...r, entries: r.entries.map((e) => (e.playerId === pid ? f(e) : e)) };
}

function patchCurrent(g: Game, f: (r: Round) => Round): Game {
  const last = g.rounds.length - 1;
  return { ...g, rounds: g.rounds.map((r, i) => (i === last ? f(r) : r)) };
}

export function gameReducer(g: Game, a: GameAction, now = new Date()): Game {
  const next = ((): Game => {
    switch (a.type) {
      case 'setBid':
        return patchCurrent(g, (r) => patchEntry(r, a.player, (e) => ({ ...e, bid: a.value })));
      case 'setTricks':
        return patchCurrent(g, (r) =>
          patchEntry(r, a.player, (e) => ({
            ...e,
            tricks: a.value,
            // un joueur sans pli ne peut pas avoir capturé de cartes
            bonus: a.value === 0 ? { ...e.bonus, standard14: 0, black14: false, piratesBySkullKing: 0, skullKingByMermaid: false, mermaidsByPirate: 0 } : e.bonus,
          })),
        );
      case 'setBonus':
        return patchCurrent(g, (r) => patchEntry(r, a.player, (e) => ({ ...e, bonus: a.bonus })));
      case 'setHarry':
        return patchCurrent(g, (r) => patchEntry(r, a.player, (e) => ({ ...e, harryAdjustment: a.value })));
      case 'setWager':
        return patchCurrent(g, (r) => patchEntry(r, a.player, (e) => ({ ...e, rascalWager: a.value })));
      case 'setCannon':
        return patchCurrent(g, (r) => patchEntry(r, a.player, (e) => ({ ...e, cannon: a.value })));
      case 'setDestroyed':
        return patchCurrent(g, (r) => ({ ...r, destroyedTricks: a.value }));
      case 'setLoot':
        return patchCurrent(g, (r) => ({ ...r, lootAlliances: a.alliances }));
      case 'toTricks':
        return patchCurrent(g, (r) => ({ ...r, phase: 'tricks', entries: r.entries.map((e) => ({ ...e, bid: e.bid ?? 0 })) }));
      case 'toBids':
        return patchCurrent(g, (r) => ({ ...r, phase: 'bids' }));
      case 'validateRound': {
        // ce qui n'a pas été touché vaut zéro (présélection de la saisie)
        const done = patchCurrent(g, (r) => ({ ...r, phase: 'done', entries: r.entries.map((e) => ({ ...e, bid: e.bid ?? 0, tricks: e.tricks ?? 0 })) }));
        const finished = done.rounds.length >= g.settings.cardsPerRound.length;
        return finished ? { ...done, status: 'finished' } : done;
      }
      case 'nextRound': {
        const idx = g.rounds.length;
        const n = g.settings.cardsPerRound[idx];
        if (n === undefined || g.status !== 'inProgress') return g;
        return { ...g, rounds: [...g.rounds, emptyRound(idx, n, g.players)] };
      }
      case 'replaceRound': {
        const rounds = g.rounds.map((r) => (r.index === a.round.index ? a.round : r));
        return { ...g, rounds };
      }
      case 'abandon':
        return { ...g, status: 'abandoned' };
      case 'setOption': {
        const settings =
          a.key === 'pirateAbilities'
            ? { ...g.settings, pirateAbilities: a.value }
            : { ...g.settings, expansions: { ...g.settings.expansions, [a.key]: a.value } };
        // désactiver une option efface ses saisies dans la manche en cours
        const cleared = a.value
          ? g
          : patchCurrent(g, (r) => ({
              ...r,
              lootAlliances: a.key === 'loot' ? [] : r.lootAlliances,
              destroyedTricks: a.key === 'kraken' || a.key === 'whiteWhale' ? 0 : r.destroyedTricks,
              entries: a.key === 'pirateAbilities' ? r.entries.map((e) => ({ ...e, harryAdjustment: 0, rascalWager: 0 })) : r.entries,
            }));
        return { ...cleared, settings };
      }
      case 'redealRound': {
        const r = g.rounds[g.rounds.length - 1];
        if (!r) return g;
        return patchCurrent(g, () => emptyRound(r.index, r.cardsDealt, g.players));
      }
      case 'voidRound': {
        const voided = patchCurrent(g, (r) => ({ ...emptyRound(r.index, r.cardsDealt, g.players), phase: 'done', voided: true }));
        const idx = voided.rounds.length;
        const n = g.settings.cardsPerRound[idx];
        return n === undefined
          ? { ...voided, status: 'finished' }
          : { ...voided, rounds: [...voided.rounds, emptyRound(idx, n, g.players)] };
      }
    }
  })();
  return next === g ? g : { ...next, updatedAt: now.toISOString() };
}

function replaceGame(s: AppState, g: Game): AppState {
  return { ...s, games: s.games.map((x) => (x.id === g.id ? g : x)) };
}

export function appReducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'newGame': {
      const g = createGame(a.players, a.settings);
      const names = [...a.players.map((p) => p.name), ...s.recentNames.filter((n) => !a.players.some((p) => p.name.toLowerCase() === n.toLowerCase()))].slice(0, 24);
      // une partie en cours non terminée est abandonnée au profit de la nouvelle
      const games = s.games.map((x) => (x.status === 'inProgress' ? { ...x, status: 'abandoned' as const } : x));
      return { ...s, games: [...games, g], currentId: g.id, recentNames: names, lastSettings: a.settings, lastPlayers: a.players };
    }
    case 'closeGame':
      return { ...s, currentId: null };
    case 'openGame':
      return { ...s, currentId: a.id };
    case 'prefs':
      return { ...s, prefs: { ...s.prefs, ...a.prefs } };
    case 'importGames': {
      const known = new Set(s.games.map((g) => g.id));
      return { ...s, games: [...s.games, ...a.games.filter((g) => !known.has(g.id))] };
    }
    case 'clearHistory':
      return { ...s, games: s.games.filter((g) => g.status === 'inProgress') };
    default: {
      const g = s.games.find((x) => x.id === s.currentId);
      if (!g) return s;
      const ng = gameReducer(g, a);
      return ng === g ? s : replaceGame(s, ng);
    }
  }
}

const isGameAction = (a: Action): a is GameAction =>
  !['newGame', 'closeGame', 'openGame', 'prefs', 'importGames', 'clearHistory'].includes(a.type);

// ------------------------------------------------------------------ store observable

export interface Snapshot {
  state: AppState;
  canUndo: boolean;
  canRedo: boolean;
  storageOk: boolean;
}

type Listener = () => void;

export class Store {
  private snap: Snapshot;
  private past: AppState[] = [];
  private future: AppState[] = [];
  private listeners = new Set<Listener>();
  private readonly storage: Storage | null;

  constructor(storage: Storage | null) {
    this.storage = storage;
    let state: AppState = { games: [], currentId: null, recentNames: [], lastSettings: null, lastPlayers: [], prefs: DEFAULT_PREFS };
    let ok = storage !== null;
    try {
      const raw = storage?.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = parseStored(JSON.parse(raw) as unknown);
        if (parsed) state = { ...state, ...parsed, prefs: { ...DEFAULT_PREFS, ...readPrefs(parsed.prefs) } };
      }
    } catch {
      ok = false;
    }
    this.snap = { state, canUndo: false, canRedo: false, storageOk: ok };
  }

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  getSnapshot = (): Snapshot => this.snap;

  dispatch = (a: Action): void => {
    const prev = this.snap.state;
    const next = appReducer(prev, a);
    if (next === prev) return;
    if (isGameAction(a)) {
      this.past.push(prev);
      if (this.past.length > UNDO_LIMIT) this.past.shift();
      this.future = [];
    } else if (a.type === 'newGame' || a.type === 'openGame' || a.type === 'closeGame') {
      this.past = [];
      this.future = [];
    }
    this.commit(next);
  };

  undo = (): boolean => {
    const prev = this.past.pop();
    if (!prev) return false;
    this.future.push(this.snap.state);
    this.commit({ ...prev, prefs: this.snap.state.prefs });
    return true;
  };

  redo = (): boolean => {
    const next = this.future.pop();
    if (!next) return false;
    this.past.push(this.snap.state);
    this.commit({ ...next, prefs: this.snap.state.prefs });
    return true;
  };

  private commit(state: AppState): void {
    let ok = this.snap.storageOk;
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      ok = false;
    }
    this.snap = { state, canUndo: this.past.length > 0, canRedo: this.future.length > 0, storageOk: ok };
    this.listeners.forEach((l) => l());
  }
}

function readPrefs(x: unknown): Partial<Prefs> {
  if (typeof x !== 'object' || x === null) return {};
  const o = x as Record<string, unknown>;
  const out: Partial<Prefs> = {};
  if (typeof o.sound === 'boolean') out.sound = o.sound;
  if (typeof o.volume === 'number' && o.volume >= 0 && o.volume <= 1) out.volume = o.volume;
  if (o.voice === 'witty' || o.voice === 'plain') out.voice = o.voice;
  if (o.theme === 'auto' || o.theme === 'light' || o.theme === 'dark') out.theme = o.theme;
  if (typeof o.wakeLock === 'boolean') out.wakeLock = o.wakeLock;
  if (typeof o.reducedMotion === 'boolean') out.reducedMotion = o.reducedMotion;
  if (typeof o.retro === 'boolean') out.retro = o.retro;
  if (typeof o.speech === 'boolean') out.speech = o.speech;
  if (typeof o.music === 'boolean') out.music = o.music;
  if (typeof o.express === 'boolean') out.express = o.express;
  if (typeof o.musicVolume === 'number' && o.musicVolume >= 0 && o.musicVolume <= 1) out.musicVolume = o.musicVolume;
  return out;
}

function safeStorage(): Storage | null {
  try {
    const s = window.localStorage;
    s.setItem('score-king:probe', '1');
    s.removeItem('score-king:probe');
    return s;
  } catch {
    return null;
  }
}

export const store = new Store(typeof window === 'undefined' ? null : safeStorage());

export function useStore(): Snapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

export function currentGame(s: AppState): Game | undefined {
  return s.games.find((g) => g.id === s.currentId);
}
