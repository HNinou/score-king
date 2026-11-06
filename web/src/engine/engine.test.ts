import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  cardsSchedule,
  deckSize,
  maxCards,
  rawBonus,
  ranking,
  runningTotals,
  scoreRound,
  validateRound,
} from './engine';
import type { PresetKey, RoundInput, RoundResult, Rules } from './types';

interface Fixtures {
  roundCases: (RoundInput & { id: string; rules?: Partial<Rules>; expected: Record<string, RoundResult> })[];
  gameCases: {
    id: string;
    rules?: Partial<Rules>;
    playerIds: string[];
    rounds: RoundInput[];
    expectedRunningTotals: Record<string, number>[];
    expectedTotals: Record<string, number>;
  }[];
  validationCases: { id: string; setup: { expansions?: Record<string, boolean> }; round: RoundInput; expectedErrors: string[] }[];
  scheduleCases: {
    id: string;
    setup: { playerCount: number; preset: PresetKey; expansions?: Record<string, boolean> };
    expectedCardsPerRound: number[];
  }[];
}

const fixtures = JSON.parse(
  readFileSync(resolve(__dirname, '../../../shared/fixtures/scoring-cases.json'), 'utf-8'),
) as Fixtures;

describe('fixtures partagées (67 cas)', () => {
  it('compte 67 vérifications', () => {
    const n =
      fixtures.roundCases.length +
      fixtures.gameCases.length * 2 +
      fixtures.validationCases.length +
      fixtures.scheduleCases.length;
    expect(n).toBe(67);
  });

  it.each(fixtures.roundCases)('manche $id', (c) => {
    expect(scoreRound(c.rules ?? {}, c)).toEqual(c.expected);
  });

  it.each(fixtures.gameCases)('partie $id (cumuls + totaux)', (g) => {
    const running = runningTotals(g.playerIds, g.rules ?? {}, g.rounds);
    expect(running).toEqual(g.expectedRunningTotals);
    expect(running[running.length - 1]).toEqual(g.expectedTotals);
  });

  it.each(fixtures.validationCases)('validation $id', (v) => {
    expect(validateRound(v.setup, v.round).codes).toEqual([...v.expectedErrors].sort());
  });

  it.each(fixtures.scheduleCases)('planning $id', (s) => {
    expect(cardsSchedule(s.setup)).toEqual(s.expectedCardsPerRound);
  });
});

describe('compléments', () => {
  it('planning sur mesure plafonné, entiers ≥ 1, 30 manches max', () => {
    expect(cardsSchedule({ playerCount: 8, preset: 'custom', custom: [0, 3.7, 12] })).toEqual([1, 3, 8]);
    expect(cardsSchedule({ playerCount: 4, preset: 'custom' })).toEqual([]);
    expect(cardsSchedule({ playerCount: 4, preset: 'custom', custom: Array(40).fill(2) })).toHaveLength(30);
  });

  it('taille du paquet et plafond', () => {
    expect(deckSize()).toBe(70);
    expect(deckSize({ loot: true, kraken: true, whiteWhale: true })).toBe(74);
    expect(maxCards(2)).toBe(23);
  });

  it('bonus brut sans compteur', () => {
    expect(rawBonus(undefined)).toBe(0);
    expect(rawBonus({ mermaidsByPirate: 1 }, { scoring: 'skullKing', skullKingByMermaidBonus: 50, mermaidByPirateBonusEnabled: false, bonusAlwaysCounts: false })).toBe(0);
  });

  it('localise les erreurs par joueur et calcule le delta de plis', () => {
    const v = validateRound(
      {},
      {
        cardsDealt: 3,
        players: [
          { id: 'A', bid: 1, tricks: 2, bonus: { standard14: 3, black14: true, mermaidsByPirate: 2 } },
          { id: 'B', bid: 1, tricks: 2, bonus: { standard14: 2, black14: true, mermaidsByPirate: 1 } },
          { id: 'C', bid: 1, tricks: 0, bonus: { standard14: -1 } },
        ],
      },
    );
    expect(v.tricksDelta).toBe(-1);
    expect(v.players.STANDARD14_TOTAL_EXCEEDED).toEqual(['A', 'B']);
    expect(v.players.BLACK14_TOTAL_EXCEEDED).toEqual(['A', 'B']);
    expect(v.players.MERMAIDS_BY_PIRATE_EXCEEDED).toEqual(['A', 'B']);
    expect(v.players.BONUS_NEGATIVE).toEqual(['C']);
  });

  it('erreurs de bornes, Harry, canon, Butin', () => {
    const v = validateRound(
      { expansions: { loot: true } },
      {
        cardsDealt: 2,
        players: [
          { id: 'A', bid: 1, tricks: 3, harryAdjustment: 2, cannon: 'boum' },
          { id: 'B', bid: 0, tricks: -1, bonus: { piratesBySkullKing: 1 } },
          { id: 'C', bid: 0, tricks: 0, bonus: { piratesBySkullKing: 1 } },
        ],
        destroyedTricks: -1,
        lootAlliances: [
          { playedBy: 'A', capturedBy: 'Z' },
          { playedBy: 'A', capturedBy: 'B' },
          { playedBy: 'B', capturedBy: 'A' },
        ],
      },
    );
    expect(v.codes).toEqual(
      expect.arrayContaining([
        'TRICKS_OUT_OF_RANGE',
        'HARRY_INVALID',
        'CANNON_INVALID',
        'DESTROYED_TRICKS_INVALID',
        'PIRATES_BY_SK_EXCEEDED',
        'LOOT_INVALID',
      ]),
    );
  });

  it('règle maison : bonus toujours comptés, Butin inchangé', () => {
    const players = [
      { id: 'A', bid: 2, tricks: 1, bonus: { standard14: 1, piratesBySkullKing: 1 } },
      { id: 'B', bid: 1, tricks: 2 },
    ];
    const round = { cardsDealt: 3, players, lootAlliances: [{ playedBy: 'A', capturedBy: 'B' }] };
    expect(scoreRound({ bonusAlwaysCounts: true }, round).A).toEqual({ bidPoints: -10, bonusPoints: 40, wagerPoints: 0, total: 30 });
    expect(scoreRound({ bonusAlwaysCounts: true, scoring: 'rascal' }, round).A?.bonusPoints).toBe(40);
    expect(scoreRound({}, round).A?.bonusPoints).toBe(0);
  });

  it('Butin réussi en Skull King', () => {
    const r = scoreRound(
      {},
      {
        cardsDealt: 3,
        players: [
          { id: 'A', bid: 1, tricks: 1 },
          { id: 'B', bid: 2, tricks: 2 },
        ],
        lootAlliances: [{ playedBy: 'A', capturedBy: 'B' }],
      },
    );
    expect(r.A?.bonusPoints).toBe(20);
    expect(r.B?.bonusPoints).toBe(20);
  });

  it('Harry au-delà de n, Baleine seule, joueur hors liste', () => {
    expect(
      validateRound({ expansions: { whiteWhale: true } }, {
        cardsDealt: 1,
        destroyedTricks: 2,
        players: [{ id: 'A', bid: 1, tricks: 1, harryAdjustment: 1 }],
      }).codes,
    ).toEqual(['DESTROYED_TRICKS_INVALID', 'HARRY_INVALID', 'TRICKS_SUM_MISMATCH']);
    expect(runningTotals(['A'], {}, [{ cardsDealt: 1, players: [{ id: 'B', bid: 1, tricks: 1 }] }])).toEqual([
      { A: 0, B: 20 },
    ]);
  });

  it('classement 1, 1, 3 stable', () => {
    expect(ranking({ A: 10, B: 30, C: 30, D: -5 })).toEqual([
      { id: 'B', score: 30, rank: 1 },
      { id: 'C', score: 30, rank: 1 },
      { id: 'A', score: 10, rank: 3 },
      { id: 'D', score: -5, rank: 4 },
    ]);
    expect(ranking({ A: 1 }, ['A', 'X'])).toEqual([
      { id: 'A', score: 1, rank: 1 },
      { id: 'X', score: 0, rank: 2 },
    ]);
  });
});

describe('propriétés (1 000 manches aléatoires)', () => {
  let seed = 42;
  const rnd = (max: number): number => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed % (max + 1);
  };
  it('total = somme, Rascal jamais négatif hors mise, bonus nul si raté', () => {
    for (let i = 0; i < 1000; i++) {
      const n = 1 + rnd(9);
      const scoring = rnd(1) === 0 ? 'skullKing' : 'rascal';
      const players = ['A', 'B', 'C', 'D'].map((id) => ({
        id,
        bid: rnd(n),
        tricks: rnd(n),
        rascalWager: [0, 10, 20][rnd(2)] ?? 0,
        cannon: rnd(1) ? 'cannonball' : 'grapeshot',
        bonus: { standard14: rnd(1), black14: rnd(3) === 0 },
      }));
      const res = scoreRound({ scoring }, { cardsDealt: n, players });
      for (const p of players) {
        const r = res[p.id];
        expect(r).toBeDefined();
        if (!r) continue;
        expect(r.total).toBe(r.bidPoints + r.bonusPoints + r.wagerPoints);
        if (scoring === 'rascal') expect(r.bidPoints + r.bonusPoints).toBeGreaterThanOrEqual(0);
        if (scoring === 'skullKing' && p.bid !== p.tricks) expect(r.bonusPoints).toBe(0);
      }
    }
  });
});
