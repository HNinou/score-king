// Accès aux textes (source unique : shared/copy/voice-fr.json, synchronisé dans fr.json).
import fr from './fr.json';
import type { ErrorCode } from '../engine/types';

type Vars = Record<string, string | number>;
const ui: Record<string, string> = fr.ui;
const events: Record<string, string[]> = fr.events;
const errors: Record<string, { witty: string; plain: string }> = fr.errors;

export type EventKey = keyof typeof fr.events;

export function fill(s: string, vars: Vars = {}): string {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function t(key: string, vars?: Vars): string {
  return fill(ui[key] ?? key, vars);
}

export function errorText(code: ErrorCode | 'TRICKS_SUM_MISMATCH_MISSING', witty: boolean, vars?: Vars): string {
  const e = errors[code];
  return e ? fill(witty ? e.witty : e.plain, vars) : code;
}

/** Tirage sans remise par partie : pas de répétition tant que la réserve n'est pas épuisée. */
const used = new Map<string, Set<number>>();
export function quip(gameId: string, key: EventKey, vars: Vars): string {
  const pool = events[key] ?? [];
  const k = `${gameId}:${key}`;
  let seen = used.get(k);
  if (!seen || seen.size >= pool.length) {
    seen = new Set();
    used.set(k, seen);
  }
  const free = pool.map((_, i) => i).filter((i) => !seen.has(i));
  const pick = free[Math.floor(Math.random() * free.length)] ?? 0;
  seen.add(pick);
  return fill(pool[pick] ?? '', vars);
}
